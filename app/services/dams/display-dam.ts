interface DamSummary { id?: unknown; damId?: unknown; name?: unknown; code?: unknown; }

// Never substitute a different dam for the user's saved choice.
export function pickDisplayedDam<T extends DamSummary>(dams: T[], preferredDamId?: number | null): T | undefined {
  return dams.find(dam => String(dam.id ?? dam.damId) === String(preferredDamId));
}
