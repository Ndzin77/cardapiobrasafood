// ── Duplicate detection for AI-parsed shopping list items ──
// Pure functions: easy to test, no side effects.

import { getFamilyOf, isCompatible, convert, getCompatibleUnits } from "./unitConversion";

export interface DetectableItem {
  name: string;
  quantity: number;
  unit: string;
  total_paid: number;
}

export interface DuplicateGroup<T extends DetectableItem> {
  /** Suggested final name (most common / longest among the cluster). */
  suggestedName: string;
  /** Indices of items in the original array that belong to this cluster. */
  indices: number[];
  /** The items themselves (snapshots). */
  items: T[];
  /** Whether the cost-per-unit varies more than the threshold across items. */
  priceWarning: boolean;
}

/** Strip diacritics, lowercase, trim, collapse whitespace, remove trailing 's' (simple plural). */
export function normalizeName(name: string): string {
  if (!name) return "";
  let n = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  // Drop very common Portuguese filler words that confuse matching
  n = n.replace(/\b(de|do|da|para|com|tipo|marca)\b/g, " ").replace(/\s+/g, " ").trim();
  // Naive plural removal (queijos → queijo). Skip if word is too short.
  if (n.length > 4 && n.endsWith("s")) n = n.slice(0, -1);
  return n;
}

/** Levenshtein distance (iterative, O(m*n) memory O(min(m,n))). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  // ensure a is the shorter one
  if (a.length > b.length) [a, b] = [b, a];
  const prev = new Array(a.length + 1);
  for (let i = 0; i <= a.length; i++) prev[i] = i;
  for (let j = 1; j <= b.length; j++) {
    let prevDiag = prev[0];
    prev[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = prev[i];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[i] = Math.min(prev[i] + 1, prev[i - 1] + 1, prevDiag + cost);
      prevDiag = tmp;
    }
  }
  return prev[a.length];
}

/** Similarity in [0, 1]; 1 means identical. */
export function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // If one fully contains the other (and the shorter is at least 4 chars), boost.
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) {
    return Math.max(0.9, 1 - Math.abs(na.length - nb.length) / Math.max(na.length, nb.length));
  }
  const dist = levenshtein(na, nb);
  const max = Math.max(na.length, nb.length);
  return 1 - dist / max;
}

/** Returns true if two items are similar enough to suggest merging. */
export function areSimilar<T extends DetectableItem>(a: T, b: T, threshold = 0.85): boolean {
  if (similarity(a.name, b.name) < threshold) return false;
  // Units must be compatible (same family). Unit family "unit" only matches itself.
  if (!isCompatible(a.unit, b.unit)) return false;
  return true;
}

/**
 * Group items into clusters of duplicates using union-find.
 * Returns only clusters with 2+ items.
 */
export function findDuplicateGroups<T extends DetectableItem>(
  items: T[],
  threshold = 0.85,
): DuplicateGroup<T>[] {
  const n = items.length;
  if (n < 2) return [];

  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (areSimilar(items[i], items[j], threshold)) union(i, j);
    }
  }

  const buckets = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!buckets.has(r)) buckets.set(r, []);
    buckets.get(r)!.push(i);
  }

  const groups: DuplicateGroup<T>[] = [];
  for (const indices of buckets.values()) {
    if (indices.length < 2) continue;
    const groupItems = indices.map((i) => items[i]);

    // Suggested name: longest by char count (usually most descriptive)
    const suggestedName = groupItems
      .map((it) => it.name)
      .reduce((best, cur) => (cur.length > best.length ? cur : best), groupItems[0].name);

    // Price warning: compute cost_per_unit in base unit; flag if max/min > 1.5
    const family = getFamilyOf(groupItems[0].unit);
    let priceWarning = false;
    if (family) {
      const baseUnit = groupItems[0].unit;
      const cpus: number[] = [];
      for (const it of groupItems) {
        const qBase = convert(it.quantity, it.unit, baseUnit);
        if (isFinite(qBase) && qBase > 0 && it.total_paid > 0) {
          cpus.push(it.total_paid / qBase);
        }
      }
      if (cpus.length >= 2) {
        const min = Math.min(...cpus);
        const max = Math.max(...cpus);
        if (min > 0 && max / min > 1.5) priceWarning = true;
      }
    }

    groups.push({ suggestedName, indices, items: groupItems, priceWarning });
  }

  return groups;
}

/**
 * Pick the "largest" unit among compatible ones (kg over g, L over ml).
 * Falls back to the first unit if family is unknown.
 */
export function pickLargestUnit(units: string[]): string {
  if (units.length === 0) return "";
  const family = getFamilyOf(units[0]);
  if (!family) return units[0];
  const compat = getCompatibleUnits(units[0]);
  // Order compat by conversion factor to base (largest factor = largest unit)
  // We approximate by converting 1 of each to the family base unit.
  const baseUnit = units[0];
  let best = units[0];
  let bestFactor = -Infinity;
  for (const u of units) {
    const factor = convert(1, u, baseUnit);
    if (isFinite(factor) && factor > bestFactor) {
      bestFactor = factor;
      best = u;
    }
  }
  // Prefer canonical compat option (e.g. "kg" over "g") if present
  const canonicalLargest = compat
    .map((c) => c.value)
    .filter((v) => units.includes(v))
    .sort((a, b) => convert(1, b, baseUnit) - convert(1, a, baseUnit))[0];
  return canonicalLargest ?? best;
}

/**
 * Merge a subset of items into a single item.
 * - Sums quantities (converted to targetUnit)
 * - Sums total_paid
 * - Uses provided finalName
 * Returns null if any selected unit is incompatible with targetUnit.
 */
export function mergeItems<T extends DetectableItem>(
  selected: T[],
  finalName: string,
  targetUnit: string,
): T | null {
  if (selected.length === 0) return null;
  let totalQty = 0;
  let totalPaid = 0;
  for (const it of selected) {
    if (!isCompatible(it.unit, targetUnit)) return null;
    const q = it.unit === targetUnit ? it.quantity : convert(it.quantity, it.unit, targetUnit);
    if (!isFinite(q) || q <= 0) return null;
    totalQty += q;
    totalPaid += it.total_paid;
  }
  // Round to 4 decimals to avoid float drift
  totalQty = Math.round(totalQty * 10000) / 10000;
  totalPaid = Math.round(totalPaid * 100) / 100;
  // Spread first item to keep extra fields (e.g. match_ingredient_id) — caller may override
  return {
    ...selected[0],
    name: finalName.trim() || selected[0].name,
    quantity: totalQty,
    unit: targetUnit,
    total_paid: totalPaid,
  };
}
