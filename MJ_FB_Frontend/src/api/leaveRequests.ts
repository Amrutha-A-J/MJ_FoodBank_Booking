import { API_BASE, apiFetch, handleResponse } from './client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from './client';

export interface LeaveRequest {
  id: number;
  staff_id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
}

export async function listLeaveRequests(): Promise<LeaveRequest[]> {
  const res = await apiFetch(`${API_BASE}/leave/requests`);
  return handleResponse(res);
}

export async function createLeaveRequest(data: {
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<LeaveRequest> {
  const res = await apiFetch(`${API_BASE}/leave/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function approveLeaveRequest(id: number): Promise<LeaveRequest> {
  const res = await apiFetch(`${API_BASE}/leave/requests/${id}/approve`, { method: 'POST' });
  return handleResponse(res);
}

export async function rejectLeaveRequest(id: number): Promise<LeaveRequest> {
  const res = await apiFetch(`${API_BASE}/leave/requests/${id}/reject`, { method: 'POST' });
  return handleResponse(res);
}

export async function cancelLeaveRequest(id: number): Promise<LeaveRequest> {
  const res = await apiFetch(`${API_BASE}/leave/requests/${id}/cancel`, { method: 'POST' });
  return handleResponse(res);
}

export function useLeaveRequests() {
  const { data, isFetching, error } = useQuery<LeaveRequest[]>({
    queryKey: ['leave-requests'],
    queryFn: listLeaveRequests,
  });
  return { requests: data ?? [], isLoading: isFetching, error };
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation<LeaveRequest, ApiError, { startDate: string; endDate: string; reason?: string }>({
    mutationFn: createLeaveRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });
}

export function useApproveLeaveRequest() {
  const qc = useQueryClient();
  return useMutation<LeaveRequest, ApiError, number>({
    mutationFn: approveLeaveRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  });
}

export function useRejectLeaveRequest() {
  const qc = useQueryClient();
  return useMutation<LeaveRequest, ApiError, number>({
    mutationFn: rejectLeaveRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  });
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient();
  return useMutation<LeaveRequest, ApiError, number>({
    mutationFn: cancelLeaveRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  });
}
