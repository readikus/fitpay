export interface SessionUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  coachId: string | null;
  businessName: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  onboardingComplete: boolean;
}
