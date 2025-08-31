import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VolunteerScheduleTable from '../components/VolunteerScheduleTable';

describe('VolunteerScheduleTable', () => {
  it('handles maxSlots=0 gracefully', () => {
    render(<VolunteerScheduleTable maxSlots={0} rows={[]} />);
    expect(screen.getByText('Slot 1')).toBeInTheDocument();
    expect(screen.getByText(/No bookings\./i)).toBeInTheDocument();
  });

  it('shows custom legend in tooltip', async () => {
    const user = userEvent.setup();
    render(
      <VolunteerScheduleTable
        maxSlots={1}
        rows={[]}
        legend="Custom legend"
      />,
    );
    const icon = screen.getByTestId('HelpOutlineIcon');
    await user.hover(icon);
    expect(await screen.findByText('Custom legend')).toBeInTheDocument();
  });
});
