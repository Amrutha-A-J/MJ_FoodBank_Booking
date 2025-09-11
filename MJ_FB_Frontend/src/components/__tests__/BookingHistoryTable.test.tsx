import BookingHistoryTable, { type BookingHistoryItem } from '../BookingHistoryTable';
import { renderWithProviders, screen, fireEvent } from '../../../testUtils/renderWithProviders';

describe('BookingHistoryTable', () => {
  const row: BookingHistoryItem = {
    id: 1,
    date: '2024-01-01',
    start_time: '09:00:00',
    end_time: '10:00:00',
    status: 'approved',
    role_name: 'Greeter',
    recurring_id: 2,
    staff_note: 'Checked in',
  };

  it('renders columns and triggers actions', () => {
    const onCancel = jest.fn();
    const onReschedule = jest.fn();
    const onCancelSeries = jest.fn();
    renderWithProviders(
      <BookingHistoryTable
        rows={[row]}
        showRole
        showStaffNotes
        onCancel={onCancel}
        onReschedule={onReschedule}
        onCancelSeries={onCancelSeries}
      />
    );
    expect(screen.getByText('Greeter')).toBeInTheDocument();
    expect(screen.getByText('Checked in')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledWith(row);
    fireEvent.click(screen.getByText('Reschedule'));
    expect(onReschedule).toHaveBeenCalledWith(row);
    fireEvent.click(screen.getByText('Cancel all upcoming'));
    expect(onCancelSeries).toHaveBeenCalledWith(2);
  });
});

