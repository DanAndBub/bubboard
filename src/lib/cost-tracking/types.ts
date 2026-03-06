export interface ModelPricing {
  model: string;
  provider: 'anthropic' | 'openai';
  input_per_mtok: number;
  output_per_mtok: number;
  cache_read_per_mtok: number;
  cache_write_per_mtok: number;
  batch_discount: number;
  updated_at: string;
}

export interface UsageRecord {
  id: string;
  timestamp: string;
  provider: 'anthropic' | 'openai';
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  cache_creation_tokens: number;
  is_batch: boolean;
  request_id: string;
  task_id?: string;
  conversation_id?: string;
  agent_name?: string;
  cost_usd: number;
}

export interface CostBreakdown {
  input_cost: number;
  output_cost: number;
  cache_read_cost: number;
  cache_write_cost: number;
  total_cost: number;
}
