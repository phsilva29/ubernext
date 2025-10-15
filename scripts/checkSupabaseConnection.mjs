import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ensureEnvValue = (key) => {
  if (process.env[key]) {
    return process.env[key];
  }

  try {
    const envPath = resolve(process.cwd(), '.env');
    const raw = readFileSync(envPath, 'utf-8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [envKey, ...rest] = trimmed.split('=');
      if (!envKey || rest.length === 0) continue;
      const value = rest.join('=').trim().replace(/^"|"$/g, '');
      if (!(envKey in process.env)) {
        process.env[envKey] = value;
      }
    }
  } catch (err) {
    console.warn('Could not read .env file:', err.message);
  }

  return process.env[key];
};

const url = ensureEnvValue('VITE_SUPABASE_URL');
const anonKey = ensureEnvValue('VITE_SUPABASE_PUBLISHABLE_KEY');

if (!url || !anonKey) {
  console.error('Missing Supabase credentials in environment variables.');
  process.exit(1);
}

console.log('Testing Supabase connection with project:', url);

const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
  },
});

try {
  const { data, error } = await supabase
    .from('finance_state')
    .select('user_id, last_reset_month')
    .limit(1);

  if (error) {
    console.error('Connection succeeded but query returned an error:', error.message);
    process.exit(1);
  }

  console.log('Connection successful. Sample rows:', data);
  process.exit(0);
} catch (err) {
  console.error('Failed to reach Supabase:', err);
  process.exit(1);
}
