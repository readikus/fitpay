import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE attendance_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      session_date DATE NOT NULL,
      attended BOOLEAN NOT NULL DEFAULT true,
      notes TEXT,
      logged_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(enrollment_id, session_date)
    )
  `);

  await knex.raw("CREATE INDEX idx_attendance_logs_enrollment_id ON attendance_logs(enrollment_id)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP TABLE IF EXISTS attendance_logs");
}
