interface DamSummary { id?: unknown; damId?: unknown; name?: unknown; code?: unknown; }

// Keep dashboard readings, map focus and legends on the same demo dam.
export function pickDisplayedDam<T extends DamSummary>(dams: T[]): T | undefined {
  return dams.find(dam => dam.code === 'DEMO-002' && dam.name === 'Victoria Dam') ?? dams[0];
}
