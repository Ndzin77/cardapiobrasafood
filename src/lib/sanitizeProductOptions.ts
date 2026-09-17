import { ProductOption } from "@/types/store";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Removes disabled/empty option groups and choices to avoid blank entries in the UI.
 * This is defensive because options come from JSON and may contain placeholder rows.
 */
export function sanitizeProductOptions(raw: unknown): ProductOption[] {
  if (!Array.isArray(raw)) return [];

  return (raw as ProductOption[])
    .filter((opt) => !!opt && (opt as any).enabled !== false)
    .filter((opt) => isNonEmptyString((opt as any).name))
    .map((opt) => {
      const choices = Array.isArray((opt as any).choices) ? (opt as any).choices : [];
      const cleanChoices = choices
        .filter((c: any) => !!c && c.enabled !== false)
        .filter((c: any) => isNonEmptyString(c.name));

      return {
        ...opt,
        name: (opt as any).name.trim(),
        choices: cleanChoices.map((c: any) => ({
          ...c,
          name: c.name.trim(),
          allow_multiple: c.allow_multiple === true,
          max_qty: Number.isFinite(Number(c.max_qty)) && Number(c.max_qty) > 0 ? Number(c.max_qty) : undefined,
          min_qty: Number.isFinite(Number(c.min_qty)) && Number(c.min_qty) > 0 ? Number(c.min_qty) : undefined,
        })),
      } as ProductOption;
    })
    .filter((opt) => opt.choices.length > 0);
}

