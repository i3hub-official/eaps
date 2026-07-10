// src/lib/utils/decimal.ts

import { Decimal } from "decimal.js";

// This utility function is used to convert a number to a Decimal instance from the Prisma library.
// It ensures that the number is properly formatted as a Decimal, which is important for database operations
// that require precise decimal representation, such as financial calculations.


export function toDecimal(value: number): Decimal {
	return new Decimal(value)
}

export function fromDecimal(decimal: Decimal): number {
	return decimal.toNumber()
}


