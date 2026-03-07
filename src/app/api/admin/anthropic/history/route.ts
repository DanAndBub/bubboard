import { NextRequest, NextResponse } from 'next/server'
import { verifySecret } from '@/lib/auth'

export async function GET(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminKey = process.env.ANTHROPIC_ADMIN_KEY
  if (!adminKey) {
    return NextResponse.json({ error: 'No admin key configured' }, { status: 400 })
  }

  const searchParams = request.nextUrl.searchParams
  const startDate = searchParams.get('start') || '2026-01-01'
  const endDate = searchParams.get('end') || new Date().toISOString().slice(0, 10)

  try {
    const allData: Array<{ date: string; results: Array<Record<string, unknown>> }> = []
    let page: string | null = null

    // Paginate through all results
    for (let i = 0; i < 20; i++) { // safety limit
      const params = new URLSearchParams({
        starting_at: startDate,
        ending_at: endDate,
        bucket_width: '1d',
        'group_by[]': 'model',
      })
      if (page) params.set('page', page)

      const res = await fetch(
        `https://api.anthropic.com/v1/organizations/usage_report/messages?${params}`,
        {
          headers: {
            'x-api-key': adminKey.trim(),
            'anthropic-version': '2023-06-01',
          },
        }
      )

      if (!res.ok) {
        const errText = await res.text()
        return NextResponse.json({ error: `Anthropic API error: ${res.status}`, detail: errText }, { status: res.status })
      }

      const data = await res.json()

      for (const bucket of data.data) {
        if (bucket.results && bucket.results.length > 0) {
          allData.push({
            date: bucket.starting_at.slice(0, 10),
            results: bucket.results,
          })
        }
      }

      if (!data.has_more) break
      page = data.next_page
    }

    return NextResponse.json({
      days: allData,
      total_days: allData.length,
      fetched_at: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch usage history',
    }, { status: 500 })
  }
}
