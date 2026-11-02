export interface UserRole {
  id?: number;
  code: string;
  name?: string;
  nameSi?: string;
  description?: string;
}

export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  languagePreference: string;
  preferredDamId: number | null;
  onboardingCompletedAt: string | null;
  role?: UserRole | string;
  roleCode?: string;
}

