import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Milestone definitions per programme
  await knex.raw(`
    CREATE TABLE milestones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      week_number INTEGER NOT NULL,
      required_evidence JSONB NOT NULL DEFAULT '["CHECK_IN"]',
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await knex.raw("CREATE INDEX idx_milestones_programme_id ON milestones(programme_id)");

  // Milestone submissions per enrollment
  await knex.raw(`
    CREATE TABLE milestone_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      submitted_at TIMESTAMPTZ DEFAULT now(),
      reviewed_at TIMESTAMPTZ,
      reviewed_by UUID REFERENCES users(id),
      review_notes TEXT,
      UNIQUE(milestone_id, enrollment_id)
    )
  `);

  await knex.raw("CREATE INDEX idx_milestone_submissions_enrollment_id ON milestone_submissions(enrollment_id)");

  // Evidence attached to a submission
  await knex.raw(`
    CREATE TABLE milestone_evidence (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      submission_id UUID NOT NULL REFERENCES milestone_submissions(id) ON DELETE CASCADE,
      evidence_type VARCHAR(20) NOT NULL,
      storage_path TEXT,
      notes TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await knex.raw("CREATE INDEX idx_milestone_evidence_submission_id ON milestone_evidence(submission_id)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP TABLE IF EXISTS milestone_evidence");
  await knex.raw("DROP TABLE IF EXISTS milestone_submissions");
  await knex.raw("DROP TABLE IF EXISTS milestones");
}
