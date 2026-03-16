import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { redactSensitiveValues } from '@/lib/redact';

const LOCAL_SCAN_ENABLED = process.env.OPENCLAW_LOCAL_SCAN_ENABLED === 'true';
const ROOT = process.env.OPENCLAW_ROOT;

type Bucket = 'config' | 'workspace' | 'agents' | 'memory' | 'subagents' | 'skills' | 'cron';

type ScannedItem = {
  path: string;
  bucket: Bucket;
  selected: boolean;
};

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listDirNames(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

async function listMdNames(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

export async function GET() {
  if (!LOCAL_SCAN_ENABLED) {
    return NextResponse.json({ error: 'Local scan is disabled' }, { status: 404 });
  }

  if (!ROOT) {
    return NextResponse.json({ error: 'OPENCLAW_ROOT is not configured' }, { status: 500 });
  }

  const items: ScannedItem[] = [];
  const fileContents: Record<string, string> = {};

  const configPath = path.join(ROOT, 'openclaw.json');
  if (await exists(configPath)) {
    items.push({ path: 'openclaw.json', bucket: 'config', selected: true });
    try {
      fileContents['openclaw.json'] = redactSensitiveValues(await fs.readFile(configPath, 'utf8'));
    } catch {}
  }

  const workspaceDir = path.join(ROOT, 'workspace');
  for (const name of await listMdNames(workspaceDir)) {
    const relPath = `workspace/${name}`;
    items.push({ path: relPath, bucket: 'workspace', selected: true });
    try {
      fileContents[relPath] = await fs.readFile(path.join(workspaceDir, name), 'utf8');
    } catch {}
  }

  const memoryDir = path.join(workspaceDir, 'memory');
  for (const name of await listMdNames(memoryDir)) {
    items.push({ path: `workspace/memory/${name}`, bucket: 'memory', selected: true });
  }

  const subagentsDir = path.join(workspaceDir, 'subagents');
  for (const name of await listMdNames(subagentsDir)) {
    const relPath = `workspace/subagents/${name}`;
    items.push({ path: relPath, bucket: 'subagents', selected: true });
    try {
      fileContents[relPath] = await fs.readFile(path.join(subagentsDir, name), 'utf8');
    } catch {}
  }

  const agentsDir = path.join(ROOT, 'agents');
  for (const name of await listDirNames(agentsDir)) {
    items.push({ path: `agents/${name}/`, bucket: 'agents', selected: true });
  }

  const skillsDir = path.join(ROOT, 'skills');
  for (const name of await listDirNames(skillsDir)) {
    items.push({ path: `skills/${name}/`, bucket: 'skills', selected: true });
  }

  const cronJobs = path.join(ROOT, 'cron', 'jobs.json');
  if (await exists(cronJobs)) {
    items.push({ path: 'cron/jobs.json', bucket: 'cron', selected: true });
  }

  return NextResponse.json({
    root: ROOT,
    items,
    fileContents,
    manifestVersion: '3.1-local',
  });
}
