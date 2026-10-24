import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/mock-server-state';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();
  const decision = searchParams.get('decision');
  const agent_id = searchParams.get('agent_id');
  const limit = parseInt(searchParams.get('limit') || '200', 10);

  let list = [...store.auditLogs];
  if (agent_id) {
    list = list.filter(l => l.agent_id === agent_id);
  }
  if (decision) {
    list = list.filter(l => l.decision === decision);
  }
  if (search) {
    list = list.filter(l => 
      l.target_resource.toLowerCase().includes(search) ||
      l.action_type.toLowerCase().includes(search) ||
      l.explanation.toLowerCase().includes(search)
    );
  }

  return NextResponse.json(list.slice(0, limit));
}
