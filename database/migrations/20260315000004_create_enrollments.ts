import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      base_fee_amount INTEGER NOT NULL,
      bonus_pot_amount INTEGER NOT NULL DEFAULT 0,
      currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
      stripe_payment_intent_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await knex.raw("CREATE INDEX idx_enrollments_programme_id ON enrollments(programme_id)");
  await knex.raw("CREATE INDEX idx_enrollments_client_id ON enrollments(client_id)");
  await knex.raw("CREATE INDEX idx_enrollments_coach_id ON enrollments(coach_id)");
  await knex.raw("CREATE INDEX idx_enrollments_status ON enrollments(status)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP TABLE IF EXISTS enrollments");
}
