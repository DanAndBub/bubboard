import { describe, it, expect } from 'vitest';
import { parseCSV } from '../csv';

const BASE_ROW = 'timestamp,provider,model,input_tokens,output_tokens,cached_input_tokens,cache_creation_tokens,is_batch,request_id,task_id';
const ROW = '2024-01-15T10:00:00Z,anthropic,claude-sonnet-4-6,1000,500,0,0,false,req-123,task-1';

describe('parseCSV', () => {
  it('parses a valid single row', () => {
    const result = parseCSV(`${BASE_ROW}\n${ROW}`);
    expect(result).toHaveLength(1);
    const r = result[0];
    expect(r.timestamp).toBe('2024-01-15T10:00:00Z');
    expect(r.provider).toBe('anthropic');
    expect(r.model).toBe('claude-sonnet-4-6');
    expect(r.input_tokens).toBe(1000);
    expect(r.output_tokens).toBe(500);
    expect(r.cached_input_tokens).toBe(0);
    expect(r.cache_creation_tokens).toBe(0);
    expect(r.is_batch).toBe(false);
    expect(r.request_id).toBe('req-123');
    expect(r.task_id).toBe('task-1');
  });

  it('parses multiple rows', () => {
    const row2 = '2024-01-16T10:00:00Z,openai,gpt-4.1,200,100,0,0,false,req-456,';
    const result = parseCSV(`${BASE_ROW}\n${ROW}\n${row2}`);
    expect(result).toHaveLength(2);
    expect(result[1].provider).toBe('openai');
    expect(result[1].model).toBe('gpt-4.1');
  });

  it('returns empty array when only headers present', () => {
    expect(parseCSV(BASE_ROW)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseCSV('')).toEqual([]);
  });

  it('skips rows with missing required fields', () => {
    const missingTimestamp = ',anthropic,claude-sonnet-4-6,1000,500,0,0,false,req-1,';
    const missingProvider  = '2024-01-15T10:00:00Z,,claude-sonnet-4-6,1000,500,0,0,false,req-2,';
    const missingModel     = '2024-01-15T10:00:00Z,anthropic,,1000,500,0,0,false,req-3,';
    const badInputTokens   = '2024-01-15T10:00:00Z,anthropic,claude-sonnet-4-6,abc,500,0,0,false,req-4,';
    const badOutputTokens  = '2024-01-15T10:00:00Z,anthropic,claude-sonnet-4-6,1000,xyz,0,0,false,req-5,';

    const content = [BASE_ROW, missingTimestamp, missingProvider, missingModel, badInputTokens, badOutputTokens].join('\n');
    expect(parseCSV(content)).toEqual([]);
  });

  it('skips blank lines', () => {
    const result = parseCSV(`${BASE_ROW}\n${ROW}\n\n${ROW.replace('req-123', 'req-999')}`);
    expect(result).toHaveLength(2);
  });

  it('parses is_batch true values', () => {
    const batchTrue  = ROW.replace('req-123', 'req-a').replace(',false,', ',true,');
    const batchOne   = ROW.replace('req-123', 'req-b').replace(',false,', ',1,');
    const result = parseCSV(`${BASE_ROW}\n${batchTrue}\n${batchOne}`);
    expect(result[0].is_batch).toBe(true);
    expect(result[1].is_batch).toBe(true);
  });

  it('defaults cached_input_tokens and cache_creation_tokens to 0 when empty', () => {
    const minHeaders = 'timestamp,provider,model,input_tokens,output_tokens,request_id';
    const minRow = '2024-01-15T10:00:00Z,anthropic,claude-sonnet-4-6,100,50,req-min';
    const result = parseCSV(`${minHeaders}\n${minRow}`);
    expect(result).toHaveLength(1);
    expect(result[0].cached_input_tokens).toBe(0);
    expect(result[0].cache_creation_tokens).toBe(0);
  });

  it('generates a request_id when column is missing', () => {
    const minHeaders = 'timestamp,provider,model,input_tokens,output_tokens';
    const minRow = '2024-01-15T10:00:00Z,anthropic,claude-sonnet-4-6,100,50';
    const result = parseCSV(`${minHeaders}\n${minRow}`);
    expect(result).toHaveLength(1);
    expect(result[0].request_id).toBeTruthy();
  });

  it('omits task_id when empty', () => {
    const result = parseCSV(`${BASE_ROW}\n${ROW.replace('task-1', '')}`);
    expect(result[0].task_id).toBeUndefined();
  });

  it('handles quoted fields with commas', () => {
    const headers = 'timestamp,provider,model,input_tokens,output_tokens,request_id';
    const row = '"2024-01-15T10:00:00Z",anthropic,"claude,comma-model",100,50,req-q';
    const result = parseCSV(`${headers}\n${row}`);
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('claude,comma-model');
  });

  it('handles escaped double-quotes inside quoted fields', () => {
    const headers = 'timestamp,provider,model,input_tokens,output_tokens,request_id';
    const row = '"2024-01-15T10:00:00Z",anthropic,"claude-""quoted""",100,50,req-eq';
    const result = parseCSV(`${headers}\n${row}`);
    expect(result[0].model).toBe('claude-"quoted"');
  });
});
