import { describe, it, expect } from 'vitest';
import { parseOpenClawSessions } from '../openclaw';

function makeLine(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: 'message',
    id: 'msg-123',
    timestamp: '2024-01-15T10:00:00Z',
    message: {
      model: 'claude-sonnet-4-6',
      usage: {
        input: 1000,
        output: 500,
        cacheRead: 200,
        cacheWrite: 100,
        cost: { total: 0.0105 },
      },
    },
    ...overrides,
  });
}

describe('parseOpenClawSessions', () => {
  it('parses a valid message line', () => {
    const result = parseOpenClawSessions(makeLine());
    expect(result).toHaveLength(1);
    const r = result[0];
    expect(r.model).toBe('claude-sonnet-4-6');
    expect(r.provider).toBe('anthropic');
    expect(r.input_tokens).toBe(1000);
    expect(r.output_tokens).toBe(500);
    expect(r.cached_input_tokens).toBe(200);
    expect(r.cache_creation_tokens).toBe(100);
    expect(r.cost_usd).toBe(0.0105);
    expect(r.request_id).toBe('msg-123');
    expect(r.timestamp).toBe('2024-01-15T10:00:00Z');
    expect(r.is_batch).toBe(false);
  });

  it('parses multiple lines', () => {
    const line2 = makeLine({ id: 'msg-456', timestamp: '2024-01-16T10:00:00Z' });
    const result = parseOpenClawSessions(`${makeLine()}\n${line2}`);
    expect(result).toHaveLength(2);
  });

  it('skips lines that are not type message', () => {
    const notMessage = JSON.stringify({ type: 'system', id: 'sys-1', timestamp: '2024-01-15T10:00:00Z' });
    expect(parseOpenClawSessions(notMessage)).toEqual([]);
  });

  it('skips lines missing nested message object', () => {
    const noMsg = JSON.stringify({ type: 'message', id: 'x', timestamp: '2024-01-15T10:00:00Z' });
    expect(parseOpenClawSessions(noMsg)).toEqual([]);
  });

  it('skips lines missing usage', () => {
    const noUsage = JSON.stringify({ type: 'message', id: 'x', timestamp: '2024-01-15T10:00:00Z', message: { model: 'claude-sonnet-4-6' } });
    expect(parseOpenClawSessions(noUsage)).toEqual([]);
  });

  it('skips lines missing model', () => {
    const noModel = JSON.stringify({
      type: 'message',
      id: 'x',
      timestamp: '2024-01-15T10:00:00Z',
      message: { usage: { input: 100, output: 50 } },
    });
    expect(parseOpenClawSessions(noModel)).toEqual([]);
  });

  it('deduplicates lines with same id + timestamp', () => {
    const dupe = makeLine();
    const result = parseOpenClawSessions(`${dupe}\n${dupe}`);
    expect(result).toHaveLength(1);
  });

  it('does not deduplicate lines with same id but different timestamp', () => {
    const line1 = makeLine({ id: 'msg-same' });
    const line2 = makeLine({ id: 'msg-same', timestamp: '2024-01-16T10:00:00Z' });
    const result = parseOpenClawSessions(`${line1}\n${line2}`);
    expect(result).toHaveLength(2);
  });

  it('skips blank lines and invalid JSON', () => {
    const content = `\n${makeLine()}\nnot-valid-json\n\n${makeLine({ id: 'msg-789', timestamp: '2024-01-17T00:00:00Z' })}\n`;
    expect(parseOpenClawSessions(content)).toHaveLength(2);
  });

  it('returns empty array for empty string', () => {
    expect(parseOpenClawSessions('')).toEqual([]);
  });

  it('defaults cost_usd to 0 when cost is absent', () => {
    const noCost = makeLine();
    const parsed = JSON.parse(noCost);
    delete parsed.message.usage.cost;
    const result = parseOpenClawSessions(JSON.stringify(parsed));
    expect(result[0].cost_usd).toBe(0);
  });

  it('defaults cache tokens to 0 when absent', () => {
    const parsed = JSON.parse(makeLine());
    delete parsed.message.usage.cacheRead;
    delete parsed.message.usage.cacheWrite;
    const result = parseOpenClawSessions(JSON.stringify(parsed));
    expect(result[0].cached_input_tokens).toBe(0);
    expect(result[0].cache_creation_tokens).toBe(0);
  });

  it('infers openai provider for gpt models', () => {
    const result = parseOpenClawSessions(makeLine({ message: { model: 'gpt-4.1', usage: { input: 100, output: 50 } } }));
    expect(result[0].provider).toBe('openai');
  });

  it('infers deepseek provider for deepseek models', () => {
    const result = parseOpenClawSessions(makeLine({ message: { model: 'deepseek-chat', usage: { input: 100, output: 50 } } }));
    expect(result[0].provider).toBe('deepseek');
  });
});
