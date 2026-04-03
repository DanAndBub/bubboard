import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

interface ScanStats {
  filesScanned: number;
  totalChars: number;
  truncatedFiles: number;
}

interface AggregateStats {
  totalScans: number;
  totalFilesScanned: number;
  totalCharsAnalyzed: number;
  totalTruncationsDetected: number;
  scansWithTruncation: number;
}

function makeRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const EMPTY_STATS: AggregateStats = {
  totalScans: 0,
  totalFilesScanned: 0,
  totalCharsAnalyzed: 0,
  totalTruncationsDetected: 0,
  scansWithTruncation: 0,
};

export async function GET(): Promise<NextResponse> {
  const redis = makeRedis();
  if (!redis) {
    return NextResponse.json(EMPTY_STATS);
  }
  try {
    const [totalScans, totalFilesScanned, totalCharsAnalyzed, totalTruncationsDetected, scansWithTruncation] =
      await Promise.all([
        redis.get<number>('dw:totalScans'),
        redis.get<number>('dw:totalFilesScanned'),
        redis.get<number>('dw:totalCharsAnalyzed'),
        redis.get<number>('dw:totalTruncationsDetected'),
        redis.get<number>('dw:scansWithTruncation'),
      ]);
    return NextResponse.json({
      totalScans: totalScans ?? 0,
      totalFilesScanned: totalFilesScanned ?? 0,
      totalCharsAnalyzed: totalCharsAnalyzed ?? 0,
      totalTruncationsDetected: totalTruncationsDetected ?? 0,
      scansWithTruncation: scansWithTruncation ?? 0,
    } satisfies AggregateStats);
  } catch {
    return NextResponse.json(EMPTY_STATS);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { filesScanned, totalChars, truncatedFiles } = body as Partial<ScanStats>;

  // Sanity bounds
  if (
    typeof filesScanned !== 'number' || filesScanned < 0 || filesScanned > 20 ||
    typeof totalChars !== 'number' || totalChars < 0 || totalChars > 5_000_000 ||
    typeof truncatedFiles !== 'number' || truncatedFiles < 0
  ) {
    return NextResponse.json({ error: 'Invalid stats' }, { status: 400 });
  }

  const redis = makeRedis();
  if (!redis) {
    return NextResponse.json(EMPTY_STATS);
  }

  try {
    const pipeline = redis.pipeline();
    pipeline.incr('dw:totalScans');
    pipeline.incrby('dw:totalFilesScanned', filesScanned);
    pipeline.incrby('dw:totalCharsAnalyzed', totalChars);
    pipeline.incrby('dw:totalTruncationsDetected', truncatedFiles);
    if (truncatedFiles > 0) {
      pipeline.incr('dw:scansWithTruncation');
    }
    await pipeline.exec();

    const [totalScans, totalFilesScanned, totalCharsAnalyzed, totalTruncationsDetected, scansWithTruncation] =
      await Promise.all([
        redis.get<number>('dw:totalScans'),
        redis.get<number>('dw:totalFilesScanned'),
        redis.get<number>('dw:totalCharsAnalyzed'),
        redis.get<number>('dw:totalTruncationsDetected'),
        redis.get<number>('dw:scansWithTruncation'),
      ]);

    return NextResponse.json({
      totalScans: totalScans ?? 0,
      totalFilesScanned: totalFilesScanned ?? 0,
      totalCharsAnalyzed: totalCharsAnalyzed ?? 0,
      totalTruncationsDetected: totalTruncationsDetected ?? 0,
      scansWithTruncation: scansWithTruncation ?? 0,
    } satisfies AggregateStats);
  } catch {
    return NextResponse.json(EMPTY_STATS);
  }
}
