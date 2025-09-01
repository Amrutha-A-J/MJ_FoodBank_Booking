import { render, screen } from '@testing-library/react';
import VolunteerScheduleTable from '../components/VolunteerScheduleTable';
import i18n from '../i18n';

describe('VolunteerScheduleTable', () => {
  it('handles maxSlots=0 gracefully', () => {
    render(<VolunteerScheduleTable maxSlots={0} rows={[]} />);
    expect(screen.getByText('Slot 1')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('no_bookings'))).toBeInTheDocument();
  });

});
