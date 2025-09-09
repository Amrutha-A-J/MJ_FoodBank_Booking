import { render, screen, fireEvent } from '@testing-library/react';
import VolunteerScheduleTable from '../components/VolunteerScheduleTable';

describe('VolunteerScheduleTable', () => {
  it('keeps cell background color on hover', () => {
    const rows = [
      {
        time: '9:00 - 10:00',
        cells: [
          {
            content: 'Test',
            backgroundColor: 'rgb(228,241,228)',
          },
        ],
      },
    ];
    render(<VolunteerScheduleTable maxSlots={1} rows={rows} />);
    const cell = screen.getByText('Test').closest('td');
    expect(cell).toHaveStyle('background-color: rgb(228,241,228)');
    fireEvent.mouseOver(cell!.parentElement!); // hover the row
    expect(cell).toHaveStyle('background-color: rgb(228,241,228)');
  });
});
