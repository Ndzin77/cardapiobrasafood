import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { convert, getCompatibleUnits } from "@/lib/unitConversion";

interface QuantityWithUnitProps {
  /** Numeric value already expressed in `baseUnit` (storage unit). */
  valueInBaseUnit: number | null;
  /** Storage unit of the ingredient (e.g. "kg"). */
  baseUnit: string;
  /** Called with the new value already converted back to `baseUnit`. */
  onChange: (valueInBaseUnit: number) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  selectClassName?: string;
  /** Reset internal display when this key changes (e.g. after submit). */
  resetKey?: string | number;
}

/**
 * Input + unit selector. User picks any compatible unit (same family),
 * the parent always receives the value converted to `baseUnit`.
 */
export function QuantityWithUnit({
  valueInBaseUnit,
  baseUnit,
  onChange,
  placeholder = "Qtd",
  className = "",
  inputClassName = "h-9 text-xs",
  selectClassName = "h-9 w-20 text-xs",
  resetKey,
}: QuantityWithUnitProps) {
  const compatibleUnits = getCompatibleUnits(baseUnit);
  const [displayUnit, setDisplayUnit] = useState(baseUnit);
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (valueInBaseUnit == null || valueInBaseUnit === 0) return "";
    return String(valueInBaseUnit);
  });

  // When parent provides a new base value (e.g. editing a different row), refresh display.
  useEffect(() => {
    if (valueInBaseUnit == null || valueInBaseUnit === 0) {
      setDisplayValue("");
      return;
    }
    const converted = convert(valueInBaseUnit, baseUnit, displayUnit);
    if (isFinite(converted)) {
      setDisplayValue(String(converted));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueInBaseUnit, baseUnit]);

  // Reset on external key change
  useEffect(() => {
    if (resetKey !== undefined) {
      setDisplayValue("");
      setDisplayUnit(baseUnit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const handleValueChange = (raw: string) => {
    setDisplayValue(raw);
    const num = parseFloat(raw.replace(",", "."));
    if (!isFinite(num) || num < 0) {
      onChange(0);
      return;
    }
    const inBase = convert(num, displayUnit, baseUnit);
    onChange(isFinite(inBase) ? inBase : 0);
  };

  const handleUnitChange = (newUnit: string) => {
    // Convert current displayed value to the new unit so user sees same magnitude
    const num = parseFloat(displayValue.replace(",", "."));
    setDisplayUnit(newUnit);
    if (isFinite(num) && num > 0) {
      const converted = convert(num, displayUnit, newUnit);
      if (isFinite(converted)) {
        setDisplayValue(String(converted));
        const inBase = convert(converted, newUnit, baseUnit);
        onChange(isFinite(inBase) ? inBase : 0);
      }
    }
  };

  const showSelect = compatibleUnits.length > 1;

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <Input
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        value={displayValue}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder={placeholder}
        className={`flex-1 ${inputClassName}`}
      />
      {showSelect ? (
        <Select value={displayUnit} onValueChange={handleUnitChange}>
          <SelectTrigger className={selectClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {compatibleUnits.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="flex items-center px-2 text-xs text-muted-foreground border border-input rounded-md">
          {baseUnit}
        </span>
      )}
    </div>
  );
}
