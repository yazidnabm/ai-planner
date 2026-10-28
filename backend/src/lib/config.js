import 'dotenv/config';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

export function loadConfig() {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Variabel lingkungan wajib belum diisi: ${missing.join(', ')}`);
  }
  return {
    port: Number(process.env.PORT || 4000),
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ai: {
      baseUrl: process.env.AI_BASE_URL || 'http://localhost:20128/v1',
      apiKey: process.env.AI_API_KEY || '',
      model: process.env.AI_MODEL || 'ag/gemini-3.8-flash',
      timeoutMs: Number(process.env.AI_TIMEOUT_MS || 120000),
    },
  };
}
