import { render, screen } from '@testing-library/react';
import VolunteerScheduleTable from '../components/VolunteerScheduleTable';

describe('VolunteerScheduleTable', () => {
  it('handles maxSlots=0 gracefully', () => {
    render(<VolunteerScheduleTable maxSlots={0} rows={[]} />);
    expect(screen.getByText('Slot 1')).toBeInTheDocument();
    expect(screen.getByText(/No bookings\./i)).toBeInTheDocument();
  });

});
