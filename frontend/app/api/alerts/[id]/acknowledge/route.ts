import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/mock-server-state';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const alert = store.alerts.find(a => a.id === id);
  if (alert) {
    alert.status = 'acknowledged';
    return NextResponse.json({ success: true, message: `Alert ${id} acknowledged.` });
  }
  return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
}
