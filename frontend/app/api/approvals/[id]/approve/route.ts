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

  approval.status = 'approved';
  approval.reviewed_by = 'demo_admin';
  approval.reviewed_at = new Date().toISOString();

  // Update associated action
  const action = store.actions.find(a => a.id === approval.action_id);
  if (action) {
    action.execution_status = 'executed';
    action.execution_result = { status: 'success', authorized_by: 'demo_admin' };
  }

  return NextResponse.json({
    success: true,
    message: `Action ${approval.action_id} approved and executed.`,
    execution_result: { status: 'success' },
  });
}
