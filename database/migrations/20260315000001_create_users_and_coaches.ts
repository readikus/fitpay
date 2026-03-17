import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Enable required extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Users table - linked to Supabase Auth
  await knex.raw(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      supabase_auth_id UUID UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await knex.raw("CREATE INDEX idx_users_supabase_auth_id ON users(supabase_auth_id)");

  // Coaches table - coach profile for a user
  await knex.raw(`
    CREATE TABLE coaches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_name VARCHAR(255),
      stripe_account_id VARCHAR(255),
      stripe_onboarding_complete BOOLEAN DEFAULT false,
      onboarding_complete BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await knex.raw("CREATE INDEX idx_coaches_user_id ON coaches(user_id)");
  await knex.raw("CREATE INDEX idx_coaches_stripe_account_id ON coaches(stripe_account_id)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP TABLE IF EXISTS coaches");
  await knex.raw("DROP TABLE IF EXISTS users");
}
