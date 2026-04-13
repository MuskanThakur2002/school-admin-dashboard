/**
 * CSV export utility — generates and downloads CSV files from report data.
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number;
}

export function generateCsv<T>(columns: CsvColumn<T>[], data: T[]): string {
  const escape = (val: string | number) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => escape(c.header)).join(',');
  const rows = data.map((row) =>
    columns.map((c) => escape(c.accessor(row))).join(','),
  );

  return [header, ...rows].join('\n');
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
