import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';
import LeaveManagement from '../LeaveManagement';
import { MemoryRouter } from 'react-router-dom';

const mockCreate = jest.fn();

jest.mock('../../../api/leaveRequests', () => ({
  useCreateLeaveRequest: () => ({ mutate: mockCreate }),
  useLeaveRequests: () => ({ requests: [], isLoading: false, error: null }),
}));

jest.mock('../../../api/timesheets', () => ({
  useTimesheets: () => ({
    timesheets: [
      {
        id: 1,
        staff_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        submitted_at: null,
        approved_at: null,
        total_hours: 0,
        expected_hours: 0,
        balance_hours: 0,
        ot_hours: 0,
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

describe('LeaveManagement', () => {
  it('submits a vacation request', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter>
        <LeaveManagement />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Request Vacation' }));
    await user.selectOptions(screen.getByLabelText('Type'), 'paid');
    await user.type(screen.getByLabelText('Start Date'), '2024-06-01');
    await user.type(screen.getByLabelText('End Date'), '2024-06-02');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(mockCreate).toHaveBeenCalledWith({
      type: 'paid',
      start: '2024-06-01',
      end: '2024-06-02',
    }, expect.anything());
  });
});
