import { render, screen, fireEvent } from '@testing-library/react';
import VolunteerScheduleTable from '../../../components/VolunteerScheduleTable';

describe('VolunteerScheduleTable', () => {
  it('handles maxSlots=0 gracefully', () => {
    render(<VolunteerScheduleTable maxSlots={0} rows={[]} />);
    expect(screen.getByText('Slot 1')).toBeInTheDocument();
    expect(screen.getByText(/No bookings\./i)).toBeInTheDocument();
  });

  it('shows tooltip when provided', async () => {
    render(
      <VolunteerScheduleTable
        maxSlots={1}
        rows={[{ time: '9:00', cells: [{ content: 'A', tooltip: 'Tip text' }] }]}
      />,
    );
    fireEvent.mouseOver(screen.getByText('A'));
    expect(await screen.findByText('Tip text')).toBeInTheDocument();
  });
});
