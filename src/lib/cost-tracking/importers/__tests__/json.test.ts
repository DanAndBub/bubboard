import { describe, it, expect } from 'vitest';
import { parseJSON } from '../json';

const baseRecord = {
  timestamp: '2024-01-15T10:00:00Z',
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  input_tokens: 1000,
  output_tokens: 500,
  cached_input_tokens: 100,
  cache_creation_tokens: 50,
  is_batch: false,
  request_id: 'req-123',
  task_id: 'task-1',
};

describe('parseJSON', () => {
  it('parses a top-level array', () => {
    const result = parseJSON(JSON.stringify([baseRecord]));
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('claude-sonnet-4-6');
    expect(result[0].input_tokens).toBe(1000);
    expect(result[0].task_id).toBe('task-1');
  });

  it('parses records wrapped in { records: [] }', () => {
    const result = parseJSON(JSON.stringify({ records: [baseRecord] }));
    expect(result).toHaveLength(1);
  });

  it('parses records wrapped in { data: [] }', () => {
    const result = parseJSON(JSON.stringify({ data: [baseRecord] }));
    expect(result).toHaveLength(1);
  });

  it('parses records wrapped in { usage: [] }', () => {
    const result = parseJSON(JSON.stringify({ usage: [baseRecord] }));
    expect(result).toHaveLength(1);
  });

  it('returns empty array for invalid JSON', () => {
    expect(parseJSON('not json')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseJSON('')).toEqual([]);
  });

  it('returns empty array for plain object without known wrapper key', () => {
    expect(parseJSON(JSON.stringify({ foo: [baseRecord] }))).toEqual([]);
  });

  it('returns empty array for a JSON primitive', () => {
    expect(parseJSON('"just a string"')).toEqual([]);
    expect(parseJSON('42')).toEqual([]);
    expect(parseJSON('null')).toEqual([]);
  });

  it('skips items missing required fields', () => {
    const noTimestamp = { ...baseRecord, timestamp: undefined };
    const noProvider  = { ...baseRecord, provider: undefined };
    const noModel     = { ...baseRecord, model: undefined };
    const noInput     = { ...baseRecord, input_tokens: undefined };
    const noOutput    = { ...baseRecord, output_tokens: undefined };
    const result = parseJSON(JSON.stringify([noTimestamp, noProvider, noModel, noInput, noOutput]));
    expect(result).toEqual([]);
  });

  it('skips null items in array', () => {
    const result = parseJSON(JSON.stringify([null, baseRecord]));
    expect(result).toHaveLength(1);
  });

  it('defaults optional fields when absent', () => {
    const { cached_input_tokens, cache_creation_tokens, is_batch, request_id, task_id, ...minimal } = baseRecord;
    const result = parseJSON(JSON.stringify([minimal]));
    expect(result).toHaveLength(1);
    expect(result[0].cached_input_tokens).toBe(0);
    expect(result[0].cache_creation_tokens).toBe(0);
    expect(result[0].is_batch).toBe(false);
    expect(result[0].request_id).toBeTruthy();
    expect(result[0].task_id).toBeUndefined();
  });

  it('parses multiple valid records', () => {
    const r2 = { ...baseRecord, request_id: 'req-456', model: 'gpt-4.1', provider: 'openai' };
    const result = parseJSON(JSON.stringify([baseRecord, r2]));
    expect(result).toHaveLength(2);
    expect(result[1].provider).toBe('openai');
  });

  it('coerces token counts to numbers', () => {
    const stringTokens = { ...baseRecord, input_tokens: '1000', output_tokens: '500' };
    const result = parseJSON(JSON.stringify([stringTokens]));
    expect(result[0].input_tokens).toBe(1000);
    expect(result[0].output_tokens).toBe(500);
  });
});
