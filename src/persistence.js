import { loadState, saveState } from './store.js';

export async function createPersistence({ filePath, databaseUrl = process.env.LANTERN_DATABASE_URL } = {}) {
  if (!databaseUrl) return { load: () => loadState(filePath), save: (state) => saveState(filePath, state), close: async () => {} };

  const { Client } = await import('pg');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query('CREATE TABLE IF NOT EXISTS lantern_state (id smallint PRIMARY KEY, payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');

  return {
    async load() {
      const result = await client.query('SELECT payload FROM lantern_state WHERE id = 1');
      if (result.rows[0]?.payload) return result.rows[0].payload;
      return loadState(filePath);
    },
    async save(state) {
      await client.query('INSERT INTO lantern_state (id, payload, updated_at) VALUES (1, $1::jsonb, now()) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()', [JSON.stringify(state)]);
    },
    close: () => client.end(),
  };
}
