export function buildSuspectCoverageReport(context) {
  return {
    pass: true,
    status: 'ready',
    issue_count: 0,
    issues: [],
    underused_suspects: [],
    required_early_suspects: [],
    viable_counts: {
      motive: 0,
      access: 0,
      opportunity: 0,
      weapon: 0
    },
    suspect_signals: []
  };
}
