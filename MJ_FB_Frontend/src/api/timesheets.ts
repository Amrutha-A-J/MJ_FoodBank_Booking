import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from './client';

export interface TimesheetSummary {
  id: number;
  staff_id: number;
  start_date: string;
  end_date: string;
  submitted_at: string | null;
  approved_at: string | null;
  total_hours: number;
  expected_hours: number;
  balance_hours: number;
  ot_hours: number;
}

export interface TimesheetDay {
  id: number;
  timesheet_id: number;
  work_date: string;
  expected_hours: number;
  reg_hours: number;
  ot_hours: number;
  stat_hours: number;
  sick_hours: number;
  vac_hours: number;
  note: string | null;
  locked_by_rule: boolean;
  locked_by_leave: boolean;
}

export async function listTimesheets(): Promise<TimesheetSummary[]> {
  const res = await apiFetch(`${API_BASE}/timesheets/mine`);
  return handleResponse(res);
}

export async function listAllTimesheets(
  staffId?: number,
  year?: number,
  month?: number,
): Promise<TimesheetSummary[]> {
  const params = new URLSearchParams();
  if (staffId) params.set('staffId', String(staffId));
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  const query = params.toString();
  const url = `${API_BASE}/timesheets${query ? `?${query}` : ''}`;
  const res = await apiFetch(url);
  return handleResponse(res);
}

export async function getTimesheetDays(timesheetId: number): Promise<TimesheetDay[]> {
  const res = await apiFetch(`${API_BASE}/timesheets/${timesheetId}/days`);
  return handleResponse(res);
}

export async function updateTimesheetDay(
  timesheetId: number,
  date: string,
  data: {
    regHours: number;
    otHours: number;
    statHours: number;
    sickHours: number;
    vacHours: number;
    note?: string;
  },
): Promise<void> {
  const res = await jsonApiFetch(`${API_BASE}/timesheets/${timesheetId}/days/${date}`, {
    method: 'PATCH',
    body: data,
  });
  await handleResponse(res);
}

export async function submitTimesheet(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/timesheets/${id}/submit`, {
    method: 'POST',
  });
  await handleResponse(res);
}

export async function rejectTimesheet(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/timesheets/${id}/reject`, {
    method: 'POST',
  });
  await handleResponse(res);
}

export async function processTimesheet(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/timesheets/${id}/process`, {
    method: 'POST',
  });
  await handleResponse(res);
}

export function useTimesheets() {
  const { data, isFetching, error } = useQuery<TimesheetSummary[]>({
    queryKey: ['timesheets'],
    queryFn: listTimesheets,
  });
  return { timesheets: data ?? [], isLoading: isFetching, error };
}

export function useAllTimesheets(staffId?: number, year?: number, month?: number) {
  const { data, isFetching, error } = useQuery<TimesheetSummary[]>({
    queryKey: ['allTimesheets', staffId, year, month],
    queryFn: () => listAllTimesheets(staffId, year, month),
    enabled: staffId !== undefined,
  });
  return { timesheets: data ?? [], isLoading: isFetching, error };
}

export function useTimesheetDays(timesheetId?: number) {
  const { data, isFetching, error } = useQuery<TimesheetDay[]>({
    queryKey: ['timesheets', timesheetId, 'days'],
    queryFn: () => getTimesheetDays(timesheetId!),
    enabled: !!timesheetId,
  });
  return { days: data ?? [], isLoading: isFetching, error };
}

export function useUpdateTimesheetDay(timesheetId: number) {
  const qc = useQueryClient();
  return useMutation<
    void,
    ApiError,
    {
      date: string;
      regHours: number;
      otHours: number;
      statHours: number;
      sickHours: number;
      vacHours: number;
      note?: string;
    }
  >({
    mutationFn: ({ date, ...rest }) => updateTimesheetDay(timesheetId, date, rest),
    onSuccess: (_, { date, regHours, otHours, statHours, sickHours, vacHours, note }) => {
      qc.setQueryData<TimesheetDay[]>(
        ['timesheets', timesheetId, 'days'],
        old =>
          old?.map(d =>
            d.work_date === date
              ? {
                  ...d,
                  reg_hours: regHours,
                  ot_hours: otHours,
                  stat_hours: statHours,
                  sick_hours: sickHours,
                  vac_hours: vacHours,
                  note: note ?? null,
                }
              : d,
          ),
      );
      qc.invalidateQueries({ queryKey: ['timesheets'] });
      qc.invalidateQueries({ queryKey: ['allTimesheets'] });
    },
  });
}

export function useSubmitTimesheet() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: submitTimesheet,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['timesheets'] });
      qc.invalidateQueries({ queryKey: ['timesheets', id, 'days'] });
      qc.invalidateQueries({ queryKey: ['allTimesheets'] });
    },
  });
}

export function useRejectTimesheet() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: rejectTimesheet,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheets'] });
      qc.invalidateQueries({ queryKey: ['allTimesheets'] });
    },
  });
}

export function useProcessTimesheet() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: processTimesheet,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheets'] });
      qc.invalidateQueries({ queryKey: ['allTimesheets'] });
    },
  });
}

