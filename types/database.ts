export interface User {
  id: string;
  email: string;
  supabaseAuthId: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Coach {
  id: string;
  userId: string;
  businessName: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Programme {
  id: string;
  coachId: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  baseFeeAmount: number;
  bonusPotAmount: number;
  currency: string;
  status: ProgrammeStatus;
  maxClients: number | null;
  createdAt: string;
  updatedAt: string;
}

export type ProgrammeStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface Client {
  id: string;
  coachId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  programmeId: string;
  clientId: string;
  coachId: string;
  status: EnrollmentStatus;
  startDate: string;
  endDate: string;
  baseFeeAmount: number;
  bonusPotAmount: number;
  currency: string;
  stripePaymentIntentId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EnrollmentStatus =
  | "PENDING_PAYMENT"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export interface Milestone {
  id: string;
  programmeId: string;
  name: string;
  description: string | null;
  weekNumber: number;
  requiredEvidence: MilestoneEvidenceType[];
  createdAt: string;
}

export type MilestoneEvidenceType = "PHOTO" | "CHECK_IN" | "ATTENDANCE";

export interface MilestoneSubmission {
  id: string;
  milestoneId: string;
  enrollmentId: string;
  status: MilestoneSubmissionStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
}

export type MilestoneSubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface MilestoneEvidence {
  id: string;
  submissionId: string;
  evidenceType: MilestoneEvidenceType;
  storagePath: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface BonusPot {
  id: string;
  enrollmentId: string;
  amount: number;
  currency: string;
  status: BonusPotStatus;
  stripeTransferId: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
}

export type BonusPotStatus = "HELD" | "RELEASED" | "REFUNDED" | "DONATED";

export interface Payment {
  id: string;
  enrollmentId: string;
  amount: number;
  currency: string;
  type: PaymentType;
  status: PaymentStatus;
  stripePaymentIntentId: string | null;
  scheduledDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

export type PaymentType = "BASE_FEE" | "BONUS_POT" | "PLATFORM_FEE";
export type PaymentStatus = "SCHEDULED" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface AttendanceLog {
  id: string;
  enrollmentId: string;
  sessionDate: string;
  attended: boolean;
  notes: string | null;
  loggedBy: string;
  createdAt: string;
}
