import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/mock-server-state';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agent_id = searchParams.get('agent_id');
  const decision = searchParams.get('decision');
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  let list = [...store.actions];
  if (agent_id) {
    list = list.filter(a => a.agent_id === agent_id);
  }
  if (decision) {
    list = list.filter(a => a.decision === decision);
  }

  return NextResponse.json(list.slice(0, limit));
}
