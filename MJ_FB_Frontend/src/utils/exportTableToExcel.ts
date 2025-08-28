import writeXlsxFile from 'write-excel-file';

export function exportTableToExcel(table: HTMLTableElement, filename: string) {
  const data = Array.from(table.rows).map((row) =>
    Array.from(row.cells).map((cell) => ({ value: cell.textContent || '' }))
  );

  void writeXlsxFile(data, { fileName: `${filename}.xlsx` });
}
