
import crypto from "node:crypto";
import { loadJobs, saveJobs } from "../storage/store.js";

export class Queue {
  constructor() {
    const jobs = loadJobs();

    // FIX: any job left in "running" state means the process crashed mid-step.
    // Reset them to "pending" so the worker restarts that step cleanly rather
    // than picking it up as a half-finished in-progress job.
    let dirty = false;
    for (const job of jobs) {
      if (job.status === "running") {
        job.status = "pending";
        dirty = true;
      }
    }
    if (dirty) saveJobs(jobs);

    this.jobs = jobs;
  }

  createJob(context) {
    const job = {
      id: crypto.randomUUID(),
      stepIndex: 0,
      status: "pending",
      error: null,
      context
    };
    this.jobs.push(job);
    saveJobs(this.jobs);
    return job;
  }

  next() {
    // FIX: only return "pending" jobs. The old version also matched "running",
    // which meant a crashed job would be picked up and its current step would
    // be executed a second time, billing the LLM twice.
    return this.jobs.find(job => job.status === "pending");
  }

  list() {
    return this.jobs;
  }
}
