// ── Unit conversion system ──
// Allows quantity conversion only within the same family (weight↔weight, volume↔volume).
// Mixing weight with volume is intentionally blocked to prevent bugs.

export type UnitFamily = "weight" | "volume" | "unit";

interface FamilyDef {
  base: string;
  // factor to convert FROM this unit TO the base unit
  units: Record<string, number>;
  labels: Record<string, string>;
}

export const UNIT_FAMILIES: Record<UnitFamily, FamilyDef> = {
  weight: {
    base: "g",
    units: { mg: 0.001, g: 1, kg: 1000 },
    labels: { mg: "Miligrama (mg)", g: "Grama (g)", kg: "Quilo (kg)" },
  },
  volume: {
    base: "ml",
    units: { ml: 1, l: 1000, L: 1000 },
    labels: { ml: "Mililitro (ml)", l: "Litro (L)", L: "Litro (L)" },
  },
  unit: {
    base: "un",
    units: { un: 1 },
    labels: { un: "Unidade (un)" },
  },
};

/** Normalize unit string (case-insensitive lookup, treats "L" as "l") */
function normalize(unit: string): string {
  if (!unit) return "";
  const u = unit.trim();
  if (u === "L") return "l";
  return u.toLowerCase();
}

export function getFamilyOf(unit: string): UnitFamily | null {
  const u = normalize(unit);
  for (const [family, def] of Object.entries(UNIT_FAMILIES) as [UnitFamily, FamilyDef][]) {
    const keys = Object.keys(def.units).map((k) => k.toLowerCase());
    if (keys.includes(u)) return family;
  }
  return null;
}

/** Returns a list of units compatible with the given unit (same family). */
export function getCompatibleUnits(unit: string): { value: string; label: string }[] {
  const family = getFamilyOf(unit);
  if (!family) return [{ value: unit, label: unit }];
  const def = UNIT_FAMILIES[family];
  // De-duplicate (l vs L collapse)
  const seen = new Set<string>();
  const result: { value: string; label: string }[] = [];
  for (const [key, label] of Object.entries(def.labels)) {
    const norm = normalize(key);
    if (seen.has(norm)) continue;
    seen.add(norm);
    // Use canonical form for value
    const canonical = key === "L" ? "l" : key;
    result.push({ value: canonical, label });
  }
  return result;
}

function factorToBase(unit: string, family: UnitFamily): number {
  const def = UNIT_FAMILIES[family];
  const u = normalize(unit);
  for (const [key, factor] of Object.entries(def.units)) {
    if (normalize(key) === u) return factor;
  }
  return 1;
}

/** Round to 4 decimal places to avoid float drift. */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Convert quantity from `fromUnit` to `toUnit`.
 * Returns NaN if units are incompatible (different families).
 */
export function convert(qty: number, fromUnit: string, toUnit: string): number {
  if (!isFinite(qty)) return 0;
  const fromFamily = getFamilyOf(fromUnit);
  const toFamily = getFamilyOf(toUnit);
  if (!fromFamily || !toFamily || fromFamily !== toFamily) return NaN;
  if (normalize(fromUnit) === normalize(toUnit)) return round4(qty);
  const inBase = qty * factorToBase(fromUnit, fromFamily);
  const out = inBase / factorToBase(toUnit, toFamily);
  return round4(out);
}

/** Check whether two units can be converted. */
export function isCompatible(unitA: string, unitB: string): boolean {
  const a = getFamilyOf(unitA);
  const b = getFamilyOf(unitB);
  return !!a && !!b && a === b;
}

/** Returns a human-readable label for a unit (e.g. "kg" -> "Quilo (kg)"). */
export function getUnitLabel(unit: string): string {
  const family = getFamilyOf(unit);
  if (!family) return unit;
  const def = UNIT_FAMILIES[family];
  const u = normalize(unit);
  for (const [key, label] of Object.entries(def.labels)) {
    if (normalize(key) === u) return label;
  }
  return unit;
}
