export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  languagePreference: string;
  preferredDamId: number | null;
  onboardingCompletedAt: string | null;
  role?: { id?: number; code: string; name?: string } | null;
}
