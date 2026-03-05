import { NextRequest, NextResponse } from 'next/server';

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

  const baseId = process.env.AIRTABLE_BASE_ID;
  const apiKey = process.env.AIRTABLE_API_KEY;

  if (!baseId || !apiKey) {
    console.error('[feedback] Missing AIRTABLE_BASE_ID or AIRTABLE_API_KEY');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const fields: Record<string, string> = {
    'Type': String(type),
    'Message': String(message),
  };

  if (email && typeof email === 'string') {
    fields['Email'] = email.trim();
  }

  const res = await fetch(`https://api.airtable.com/v0/${baseId}/Feedback`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: [{ fields }],
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
    const errMsg = data?.error?.message ?? `Airtable error ${res.status}`;
    console.error('[feedback] Airtable error:', errMsg);
    return NextResponse.json({ error: errMsg }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
