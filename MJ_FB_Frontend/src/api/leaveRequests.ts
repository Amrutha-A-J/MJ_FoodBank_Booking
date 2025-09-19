import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from './client';

export interface LeaveRequest {
  id: number;
  timesheet_id?: number;
  work_date?: string;
  hours?: number;
  start_date?: string;
  end_date?: string;
  type?: string;
  status: 'pending' | 'approved' | 'rejected';
  requester_name?: string;
}

export async function createLeaveRequest(
  data: { type: string; startDate: string; endDate: string },
): Promise<LeaveRequest> {
  const res = await jsonApiFetch(`${API_BASE}/leave/requests`, {
    method: 'POST',
    body: data,
  });
  return handleResponse(res);
}

export async function listLeaveRequests(
  staffId: number,
): Promise<LeaveRequest[]> {
  const res = await apiFetch(
    `${API_BASE}/timesheets/leave-requests/${staffId}`,
  );
  return handleResponse(res);
}

export async function listAllLeaveRequests(): Promise<LeaveRequest[]> {
  const res = await apiFetch(`${API_BASE}/leave/requests`);
  return handleResponse(res);
}

export async function approveLeaveRequest(requestId: number): Promise<void> {
  const res = await apiFetch(
    `${API_BASE}/leave/requests/${requestId}/approve`,
    { method: 'POST' },
  );
  await handleResponse(res);
}

export async function rejectLeaveRequest(requestId: number): Promise<void> {
  const res = await apiFetch(
    `${API_BASE}/leave/requests/${requestId}/reject`,
    { method: 'POST' },
  );
  await handleResponse(res);
}

export function useLeaveRequests(staffId?: number) {
  const { data, isFetching, error } = useQuery<LeaveRequest[]>({
    queryKey: ['leaveRequests', staffId],
    queryFn: () => listLeaveRequests(staffId!),
    enabled: !!staffId,
  });
  return { requests: data ?? [], isLoading: isFetching, error };
}

export function useAllLeaveRequests() {
  const { data, isFetching, error } = useQuery<LeaveRequest[]>({
    queryKey: ['leaveRequests'],
    queryFn: listAllLeaveRequests,
  });
  return { requests: data ?? [], isLoading: isFetching, error };
}

export function useCreateLeaveRequest(timesheetId?: number) {
  const qc = useQueryClient();
  return useMutation<
    LeaveRequest,
    ApiError,
    { type: string; startDate: string; endDate: string }
  >({
    mutationFn: data => createLeaveRequest(data),
    onSuccess: () => {
      if (timesheetId) {
        qc.invalidateQueries({ queryKey: ['leaveRequests', timesheetId] });
        qc.invalidateQueries({ queryKey: ['timesheets', timesheetId, 'days'] });
      }
    },
  });
}

export function useApproveLeaveRequest() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, { requestId: number; timesheetId?: number }>({
    mutationFn: ({ requestId }) => approveLeaveRequest(requestId),
    onSuccess: (_, { timesheetId }) => {
      qc.invalidateQueries({ queryKey: ['leaveRequests'] });
      if (timesheetId) {
        qc.invalidateQueries({ queryKey: ['leaveRequests', timesheetId] });
        qc.invalidateQueries({ queryKey: ['timesheets', timesheetId, 'days'] });
      }
    },
  });
}

export function useRejectLeaveRequest() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, { requestId: number; timesheetId?: number }>({
    mutationFn: ({ requestId }) => rejectLeaveRequest(requestId),
    onSuccess: (_, { timesheetId }) => {
      qc.invalidateQueries({ queryKey: ['leaveRequests'] });
      if (timesheetId) {
        qc.invalidateQueries({ queryKey: ['leaveRequests', timesheetId] });
        qc.invalidateQueries({ queryKey: ['timesheets', timesheetId, 'days'] });
      }
    },
  });
}
