import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Enable RLS on all coach-scoped tables
  const tables = [
    "coaches",
    "programmes",
    "clients",
    "enrollments",
    "milestones",
    "milestone_submissions",
    "milestone_evidence",
    "payments",
    "bonus_pots",
    "attendance_logs",
  ];

  for (const table of tables) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
  }

  // Coaches: users can only see their own coach profile
  await knex.raw(`
    CREATE POLICY coaches_own ON coaches
      FOR ALL USING (
        user_id = current_setting('app.current_user_id')::uuid
      )
  `);

  // Programmes: coaches can only manage their own
  await knex.raw(`
    CREATE POLICY programmes_own ON programmes
      FOR ALL USING (
        coach_id IN (SELECT id FROM coaches WHERE user_id = current_setting('app.current_user_id')::uuid)
      )
  `);

  // Clients: coaches can only see their own clients
  await knex.raw(`
    CREATE POLICY clients_own ON clients
      FOR ALL USING (
        coach_id IN (SELECT id FROM coaches WHERE user_id = current_setting('app.current_user_id')::uuid)
      )
  `);

  // Enrollments: coaches can only see their own enrollments
  await knex.raw(`
    CREATE POLICY enrollments_own ON enrollments
      FOR ALL USING (
        coach_id IN (SELECT id FROM coaches WHERE user_id = current_setting('app.current_user_id')::uuid)
      )
  `);

  // Milestones: accessible if programme belongs to coach
  await knex.raw(`
    CREATE POLICY milestones_own ON milestones
      FOR ALL USING (
        programme_id IN (
          SELECT id FROM programmes WHERE coach_id IN (
            SELECT id FROM coaches WHERE user_id = current_setting('app.current_user_id')::uuid
          )
        )
      )
  `);

  // Milestone submissions: accessible if enrollment belongs to coach
  await knex.raw(`
    CREATE POLICY milestone_submissions_own ON milestone_submissions
      FOR ALL USING (
        enrollment_id IN (
          SELECT id FROM enrollments WHERE coach_id IN (
            SELECT id FROM coaches WHERE user_id = current_setting('app.current_user_id')::uuid
          )
        )
      )
  `);

  // Milestone evidence: accessible via submission
  await knex.raw(`
    CREATE POLICY milestone_evidence_own ON milestone_evidence
      FOR ALL USING (
        submission_id IN (
          SELECT ms.id FROM milestone_submissions ms
          JOIN enrollments e ON e.id = ms.enrollment_id
          WHERE e.coach_id IN (
            SELECT id FROM coaches WHERE user_id = current_setting('app.current_user_id')::uuid
          )
        )
      )
  `);

  // Payments: accessible if enrollment belongs to coach
  await knex.raw(`
    CREATE POLICY payments_own ON payments
      FOR ALL USING (
        enrollment_id IN (
          SELECT id FROM enrollments WHERE coach_id IN (
            SELECT id FROM coaches WHERE user_id = current_setting('app.current_user_id')::uuid
          )
        )
      )
  `);

  // Bonus pots: accessible if enrollment belongs to coach
  await knex.raw(`
    CREATE POLICY bonus_pots_own ON bonus_pots
      FOR ALL USING (
        enrollment_id IN (
          SELECT id FROM enrollments WHERE coach_id IN (
            SELECT id FROM coaches WHERE user_id = current_setting('app.current_user_id')::uuid
          )
        )
      )
  `);

  // Attendance logs: accessible if enrollment belongs to coach
  await knex.raw(`
    CREATE POLICY attendance_logs_own ON attendance_logs
      FOR ALL USING (
        enrollment_id IN (
          SELECT id FROM enrollments WHERE coach_id IN (
            SELECT id FROM coaches WHERE user_id = current_setting('app.current_user_id')::uuid
          )
        )
      )
  `);
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    "attendance_logs",
    "bonus_pots",
    "payments",
    "milestone_evidence",
    "milestone_submissions",
    "milestones",
    "enrollments",
    "clients",
    "programmes",
    "coaches",
  ];

  for (const table of tables) {
    await knex.raw(`DROP POLICY IF EXISTS ${table}_own ON ${table}`);
    await knex.raw(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
  }
}
