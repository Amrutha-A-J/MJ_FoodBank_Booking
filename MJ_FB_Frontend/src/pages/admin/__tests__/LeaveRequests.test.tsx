import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';
import LeaveRequests from '../LeaveRequests';

const mockApprove = jest.fn();
const mockReject = jest.fn();

jest.mock('../../../api/leaveRequests', () => ({
  useAllLeaveRequests: () => ({
    requests: [
      {
        id: 1,
        work_date: '2024-01-02',
        hours: 8,
        timesheet_id: 1,
        requester_name: 'Jane Doe',
      },
    ],
    isLoading: false,
    error: null,
  }),
  useApproveLeaveRequest: () => ({ mutate: mockApprove }),
  useRejectLeaveRequest: () => ({ mutate: mockReject }),
}));

describe('AdminLeaveRequests', () => {
  it('renders requester name and action buttons', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LeaveRequests />);
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    const rejectBtn = screen.getByRole('button', { name: 'Reject' });
    await user.click(rejectBtn);
    expect(mockReject).toHaveBeenCalledWith({ requestId: 1, timesheetId: 1 });
  });
});

