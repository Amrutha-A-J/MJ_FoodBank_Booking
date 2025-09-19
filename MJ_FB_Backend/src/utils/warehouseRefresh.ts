import { refreshWarehouseOverall } from '../controllers/warehouse/warehouseOverallController';
import { reginaStartOfDayISO } from './dateUtils';

function getYearMonth(date: string | Date) {
  const dt = new Date(reginaStartOfDayISO(date));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
  };
}

export async function refreshWarehouseForDate(date: string | Date) {
  const { year, month } = getYearMonth(date);
  await refreshWarehouseOverall(year, month);
}

export async function refreshWarehouseForDateChange(
  newDate: string | Date,
  oldDate?: string | Date | null,
) {
  const { year: newYear, month: newMonth } = getYearMonth(newDate);
  await refreshWarehouseOverall(newYear, newMonth);

  if (!oldDate) {
    return;
  }

  const { year: oldYear, month: oldMonth } = getYearMonth(oldDate);
  if (oldYear === newYear && oldMonth === newMonth) {
    return;
  }

  await refreshWarehouseOverall(oldYear, oldMonth);
}
