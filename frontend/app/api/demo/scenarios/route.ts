import { NextResponse } from 'next/server';

const DEMO_SCENARIOS = [
  {
    id: "scenario-a",
    name: "Scenario A: Authorized Access",
    description: "Alpha Agent requests a public sales report. Expected: ALLOW and tool executes.",
    expected_decision: "ALLOW",
  },
  {
    id: "scenario-b",
    name: "Scenario B: Unauthorized File Access",
    description: "Gamma Agent (minimal permissions) requests a restricted financial file. Expected: BLOCK.",
    expected_decision: "BLOCK",
  },
  {
    id: "scenario-c",
    name: "Scenario C: Sensitive Action Requiring Approval",
    description: "Delta Agent requests a sensitive operation. Expected: REVIEW (pending approval).",
    expected_decision: "REVIEW",
  },
  {
    id: "scenario-d",
    name: "Scenario D: Suspicious Behavior (Anomaly Detection)",
    description: "Gamma Agent repeatedly tries to access restricted resources, triggering anomaly detection.",
    expected_decision: "BLOCK",
  },
  {
    id: "scenario-e",
    name: "Scenario E: SQL Purge Attempt",
    description: "Attempted DROP TABLE on production customer database blocked by POL-005.",
    expected_decision: "BLOCK",
  },
  {
    id: "scenario-f",
    name: "Scenario F: Full Permission Agent Destructive Action",
    description: "Beta Agent (full permissions) attempts DELETE. Explicit block policy overrides permissions.",
    expected_decision: "BLOCK",
  },
];

export async function GET() {
  return NextResponse.json(DEMO_SCENARIOS);
}
