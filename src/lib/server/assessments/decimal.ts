// src/lib/server/assessments/decimal.ts
// Shared Decimal helpers for marks/grade computation.
// Keeps rounding + conversion rules consistent across the assessment engine.

import { Decimal } from 'decimal.js'

// Marks/percentages are always stored/compared to 2dp, half-up rounding.
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export type Decimalish = Decimal | number | string | null | undefined

/** Coerce any Prisma Decimal / string / number / Decimal into a decimal.js Decimal. Null/undefined → 0. */
export function toDecimal(value: Decimalish): Decimal {
  if (value == null) return new Decimal(0)
  if (value instanceof Decimal) return value
  return new Decimal(value.toString())
}

/** Round to 2dp and return a plain JS number, suitable for JSON responses / non-money-critical reads. */
export function toRoundedNumber(value: Decimalish, dp = 2): number {
  return toDecimal(value).toDecimalPlaces(dp).toNumber()
}

/** Sum a list of decimal-ish values, returning a Decimal (not yet rounded). */
export function sumDecimals(values: Decimalish[]): Decimal {
  return values.reduce((acc: Decimal, v) => acc.plus(toDecimal(v)), new Decimal(0))
}

/** obtained / possible * scale, rounded to 2dp. Returns 0 if possible <= 0 (avoids div-by-zero). */
export function normalizeMarks(
  obtained: Decimalish,
  possible: Decimalish,
  scale: Decimalish,
  dp = 2,
): Decimal {
  const possibleD = toDecimal(possible)
  if (possibleD.lessThanOrEqualTo(0)) return new Decimal(0)
  return toDecimal(obtained).div(possibleD).mul(toDecimal(scale)).toDecimalPlaces(dp)
}

/** obtained / total * 100, rounded to 2dp. Returns 0 if total <= 0. */
export function toPercentage(obtained: Decimalish, total: Decimalish, dp = 2): Decimal {
  const totalD = toDecimal(total)
  if (totalD.lessThanOrEqualTo(0)) return new Decimal(0)
  return toDecimal(obtained).div(totalD).mul(100).toDecimalPlaces(dp)
}

/** Clamp a decimal between [min, max] — e.g. guarding against negative or >100% edge cases. */
export function clampDecimal(value: Decimalish, min: Decimalish, max: Decimalish): Decimal {
  const d = toDecimal(value)
  const minD = toDecimal(min)
  const maxD = toDecimal(max)
  if (d.lessThan(minD)) return minD
  if (d.greaterThan(maxD)) return maxD
  return d
}