import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/mock-server-state';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let list = [...store.approvals];
  if (status) {
    list = list.filter(a => a.status === status);
  }

  return NextResponse.json(list);
}
