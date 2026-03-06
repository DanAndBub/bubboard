import { NextRequest, NextResponse } from 'next/server'
import { verifySecret } from '@/lib/auth'

export async function GET(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminKey = process.env.OPENAI_ADMIN_KEY
  if (!adminKey) {
    return NextResponse.json({ available: false, reason: 'no_admin_key' })
  }

  const searchParams = request.nextUrl.searchParams
  // OpenAI uses Unix timestamps
  const now = Math.floor(Date.now() / 1000)
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60
  const startTime = searchParams.get('start_time') || String(thirtyDaysAgo)
  const endTime = searchParams.get('end_time') || String(now)
  const bucketWidth = searchParams.get('bucket_width') || '1d'

  try {
    // Fetch completions usage
    const usageRes = await fetch(
      'https://api.openai.com/v1/organization/usage/completions?' + new URLSearchParams({
        bucket_width: bucketWidth,
        start_time: startTime,
        end_time: endTime,
        'group_by[]': 'model',
      }),
      {
        headers: { Authorization: 'Bearer ' + adminKey },
        next: { revalidate: 300 },
      }
    )

    // Fetch costs
    const costRes = await fetch(
      'https://api.openai.com/v1/organization/costs?' + new URLSearchParams({
        start_time: startTime,
        end_time: endTime,
      }),
      {
        headers: { Authorization: 'Bearer ' + adminKey },
        next: { revalidate: 300 },
      }
    )

    if (!usageRes.ok) {
      return NextResponse.json({
        available: false,
        reason: 'api_error',
        status: usageRes.status,
        detail: await usageRes.text(),
      }, { status: usageRes.status })
    }

    const usageData = await usageRes.json()
    const costData = costRes.ok ? await costRes.json() : null

    return NextResponse.json({
      available: true,
      provider: 'openai',
      usage: usageData,
      costs: costData,
      fetched_at: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      available: false,
      reason: 'fetch_error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
