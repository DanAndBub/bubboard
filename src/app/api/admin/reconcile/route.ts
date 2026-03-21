import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/reconcile
 *
 * Internal proxy that fetches admin usage and cost data from Anthropic and
 * OpenAI server-side and returns it to the client. No client auth is required
 * because this route is called from the same origin and does not expose
 * secrets — the API keys and admin secret remain server-side only.
 *
 * Query params:
 *   start_time — ISO string (Anthropic) or Unix timestamp (OpenAI)
 *   end_time   — ISO string (Anthropic) or Unix timestamp (OpenAI)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startIso = searchParams.get('start_time') ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endIso   = searchParams.get('end_time')   ?? new Date().toISOString();

  const anthropicKey = process.env.ANTHROPIC_ADMIN_KEY;
  const openaiKey    = process.env.OPENAI_ADMIN_KEY;

  const [anthropic, openai] = await Promise.all([
    fetchAnthropicData(anthropicKey, startIso, endIso),
    fetchOpenAIData(openaiKey, startIso, endIso),
  ]);

  return NextResponse.json({ anthropic, openai });
}

async function fetchAnthropicData(
  adminKey: string | undefined,
  startIso: string,
  endIso: string,
): Promise<{ available: boolean; usage?: unknown; costs?: unknown; reason?: string }> {
  if (!adminKey) return { available: false, reason: 'no_admin_key' };

  try {
    const params = new URLSearchParams({
      bucket_width: '1d',
      start_time: startIso,
      end_time: endIso,
      group_by: 'model',
    });

    const [usageRes, costRes] = await Promise.all([
      fetch(`https://api.anthropic.com/v1/organizations/usage_report/messages?${params}`, {
        headers: { 'x-api-key': adminKey, 'anthropic-version': '2023-06-01' },
      }),
      fetch(`https://api.anthropic.com/v1/organizations/cost_report?${new URLSearchParams({ start_time: startIso, end_time: endIso })}`, {
        headers: { 'x-api-key': adminKey, 'anthropic-version': '2023-06-01' },
      }),
    ]);

    if (!usageRes.ok) return { available: false, reason: 'api_error' };

    return {
      available: true,
      usage: await usageRes.json(),
      costs: costRes.ok ? await costRes.json() : null,
    };
  } catch {
    return { available: false, reason: 'fetch_error' };
  }
}

async function fetchOpenAIData(
  adminKey: string | undefined,
  startIso: string,
  endIso: string,
): Promise<{ available: boolean; usage?: unknown; costs?: unknown; reason?: string }> {
  if (!adminKey) return { available: false, reason: 'no_admin_key' };

  try {
    const startTs = String(Math.floor(new Date(startIso).getTime() / 1000));
    const endTs   = String(Math.floor(new Date(endIso).getTime() / 1000));

    const [usageRes, costRes] = await Promise.all([
      fetch(`https://api.openai.com/v1/organization/usage/completions?${new URLSearchParams({ bucket_width: '1d', start_time: startTs, end_time: endTs, 'group_by[]': 'model' })}`, {
        headers: { Authorization: `Bearer ${adminKey}` },
      }),
      fetch(`https://api.openai.com/v1/organization/costs?${new URLSearchParams({ start_time: startTs, end_time: endTs })}`, {
        headers: { Authorization: `Bearer ${adminKey}` },
      }),
    ]);

    if (!usageRes.ok) return { available: false, reason: 'api_error' };

    return {
      available: true,
      usage: await usageRes.json(),
      costs: costRes.ok ? await costRes.json() : null,
    };
  } catch {
    return { available: false, reason: 'fetch_error' };
  }
}
