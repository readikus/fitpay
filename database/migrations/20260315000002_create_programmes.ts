import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE programmes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      duration_weeks INTEGER NOT NULL DEFAULT 12,
      base_fee_amount INTEGER NOT NULL,
      bonus_pot_amount INTEGER NOT NULL DEFAULT 0,
      currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
      status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
      max_clients INTEGER,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await knex.raw("CREATE INDEX idx_programmes_coach_id ON programmes(coach_id)");
  await knex.raw("CREATE INDEX idx_programmes_status ON programmes(status)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP TABLE IF EXISTS programmes");
}
