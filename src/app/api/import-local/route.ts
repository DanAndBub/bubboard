import { NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

async function readJsonlFiles(dir: string): Promise<{ content: string; count: number }> {
  let allContent = ''
  let count = 0
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        const sub = await readJsonlFiles(fullPath)
        allContent += sub.content
        count += sub.count
      } else if (entry.name.endsWith('.jsonl')) {
        allContent += await readFile(fullPath, 'utf-8') + '\n'
        count++
      }
    }
  } catch {
    // Directory doesn't exist, skip
  }
  return { content: allContent, count }
}

export async function GET() {
  try {
    const home = homedir()

    // Claude Code logs
    const claude = await readJsonlFiles(join(home, '.claude', 'projects'))

    // OpenClaw session logs
    const openclaw = await readJsonlFiles(join(home, '.openclaw', 'agents'))

    return NextResponse.json({
      claude: { content: claude.content, fileCount: claude.count },
      openclaw: { content: openclaw.content, fileCount: openclaw.count },
      message: `Loaded ${claude.count} Claude Code + ${openclaw.count} OpenClaw session files`,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to read logs',
    }, { status: 500 })
  }
}
