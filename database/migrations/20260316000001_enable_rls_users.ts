import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw("ALTER TABLE users ENABLE ROW LEVEL SECURITY");

  await knex.raw(`
    CREATE POLICY users_own ON users
      FOR ALL USING (
        supabase_auth_id = current_setting('app.current_user_id')::uuid
      )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP POLICY IF EXISTS users_own ON users");
  await knex.raw("ALTER TABLE users DISABLE ROW LEVEL SECURITY");
}
