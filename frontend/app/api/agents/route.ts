import { NextResponse } from 'next/server';
import { store } from '@/lib/mock-server-state';

export async function GET() {
  return NextResponse.json(store.agents);
}
