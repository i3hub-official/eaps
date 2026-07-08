// src/lib/utils/date.ts
import { format as formatDateFns } from 'date-fns';

export function format(
	date: Date | string | number,
	pattern = 'PPP'
): string {
	const value = date instanceof Date ? date : new Date(date);

	if (Number.isNaN(value.getTime())) {
		return '';
	}

	return formatDateFns(value, pattern);
}