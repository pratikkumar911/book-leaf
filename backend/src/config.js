import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    classifyModel: process.env.GROQ_CLASSIFY_MODEL || 'llama-3.1-8b-instant',
    draftModel: process.env.GROQ_DRAFT_MODEL || 'llama-3.3-70b-versatile',
    timeoutMs: parseInt(process.env.GROQ_TIMEOUT_MS || '15000', 10),
  },
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
};

if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
  console.warn('[config] Missing Supabase env vars.');
}
if (!config.groq.apiKey) {
  console.warn('[config] Missing GROQ_API_KEY — AI falls back to rules/templates.');
}