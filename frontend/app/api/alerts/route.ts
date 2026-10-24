import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/mock-server-state';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const severity = searchParams.get('severity');

  let list = [...store.alerts];
  if (status) {
    list = list.filter(a => a.status === status);
  }
  if (severity) {
    list = list.filter(a => a.severity === severity);
  }

  return NextResponse.json(list);
}
