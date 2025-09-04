import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';
import AdminLeaveRequests from '../LeaveRequests';

const mockApprove = jest.fn();
const mockReject = jest.fn();

jest.mock('../../../api/leaveRequests', () => ({
  useAllLeaveRequests: () => ({
    requests: [
      {
        id: 1,
        timesheet_id: 2,
        work_date: '2024-01-01',
        hours: 8,
        status: 'pending',
        staff_name: 'Jane Doe',
      },
    ],
    isLoading: false,
    error: null,
  }),
  useApproveLeaveRequest: () => ({ mutate: mockApprove }),
  useRejectLeaveRequest: () => ({ mutate: mockReject }),
}));

describe('AdminLeaveRequests', () => {
  beforeEach(() => {
    mockApprove.mockClear();
    mockReject.mockClear();
  });

  it('renders requester name and handles approve and reject', async () => {
    renderWithProviders(<AdminLeaveRequests />);

    expect(await screen.findByText('Jane Doe', { exact: false })).toBeInTheDocument();

    const approveBtn = screen.getByRole('button', { name: /approve/i });
    const rejectBtn = screen.getByRole('button', { name: /reject/i });

    await userEvent.click(approveBtn);
    expect(mockApprove).toHaveBeenCalledWith({ requestId: 1, timesheetId: 2 });

    await userEvent.click(rejectBtn);
    expect(mockReject).toHaveBeenCalledWith({ requestId: 1, timesheetId: 2 });
  });
});
