import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/mock-server-state';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const policy = store.policies.find(p => p.id === id);
  if (!policy) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  if (policy.explicit_block) {
    return NextResponse.json({ error: 'Explicit block policies cannot be toggled' }, { status: 400 });
  }

  policy.enabled = !policy.enabled;
  return NextResponse.json(policy);
}
