import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/mock-server-state';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const approval = store.approvals.find(a => a.id === id);
  if (!approval) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
  }

  approval.status = 'rejected';
  approval.reviewed_by = 'demo_admin';
  approval.reviewed_at = new Date().toISOString();

  // Update associated action
  const action = store.actions.find(a => a.id === approval.action_id);
  if (action) {
    action.execution_status = 'blocked';
  }

  return NextResponse.json({
    success: true,
    message: `Action ${approval.action_id} rejected.`,
  });
}
