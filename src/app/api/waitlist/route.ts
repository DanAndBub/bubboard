import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email address' }, { status: 400 });
    }

    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY;

    if (!baseId || !apiKey) {
      console.error('[waitlist] Missing AIRTABLE_BASE_ID or AIRTABLE_API_KEY');
      return NextResponse.json({ ok: false, error: 'Server misconfiguration' }, { status: 500 });
    }

    const res = await fetch(`https://api.airtable.com/v0/${baseId}/Waitlist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{
          fields: {
            'Email': email.trim().toLowerCase(),
          },
        }],
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
      const message = data?.error?.message ?? `Airtable error ${res.status}`;
      console.error('[waitlist] Airtable error:', message);
      return NextResponse.json({ ok: false, error: message }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[waitlist] Error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
