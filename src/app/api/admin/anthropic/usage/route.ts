import { NextRequest, NextResponse } from 'next/server'
import { verifySecret } from '@/lib/auth'

export async function GET(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminKey = process.env.ANTHROPIC_ADMIN_KEY
  if (!adminKey) {
    return NextResponse.json({ available: false, reason: 'no_admin_key' })
  }

  const searchParams = request.nextUrl.searchParams
  const startTime = searchParams.get('start_time') || new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0, 10)
  const endTime = searchParams.get('end_time') || new Date().toISOString().slice(0, 10)
  const bucketWidth = searchParams.get('bucket_width') || '1d'

  try {
    // Fetch usage report (token counts)
    const usageRes = await fetch(
      'https://api.anthropic.com/v1/organizations/usage_report/messages?' + new URLSearchParams({
        bucket_width: bucketWidth,
        starting_at: startTime,
        ending_at: endTime,
        'group_by[]': 'model',
      }),
      {
        headers: {
          'x-api-key': adminKey,
          'anthropic-version': '2023-06-01',
        },
        next: { revalidate: 300 }, // cache 5 minutes
      }
    )

    // Fetch cost report (USD amounts)
    const costRes = await fetch(
      'https://api.anthropic.com/v1/organizations/cost_report?' + new URLSearchParams({
        starting_at: startTime,
        ending_at: endTime,
      }),
      {
        headers: {
          'x-api-key': adminKey,
          'anthropic-version': '2023-06-01',
        },
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
      provider: 'anthropic',
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
