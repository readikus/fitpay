export enum ProgrammeStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum EnrollmentStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export enum MilestoneEvidenceType {
  PHOTO = "PHOTO",
  CHECK_IN = "CHECK_IN",
  ATTENDANCE = "ATTENDANCE",
}

export enum MilestoneSubmissionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum BonusPotStatus {
  HELD = "HELD",
  RELEASED = "RELEASED",
  REFUNDED = "REFUNDED",
  DONATED = "DONATED",
}

export enum PaymentType {
  BASE_FEE = "BASE_FEE",
  BONUS_POT = "BONUS_POT",
  PLATFORM_FEE = "PLATFORM_FEE",
}

export enum PaymentStatus {
  SCHEDULED = "SCHEDULED",
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}
