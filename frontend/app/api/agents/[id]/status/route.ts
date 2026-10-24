import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/mock-server-state';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const agent = store.agents.find(a => a.id === id);
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  agent.status = body.status || 'quarantined';
  return NextResponse.json(agent);
}
