import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';
import LeaveManagement from '../LeaveManagement';

const mockMutate = jest.fn();

jest.mock('../../../api/timesheets', () => ({
  useTimesheets: () => ({
    timesheets: [
      {
        id: 1,
        staff_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        approved_at: null,
      },
    ],
  }),
}));

jest.mock('../../../api/leaveRequests', () => ({
  useCreateLeaveRequest: () => ({ mutate: mockMutate }),
  useLeaveRequests: () => ({ requests: [], isLoading: false, error: null }),
}));

describe('LeaveManagement', () => {
  it('submits leave request', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter>
        <LeaveManagement />
      </MemoryRouter>,
    );
    await user.click(
      screen.getByRole('button', { name: /request vacation/i }),
    );
    await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
    await user.type(screen.getByLabelText(/end date/i), '2024-01-02');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(mockMutate).toHaveBeenCalledWith(
      {
        type: 'paid',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      },
      expect.any(Object),
    );
  });
});
