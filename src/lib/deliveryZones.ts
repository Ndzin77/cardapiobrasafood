/**
 * Delivery zone matching utilities.
 * Pure functions — no side effects.
 */

export interface DeliveryZone {
  id: string;
  store_id: string;
  zone_type: "radius" | "neighborhood" | "cep";
  label: string;
  delivery_fee: number;
  config: Record<string, any>;
  sort_order: number;
  is_active: boolean;
}

export interface ZoneMatchResult {
  matched: boolean;
  zone: DeliveryZone | null;
  fee: number;
  min_order: number;
  distance_km?: number;
}

export interface RadiusTier {
  max_km: number;
  fee: number;
  min_order: number;
}

// ── Haversine distance (km) ──
const R = 6371; // Earth radius in km
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Normalize text for comparison ──
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ── Match a single zone ──
function matchZone(
  zone: DeliveryZone,
  params: { neighborhood?: string; cep?: string; lat?: number; lng?: number }
): boolean {
  if (!zone.is_active) return false;

  switch (zone.zone_type) {
    case "radius": {
      const { lat, lng, radius_km, tiers } = zone.config as {
        lat?: number;
        lng?: number;
        radius_km?: number;
        tiers?: RadiusTier[];
      };
      if (!lat || !lng || !params.lat || !params.lng) return false;
      const dist = haversineKm(lat, lng, params.lat, params.lng);
      if (tiers && tiers.length > 0) {
        const sorted = [...tiers].sort((a, b) => a.max_km - b.max_km);
        return sorted.some(t => dist <= t.max_km);
      }
      return dist <= (radius_km || 0);
    }
    case "neighborhood": {
      const names: string[] = (zone.config as any).names || (zone.config as any).neighborhoods || [];
      const cepPrefixes: string[] = (zone.config as any).cep_prefixes || [];

      const neighborhoodMatched = params.neighborhood
        ? names.some((n) => normalize(n) === normalize(params.neighborhood!))
        : false;

      const cepMatched = params.cep && cepPrefixes.length > 0
        ? cepPrefixes.some((p) => params.cep!.replace(/\D/g, "").startsWith(p))
        : false;

      return neighborhoodMatched || cepMatched;
    }
    case "cep": {
      const prefixes: string[] = (zone.config as any).prefixes || [];
      if (!params.cep) return false;
      const digits = params.cep.replace(/\D/g, "");
      return prefixes.some((p) => digits.startsWith(p));
    }
    default:
      return false;
  }
}

/**
 * Cross-validate CEP vs neighborhood consistency.
 * Returns true if consistent (or if no cross-validation is possible).
 * Returns false if there's a conflict (neighborhood matched a zone that has
 * cep_prefixes configured, but the CEP doesn't match any of them).
 */
export function validateCepNeighborhoodConsistency(
  zones: DeliveryZone[],
  neighborhood: string,
  cep: string
): { consistent: boolean; message: string } {
  if (!neighborhood?.trim()) return { consistent: true, message: "" };

  const normNeighborhood = normalize(neighborhood);

  // If CEP is empty, check if any matching zone requires it via cep_prefixes
  if (!cep?.trim()) {
    for (const zone of zones) {
      if (!zone.is_active || zone.zone_type !== "neighborhood") continue;
      const names: string[] = (zone.config as any).names || (zone.config as any).neighborhoods || [];
      const cepPrefixes: string[] = (zone.config as any).cep_prefixes || [];
      if (names.some((n) => normalize(n) === normNeighborhood) && cepPrefixes.length > 0) {
        return {
          consistent: false,
          message: "Informe o CEP para confirmar a região de entrega.",
        };
      }
    }
    return { consistent: true, message: "" };
  }

  const digits = cep.replace(/\D/g, "");
  if (digits.length < 5) return { consistent: true, message: "" };

  for (const zone of zones) {
    if (!zone.is_active || zone.zone_type !== "neighborhood") continue;
    const names: string[] = (zone.config as any).names || (zone.config as any).neighborhoods || [];
    const cepPrefixes: string[] = (zone.config as any).cep_prefixes || [];

    // If the neighborhood matches this zone AND the zone has cep_prefixes configured
    const nameMatch = names.some((n) => normalize(n) === normNeighborhood);
    if (nameMatch && cepPrefixes.length > 0) {
      // Check if CEP is consistent
      const cepOk = cepPrefixes.some((p) => digits.startsWith(p));
      if (!cepOk) {
        return {
          consistent: false,
          message: "O CEP informado não corresponde à região do bairro selecionado. Verifique os dados.",
        };
      }
    }
  }

  return { consistent: true, message: "" };
}

// ── Find first matching zone (sorted by sort_order) ──
export function findMatchingZone(
  zones: DeliveryZone[],
  params: { neighborhood?: string; cep?: string; lat?: number; lng?: number }
): ZoneMatchResult {
  const sorted = [...zones]
    .filter((z) => z.is_active)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  for (const zone of sorted) {
    if (matchZone(zone, params)) {
      // For radius zones with tiers, calculate exact fee/min_order from tier
      if (zone.zone_type === "radius" && params.lat && params.lng) {
        const cfg = zone.config as any;
        const dist = haversineKm(cfg.lat, cfg.lng, params.lat, params.lng);
        const tiers: RadiusTier[] = cfg.tiers || [];
        if (tiers.length > 0) {
          const sortedTiers = [...tiers].sort((a, b) => a.max_km - b.max_km);
          const tier = sortedTiers.find(t => dist <= t.max_km);
          if (tier) {
            return { matched: true, zone, fee: tier.fee, min_order: tier.min_order || 0, distance_km: dist };
          }
        }
      }
      const minOrder = (zone.config as any).min_order || 0;
      return { matched: true, zone, fee: Number(zone.delivery_fee) || 0, min_order: minOrder };
    }
  }
  return { matched: false, zone: null, fee: 0, min_order: 0 };
}

/**
 * Get fee range across all active zones (for preview/hints).
 */
export function getZoneFeeRange(zones: DeliveryZone[]): { min: number; max: number } {
  const fees: number[] = [];
  for (const zone of zones) {
    if (!zone.is_active) continue;
    const tiers: RadiusTier[] = (zone.config as any).tiers || [];
    if (tiers.length > 0) {
      tiers.forEach(t => fees.push(t.fee));
    } else {
      fees.push(Number(zone.delivery_fee) || 0);
    }
  }
  if (fees.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...fees), max: Math.max(...fees) };
}

/**
 * Extract all unique neighborhood names from active zones.
 */
export function getZoneNeighborhoods(zones: DeliveryZone[]): string[] {
  const set = new Set<string>();
  for (const zone of zones) {
    if (!zone.is_active || zone.zone_type !== "neighborhood") continue;
    const names: string[] = (zone.config as any).names || (zone.config as any).neighborhoods || [];
    names.forEach((n) => set.add(n));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
