type TemplateVars = Record<string, string | number | null | undefined>;

/**
 * Apply a simple template replacement using {var} placeholders.
 * - Unknown placeholders are kept as-is.
 * - Null/undefined become empty string.
 */
export function applyWhatsAppTemplate(template: string, vars: TemplateVars) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (full, key: string) => {
    if (!(key in vars)) return full;
    const value = vars[key];
    if (value === null || value === undefined) return "";
    return String(value);
  });
}

export function encodeWhatsAppText(text: string) {
  // WhatsApp uses URL query string; keep it strict.
  return encodeURIComponent(text);
}

export function sanitizeWhatsAppNumber(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

export function clampText(text: string, maxLen: number) {
  const clean = String(text ?? "");
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen);
}
