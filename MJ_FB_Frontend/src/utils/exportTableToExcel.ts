import writeXlsxFile from 'write-excel-file';

export async function exportTableToExcel(
  table: HTMLTableElement,
  filename: string,
): Promise<boolean> {
  const data = Array.from(table.rows).map(row =>
    Array.from(row.cells).map(cell => ({ value: cell.textContent || '' })),
  );

  try {
    await writeXlsxFile(data, { fileName: `${filename}.xlsx` });
    return true;
  } catch (err) {
    console.error('Failed to export table to Excel', err);
    return false;
  }
}
