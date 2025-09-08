import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';
import LeaveRequests from '../LeaveRequests';

const mockApprove = jest.fn((_, opts) => act(() => opts?.onSuccess?.()));
const mockReject = jest.fn((_, opts) => act(() => opts?.onSuccess?.()));

jest.mock('../../../api/leaveRequests', () => ({
  useAllLeaveRequests: () => ({
    requests: [
      {
        id: 1,
        start_date: '2024-01-02',
        end_date: '2024-01-03',
        type: 'paid',
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
  it('renders leave details and removes card after rejection', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LeaveRequests />);
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Paid/)).toBeInTheDocument();
    const rejectBtn = screen.getByRole('button', { name: 'Reject' });
    await user.click(rejectBtn);
    expect(mockReject).toHaveBeenCalledWith({ requestId: 1 }, expect.any(Object));
    await waitFor(() =>
      expect(screen.queryByText(/Jane Doe/)).not.toBeInTheDocument(),
    );
  });
});

