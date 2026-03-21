import { describe, it, expect } from 'vitest';
import { parseClaudeCodeJSONL } from '../claude-code';

const resultLine = JSON.stringify({
  type: 'result',
  timestamp: '2024-01-15T10:00:00Z',
  model: 'claude-sonnet-4-6',
  request_id: 'req-123',
  usage: {
    input_tokens: 1000,
    output_tokens: 500,
    cache_read_input_tokens: 200,
    cache_creation_input_tokens: 100,
  },
});

const assistantLine = JSON.stringify({
  type: 'assistant',
  timestamp: '2024-01-15T11:00:00Z',
  request_id: 'req-456',
  message: {
    model: 'claude-opus-4-6',
    usage: {
      input_tokens: 300,
      output_tokens: 150,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
  },
});

describe('parseClaudeCodeJSONL', () => {
  it('parses a result-type line', () => {
    const result = parseClaudeCodeJSONL(resultLine);
    expect(result).toHaveLength(1);
    const r = result[0];
    expect(r.model).toBe('claude-sonnet-4-6');
    expect(r.provider).toBe('anthropic');
    expect(r.input_tokens).toBe(1000);
    expect(r.output_tokens).toBe(500);
    expect(r.cached_input_tokens).toBe(200);
    expect(r.cache_creation_tokens).toBe(100);
    expect(r.is_batch).toBe(false);
    expect(r.request_id).toBe('req-123');
    expect(r.timestamp).toBe('2024-01-15T10:00:00Z');
  });

  it('parses an assistant-type line with nested message.usage', () => {
    const result = parseClaudeCodeJSONL(assistantLine);
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('claude-opus-4-6');
    expect(result[0].input_tokens).toBe(300);
  });

  it('parses multiple lines', () => {
    const result = parseClaudeCodeJSONL(`${resultLine}\n${assistantLine}`);
    expect(result).toHaveLength(2);
  });

  it('skips lines with unsupported type', () => {
    const userLine = JSON.stringify({ type: 'user', model: 'claude-sonnet-4-6', usage: { input_tokens: 10, output_tokens: 5 } });
    expect(parseClaudeCodeJSONL(userLine)).toEqual([]);
  });

  it('skips lines missing usage', () => {
    const noUsage = JSON.stringify({ type: 'result', model: 'claude-sonnet-4-6', timestamp: '2024-01-01T00:00:00Z' });
    expect(parseClaudeCodeJSONL(noUsage)).toEqual([]);
  });

  it('skips lines missing model', () => {
    const noModel = JSON.stringify({ type: 'result', usage: { input_tokens: 100, output_tokens: 50 } });
    expect(parseClaudeCodeJSONL(noModel)).toEqual([]);
  });

  it('skips lines missing input_tokens or output_tokens', () => {
    const noInput  = JSON.stringify({ type: 'result', model: 'claude-sonnet-4-6', usage: { output_tokens: 50 } });
    const noOutput = JSON.stringify({ type: 'result', model: 'claude-sonnet-4-6', usage: { input_tokens: 100 } });
    expect(parseClaudeCodeJSONL(noInput)).toEqual([]);
    expect(parseClaudeCodeJSONL(noOutput)).toEqual([]);
  });

  it('skips blank lines and invalid JSON', () => {
    const content = `\n${resultLine}\nnot-json\n\n${assistantLine}\n`;
    expect(parseClaudeCodeJSONL(content)).toHaveLength(2);
  });

  it('returns empty array for empty string', () => {
    expect(parseClaudeCodeJSONL('')).toEqual([]);
  });

  it('infers openai provider for gpt models', () => {
    const gptLine = JSON.stringify({
      type: 'result',
      timestamp: '2024-01-15T10:00:00Z',
      model: 'gpt-4.1',
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const result = parseClaudeCodeJSONL(gptLine);
    expect(result[0].provider).toBe('openai');
  });

  it('infers deepseek provider for deepseek models', () => {
    const dsLine = JSON.stringify({
      type: 'result',
      timestamp: '2024-01-15T10:00:00Z',
      model: 'deepseek-chat',
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const result = parseClaudeCodeJSONL(dsLine);
    expect(result[0].provider).toBe('deepseek');
  });

  it('defaults cache tokens to 0 when absent', () => {
    const noCache = JSON.stringify({
      type: 'result',
      model: 'claude-sonnet-4-6',
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const result = parseClaudeCodeJSONL(noCache);
    expect(result[0].cached_input_tokens).toBe(0);
    expect(result[0].cache_creation_tokens).toBe(0);
  });

  it('generates a request_id when absent', () => {
    const noReqId = JSON.stringify({
      type: 'result',
      model: 'claude-sonnet-4-6',
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const result = parseClaudeCodeJSONL(noReqId);
    expect(result[0].request_id).toBeTruthy();
  });
});
