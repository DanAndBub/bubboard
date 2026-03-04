import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';

const FEEDBACK_FILE = '/tmp/driftwatch-feedback.json';

interface FeedbackEntry {
  type: 'bug' | 'suggestion' | 'review';
  message: string;
  email?: string;
  timestamp: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body: unknown = await req.json();

  if (
    typeof body !== 'object' ||
    body === null ||
    !('type' in body) ||
    !('message' in body)
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { type, message, email } = body as Record<string, unknown>;

  if (type !== 'bug' && type !== 'suggestion' && type !== 'review') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  if (typeof message !== 'string' || message.length === 0) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: 'message exceeds 2000 characters' }, { status: 400 });
  }

  if (email !== undefined && typeof email !== 'string') {
    return NextResponse.json({ error: 'email must be a string' }, { status: 400 });
  }

  let entries: FeedbackEntry[] = [];
  try {
    entries = JSON.parse(readFileSync(FEEDBACK_FILE, 'utf-8')) as FeedbackEntry[];
  } catch {
    entries = [];
  }

  const entry: FeedbackEntry = {
    type,
    message,
    ...(email ? { email } : {}),
    timestamp: new Date().toISOString(),
  };

  entries.push(entry);
  writeFileSync(FEEDBACK_FILE, JSON.stringify(entries, null, 2), 'utf-8');

  return NextResponse.json({ ok: true });
}
