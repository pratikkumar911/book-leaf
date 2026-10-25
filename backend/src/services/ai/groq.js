import { config } from '../../config.js';

// Groq exposes an OpenAI-compatible /chat/completions endpoint.
export async function callGroq({ model, messages, maxTokens = 400, temperature = 0.3, timeoutMs = config.groq.timeoutMs }) {
  if (!config.groq.apiKey) {
    const e = new Error('GROQ_API_KEY not set'); e.code = 'no_api_key'; e.transient = false; throw e;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${config.groq.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.groq.apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const err = new Error(e.name === 'AbortError' ? 'Groq timeout' : `Network: ${e.message}`);
    err.code = e.name === 'AbortError' ? 'timeout' : 'network';
    err.transient = true;
    throw err;
  }
  clearTimeout(timer);

  // Groq-specific status handling
  if (res.status === 429) {
    const ra = parseInt(res.headers.get('retry-after') || '0', 10);
    const e = new Error('Rate limited'); e.code = 'rate_limited'; e.transient = true;
    e.retryAfterMs = ra > 0 ? ra * 1000 : 20_000;
    throw e;
  }
  if (res.status === 401 || res.status === 403) {
    const e = new Error('Groq auth error'); e.code = 'auth_error'; e.transient = false; throw e;
  }
  if (res.status === 400) {
    // Groq returns 400 for model-not-found or bad request body — do NOT retry
    const body = await res.text();
    const e = new Error(`Groq 400: ${body.slice(0, 300)}`);
    e.code = 'bad_request';
    e.transient = false;
    throw e;
  }
  if (res.status >= 500) {
    const e = new Error(`Groq 5xx ${res.status}`); e.code = 'server_error'; e.transient = true; throw e;
  }
  if (!res.ok) {
    const body = await res.text();
    const e = new Error(`Groq ${res.status}: ${body.slice(0, 200)}`); e.code = 'bad_request'; e.transient = false;
    throw e;
  }

  const json = await res.json();
  return {
    content: json.choices?.[0]?.message?.content ?? '',
    usage: json.usage || {},
    model: json.model || model,
  };
}