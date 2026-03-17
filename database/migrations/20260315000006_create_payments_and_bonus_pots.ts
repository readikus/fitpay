import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Payments - tracks all money movement
  await knex.raw(`
    CREATE TABLE payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
      type VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
      stripe_payment_intent_id VARCHAR(255),
      scheduled_date DATE,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await knex.raw("CREATE INDEX idx_payments_enrollment_id ON payments(enrollment_id)");
  await knex.raw("CREATE INDEX idx_payments_status ON payments(status)");
  await knex.raw("CREATE INDEX idx_payments_type ON payments(type)");
  await knex.raw("CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id)");

  // Bonus pots - Stripe-held escrow tracking
  await knex.raw(`
    CREATE TABLE bonus_pots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      enrollment_id UUID UNIQUE NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
      status VARCHAR(20) NOT NULL DEFAULT 'HELD',
      stripe_transfer_id VARCHAR(255),
      released_at TIMESTAMPTZ,
      refunded_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await knex.raw("CREATE INDEX idx_bonus_pots_enrollment_id ON bonus_pots(enrollment_id)");
  await knex.raw("CREATE INDEX idx_bonus_pots_status ON bonus_pots(status)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP TABLE IF EXISTS bonus_pots");
  await knex.raw("DROP TABLE IF EXISTS payments");
}
