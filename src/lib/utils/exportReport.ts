import { formatId, isIdKey, isRawId } from './formatId.js';

// ── CSV ────────────────────────────────────────────────────────────────────
export function exportCSV(rows: unknown[], filename: string): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0] as object).filter(k => !isIdKey(k) || true);
  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        let val = (row as Record<string, unknown>)[h];
        if (typeof val === 'string' && isIdKey(h) && isRawId(val)) {
          val = formatId(val);
        }
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    ),
  ].join('\n');

  trigger(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

// ── Excel ──────────────────────────────────────────────────────────────────
export async function exportXLSX(
  rows: unknown[],
  filename: string,
  sheetName = 'Report'
): Promise<void> {
  if (!rows.length) return;
  const XLSX = await import('xlsx');

  // Clean IDs before export
  const cleaned = rows.map(row => {
    const r = { ...(row as Record<string, unknown>) };
    for (const k of Object.keys(r)) {
      if (isIdKey(k) && typeof r[k] === 'string' && isRawId(r[k] as string)) {
        r[k] = formatId(r[k] as string);
      }
    }
    return r;
  });

  const ws = XLSX.utils.json_to_sheet(cleaned);
  const wb = XLSX.utils.book_new();

  // Column widths — auto-fit up to 40 chars
  const headers = Object.keys(cleaned[0] as object);
  ws['!cols'] = headers.map(h => ({
    wch: Math.min(
      40,
      Math.max(
        h.length + 2,
        ...cleaned.map(r => String((r as Record<string,unknown>)[h] ?? '').length)
      )
    )
  }));

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── PDF (print) ────────────────────────────────────────────────────────────
export function exportPDF(): void {
  window.print();
}

// ── Internal helper ────────────────────────────────────────────────────────
function trigger(blob: Blob, name: string): void {
  const url  = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}