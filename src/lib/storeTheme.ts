export type StoreThemePresetId =
  | "pizzaria"
  | "padaria"
  | "doceria"
  | "churrascaria"
  | "hamburgueria"
  | "pastelaria"
  | "acai"
  | "sushi"
  | "cafeteria"
  | "sorveteria"
  | "petiscaria"
  | "marmitaria";

export type StoreThemeConfig = {
  v: 1;
  preset: StoreThemePresetId;
  /** Hex, ex: #ff6600 */
  primary?: string;
  accent?: string;
  /** Google Font family name (without quotes). Ex: "Bebas Neue" */
  fontHeading?: string;
  /** Google Font family name (without quotes). Ex: "DM Sans" */
  fontBody?: string;
  /** Fulfillment options (stored here to avoid needing a DB schema change). */
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
};

export const THEME_PRESETS: Record<StoreThemePresetId, Required<Pick<StoreThemeConfig, "preset" | "primary" | "accent" | "fontHeading" | "fontBody">>> =
  {
    pizzaria: {
      preset: "pizzaria",
      primary: "#d9480f",
      accent: "#2f9e44",
      fontHeading: "Bebas Neue",
      fontBody: "DM Sans",
    },
    padaria: {
      preset: "padaria",
      primary: "#b08968",
      accent: "#2f9e44",
      fontHeading: "Playfair Display",
      fontBody: "DM Sans",
    },
    doceria: {
      preset: "doceria",
      primary: "#c2255c",
      accent: "#f08c00",
      fontHeading: "Playfair Display",
      fontBody: "DM Sans",
    },
    churrascaria: {
      preset: "churrascaria",
      primary: "#111827",
      accent: "#c92a2a",
      fontHeading: "Oswald",
      fontBody: "DM Sans",
    },
    hamburgueria: {
      preset: "hamburgueria",
      primary: "#f59f00",
      accent: "#111827",
      fontHeading: "Oswald",
      fontBody: "DM Sans",
    },
    pastelaria: {
      preset: "pastelaria",
      primary: "#2b8a3e",
      accent: "#f59f00",
      fontHeading: "Bebas Neue",
      fontBody: "DM Sans",
    },
    acai: {
      preset: "acai",
      primary: "#7b2d8e",
      accent: "#2f9e44",
      fontHeading: "Poppins",
      fontBody: "DM Sans",
    },
    sushi: {
      preset: "sushi",
      primary: "#c92a2a",
      accent: "#111827",
      fontHeading: "Noto Sans JP",
      fontBody: "DM Sans",
    },
    cafeteria: {
      preset: "cafeteria",
      primary: "#6f4e37",
      accent: "#d4a373",
      fontHeading: "Lora",
      fontBody: "DM Sans",
    },
    sorveteria: {
      preset: "sorveteria",
      primary: "#e64980",
      accent: "#22b8cf",
      fontHeading: "Quicksand",
      fontBody: "DM Sans",
    },
    petiscaria: {
      preset: "petiscaria",
      primary: "#e8590c",
      accent: "#f59f00",
      fontHeading: "Oswald",
      fontBody: "DM Sans",
    },
    marmitaria: {
      preset: "marmitaria",
      primary: "#2b8a3e",
      accent: "#f59f00",
      fontHeading: "Roboto",
      fontBody: "DM Sans",
    },
  };

export function parseThemeColorField(themeColor: string | null | undefined): {
  legacyHex?: string;
  config?: StoreThemeConfig;
} {
  const raw = String(themeColor || "").trim();
  if (!raw) return {};

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.v === 1 && typeof parsed.preset === "string") {
        return { config: parsed as StoreThemeConfig };
      }
    } catch {
      // fall through
    }
  }

  if (raw.startsWith("#") && (raw.length === 7 || raw.length === 4)) return { legacyHex: raw };
  return {};
}

export function serializeThemeConfig(config: StoreThemeConfig) {
  return JSON.stringify(config);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rr:
        h = ((gg - bb) / d) % 6;
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      case bb:
        h = (rr - gg) / d + 4;
        break;
    }
    h = h * 60;
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hexToHslString(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const hsl = rgbToHsl(rgb);
  return `${hsl.h} ${clamp(hsl.s, 0, 100)}% ${clamp(hsl.l, 0, 100)}%`;
}

export function applyThemeToDocument(opts: {
  themeColorField?: string | null;
  fallbackPrimaryHex?: string;
}) {
  const root = document.documentElement;

  const currentDefaults = {
    primary: root.style.getPropertyValue("--primary"),
    ring: root.style.getPropertyValue("--ring"),
    accent: root.style.getPropertyValue("--accent"),
    fontSans: root.style.getPropertyValue("--font-sans"),
    fontDisplay: root.style.getPropertyValue("--font-display"),
    sidebarPrimary: root.style.getPropertyValue("--sidebar-primary"),
    sidebarRing: root.style.getPropertyValue("--sidebar-ring"),
  };

  const { legacyHex, config } = parseThemeColorField(opts.themeColorField);
  const preset = config?.preset ? THEME_PRESETS[config.preset] : undefined;

  const primaryHex = config?.primary || legacyHex || preset?.primary || opts.fallbackPrimaryHex || "#f97316";
  const accentHex = config?.accent || preset?.accent || "#22c55e";

  const primaryHsl = hexToHslString(primaryHex);
  const accentHsl = hexToHslString(accentHex);
  if (primaryHsl) {
    root.style.setProperty("--primary", primaryHsl);
    root.style.setProperty("--ring", primaryHsl);
    root.style.setProperty("--sidebar-primary", primaryHsl);
    root.style.setProperty("--sidebar-ring", primaryHsl);
  }
  if (accentHsl) root.style.setProperty("--accent", accentHsl);

  const fontBody = config?.fontBody || preset?.fontBody;
  const fontHeading = config?.fontHeading || preset?.fontHeading;
  if (fontBody) root.style.setProperty("--font-sans", fontBody);
  if (fontHeading) root.style.setProperty("--font-display", fontHeading);

  // Ensure fonts are loaded (Google Fonts) – only for the chosen ones.
  const families = [fontBody, fontHeading].filter(Boolean) as string[];
  if (families.length > 0) {
    const id = "store-theme-fonts";
    const existing = document.getElementById(id) as HTMLLinkElement | null;
    const url = `https://fonts.googleapis.com/css2?${families
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700;800`)
      .join("&")}&display=swap`;

    const link = existing || document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = url;
    if (!existing) document.head.appendChild(link);
  }

  return () => {
    root.style.setProperty("--primary", currentDefaults.primary);
    root.style.setProperty("--ring", currentDefaults.ring);
    root.style.setProperty("--accent", currentDefaults.accent);
    root.style.setProperty("--font-sans", currentDefaults.fontSans);
    root.style.setProperty("--font-display", currentDefaults.fontDisplay);
    root.style.setProperty("--sidebar-primary", currentDefaults.sidebarPrimary);
    root.style.setProperty("--sidebar-ring", currentDefaults.sidebarRing);
  };
}
