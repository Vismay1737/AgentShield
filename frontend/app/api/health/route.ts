import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    gateway: 'AgentShield AI Immune System',
    timestamp: new Date().toISOString(),
  });
}
