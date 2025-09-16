import { waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';
import LeaveRequests from '../LeaveRequests';

const mockApprove = jest.fn((_, opts) => act(() => opts?.onSuccess?.()));
const mockReject = jest.fn((_, opts) => act(() => opts?.onSuccess?.()));

const REQUESTS = [
  {
    id: 1,
    start_date: '2024-01-02',
    end_date: '2024-01-03',
    type: 'paid',
    requester_name: 'Jane Doe',
  },
];

jest.mock('../../../api/leaveRequests', () => ({
  useAllLeaveRequests: () => ({
    requests: REQUESTS,
    isLoading: false,
    error: null,
  }),
  useApproveLeaveRequest: () => ({ mutate: mockApprove }),
  useRejectLeaveRequest: () => ({ mutate: mockReject }),
}));

describe('AdminLeaveRequests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows confirmation dialog before rejection and removes card on confirm', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<LeaveRequests />);
    const view = within(container);
    expect(view.getByText(/Jane Doe/)).toBeInTheDocument();
    const rejectBtn = view.getByRole('button', { name: 'Reject', exact: true });
    await user.click(rejectBtn);
    const dialog = within(document.body);
    expect(
      dialog.getByText('Reject leave request for Jane Doe?'),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Confirm' }));
    expect(mockReject).toHaveBeenCalledWith(
      { requestId: 1 },
      expect.any(Object),
    );
    await waitFor(() =>
      expect(view.queryByText(/Jane Doe/)).not.toBeInTheDocument(),
    );
  });

  it('closes dialog without rejecting when cancelled', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<LeaveRequests />);
    const view = within(container);
    await user.click(view.getByRole('button', { name: 'Reject', exact: true }));
    const dialog = within(document.body);
    await user.click(dialog.getByLabelText('close'));
    expect(mockReject).not.toHaveBeenCalled();
    expect(view.getByText(/Jane Doe/)).toBeInTheDocument();
  });
});

