import { NextResponse } from 'next/server';
import { resetStore } from '@/lib/mock-server-state';

export async function POST() {
  resetStore();
  return NextResponse.json({ success: true, message: 'Demo state reset to clean baseline.' });
}
