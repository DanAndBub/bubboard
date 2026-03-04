import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email address' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Forward to webhook if configured
    const webhookUrl = process.env.WAITLIST_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            timestamp: new Date().toISOString(),
            source: 'bubboard-waitlist',
          }),
        });
      } catch (webhookErr) {
        // Don't fail if webhook fails — log and continue
        console.error('[waitlist] Webhook failed:', webhookErr);
      }
    }

    // Always log to server console as fallback
    console.log(`[waitlist] New signup: ${cleanEmail} at ${new Date().toISOString()}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[waitlist] Error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
