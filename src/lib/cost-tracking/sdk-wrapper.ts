/**
 * Driftwatch SDK Wrapper — Reference Implementation
 *
 * Wraps Anthropic or OpenAI client instances to automatically capture
 * usage metadata from every API response. Data is stored in IndexedDB
 * via the Driftwatch store layer.
 *
 * Usage:
 *   import { withDriftwatch } from 'driftwatch';
 *   const client = withDriftwatch(new Anthropic({ apiKey: '...' }));
 *   // All subsequent .messages.create() calls are tracked automatically.
 *
 * The original response is returned UNMODIFIED. Logging is async/non-blocking.
 */

import { addUsageRecord } from './store';

// ---------------------------------------------------------------------------
// Public options
// ---------------------------------------------------------------------------

export interface DriftwatchOptions {
  /** Associate all calls with a task or job identifier. */
  task_id?: string;
  /** Group calls that belong to the same multi-turn conversation. */
  conversation_id?: string;
  /** Label for the agent or service making the calls (e.g. "summariser"). */
  agent_name?: string;
}

// ---------------------------------------------------------------------------
// Internal shape helpers — intentionally loose so we never import SDK types.
// We only read fields we know exist; everything else is left untouched.
// ---------------------------------------------------------------------------

/** Subset of an Anthropic Messages response we care about. */
interface AnthropicResponse {
  id?: string;
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

/** Subset of an OpenAI ChatCompletion response we care about. */
interface OpenAIResponse {
  id?: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: {
      cached_tokens?: number;
    };
  };
}

// ---------------------------------------------------------------------------
// Usage extraction
// ---------------------------------------------------------------------------

/**
 * Reads Anthropic usage fields and calls addUsageRecord fire-and-forget.
 * Silently swallows any error so it never affects the caller.
 */
function captureAnthropicUsage(response: AnthropicResponse, options: DriftwatchOptions): void {
  // Guard: skip if usage is missing (e.g. error responses, unexpected shapes)
  if (!response.usage) return;

  addUsageRecord({
    timestamp: new Date().toISOString(),
    provider: 'anthropic',
    model: response.model ?? 'unknown',
    input_tokens: response.usage.input_tokens ?? 0,
    output_tokens: response.usage.output_tokens ?? 0,
    // Anthropic returns cache_read_input_tokens for prompt cache hits
    cached_input_tokens: response.usage.cache_read_input_tokens ?? 0,
    // cache_creation_input_tokens reflects tokens written to the cache
    cache_creation_tokens: response.usage.cache_creation_input_tokens ?? 0,
    is_batch: false,
    // response.id is the message ID (e.g. "msg_01XFDUDYJgAACzvnptvVoYEL")
    request_id: response.id ?? crypto.randomUUID(),
    ...options,
  }).catch(() => {
    // Intentionally silent — tracking must never break the application.
  });
}

/**
 * Reads OpenAI usage fields and calls addUsageRecord fire-and-forget.
 */
function captureOpenAIUsage(response: OpenAIResponse, options: DriftwatchOptions): void {
  if (!response.usage) return;

  addUsageRecord({
    timestamp: new Date().toISOString(),
    provider: 'openai',
    model: response.model ?? 'unknown',
    // OpenAI uses prompt_tokens / completion_tokens naming
    input_tokens: response.usage.prompt_tokens ?? 0,
    output_tokens: response.usage.completion_tokens ?? 0,
    // Cached tokens live inside prompt_tokens_details
    cached_input_tokens: response.usage.prompt_tokens_details?.cached_tokens ?? 0,
    // OpenAI has no equivalent to Anthropic's cache-write tokens
    cache_creation_tokens: 0,
    is_batch: false,
    request_id: response.id ?? crypto.randomUUID(),
    ...options,
  }).catch(() => {
    // Intentionally silent.
  });
}

// ---------------------------------------------------------------------------
// Method-level proxies
// ---------------------------------------------------------------------------

/**
 * Returns a proxy over `client.messages` that intercepts `.create()` calls.
 * The Anthropic client shape is:  client.messages.create(params) → Message
 */
function proxyAnthropicMessages(messages: object, options: DriftwatchOptions): object {
  return new Proxy(messages, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (prop === 'create' && typeof value === 'function') {
        // Return a wrapper that calls the real create, captures usage, then
        // returns the original response completely unmodified.
        return async function (...args: unknown[]) {
          // TODO: streaming — when params include { stream: true }, the return
          // value is an async iterable, not a plain response object. Each chunk
          // only carries partial usage; the final chunk contains the totals.
          // Handling this requires consuming the stream, which changes the
          // caller's interface. For now, streaming calls pass through unwrapped.
          const params = args[0];
          if (
            params !== null &&
            typeof params === 'object' &&
            'stream' in params &&
            (params as Record<string, unknown>).stream === true
          ) {
            // Pass through unchanged so streaming callers are unaffected.
            return value.apply(target, args);
          }

          const response = (await value.apply(target, args)) as AnthropicResponse;
          captureAnthropicUsage(response, options);
          return response;
        };
      }

      // For everything else (e.g. .stream(), .countTokens()) pass through.
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

/**
 * Returns a proxy over `client.chat` that intercepts `.completions.create()`.
 * The OpenAI client shape is:  client.chat.completions.create(params) → ChatCompletion
 */
function proxyOpenAIChat(chat: object, options: DriftwatchOptions): object {
  return new Proxy(chat, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (prop === 'completions' && value !== null && typeof value === 'object') {
        // One more level: chat.completions.create
        return new Proxy(value as object, {
          get(innerTarget, innerProp, innerReceiver) {
            const innerValue = Reflect.get(innerTarget, innerProp, innerReceiver);

            if (innerProp === 'create' && typeof innerValue === 'function') {
              return async function (...args: unknown[]) {
                // TODO: same streaming caveat as Anthropic above.
                const params = args[0];
                if (
                  params !== null &&
                  typeof params === 'object' &&
                  'stream' in params &&
                  (params as Record<string, unknown>).stream === true
                ) {
                  return innerValue.apply(innerTarget, args);
                }

                const response = (await innerValue.apply(innerTarget, args)) as OpenAIResponse;
                captureOpenAIUsage(response, options);
                return response;
              };
            }

            return typeof innerValue === 'function'
              ? innerValue.bind(innerTarget)
              : innerValue;
          },
        });
      }

      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Wraps an Anthropic or OpenAI client with automatic usage tracking.
 *
 * The generic parameter T preserves the original client type so callers retain
 * full type-safety and IDE autocomplete — the return type is exactly T, not a
 * weakened wrapper.
 *
 * Detection strategy:
 *   - If the client has a `.messages` property  → treat as Anthropic
 *   - If the client has a `.chat` property       → treat as OpenAI
 *   - Otherwise the client is returned unchanged with a console warning
 *
 * Limitations:
 *   - Streaming responses are passed through unwrapped (see TODO comments above)
 *   - Batch API calls (Anthropic batch, OpenAI batch) are not intercepted here;
 *     use the importers in ./importers/ to ingest batch result files instead
 *   - Only the first layer of method calls is proxied; if the SDK adds
 *     convenience helpers that bypass messages.create internally, those won't
 *     be captured automatically
 */
export function withDriftwatch<T extends object>(client: T, options: DriftwatchOptions = {}): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Intercept the Anthropic messages namespace
      if (prop === 'messages' && value !== null && typeof value === 'object') {
        return proxyAnthropicMessages(value as object, options);
      }

      // Intercept the OpenAI chat namespace
      if (prop === 'chat' && value !== null && typeof value === 'object') {
        return proxyOpenAIChat(value as object, options);
      }

      // All other properties (apiKey, baseURL, etc.) pass through unmodified.
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as T;
}
