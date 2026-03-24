import { safeJson } from "../utils/json.js";
import { recordUsage } from "./costLedger.js";

const API_BASE_URL = process.env.API_BASE_URL || "https://api.openai.com/v1";
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

async function call(body){
  const res = await fetch(`${API_BASE_URL}/chat/completions`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if(!res.ok){
    const t = await res.text();
    throw new Error("OpenAI error: "+t);
  }

  return res.json();
}

export async function callText(opts){
  const jsonResp = await call({
    model: MODEL,
    temperature: opts.temperature ?? 0.7,
    messages:[
      {role:"system",content:opts.system},
      {role:"user",content:opts.user}
    ]
  });

  recordUsage({
    requestType: "text",
    schemaName: null,
    model: jsonResp?.model || MODEL,
    usage: jsonResp?.usage || {}
  });

  return jsonResp.choices[0].message.content.trim();
}

export async function callJson(opts){
  const jsonResp = await call({
    model: MODEL,
    temperature: opts.temperature ?? 0.4,
    response_format:{
      type:"json_schema",
      json_schema:{
        name:opts.schemaName,
        schema:opts.schema,
        strict:true
      }
    },
    messages:[
      {role:"system",content:opts.system},
      {role:"user",content:opts.user}
    ]
  });

  recordUsage({
    requestType: "json",
    schemaName: opts.schemaName ?? null,
    model: jsonResp?.model || MODEL,
    usage: jsonResp?.usage || {}
  });

  return safeJson(jsonResp.choices[0].message.content);
}
