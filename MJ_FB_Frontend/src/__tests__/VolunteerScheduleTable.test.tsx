import { render, screen, fireEvent } from '@testing-library/react';

describe('VolunteerScheduleTable', () => {
  it('keeps cell background color on hover', async () => {
    const { default: VolunteerScheduleTable } = await import('../components/VolunteerScheduleTable');
    const rows = [
      {
        time: '9:00 - 10:00',
        cells: [
          { content: 'Test', backgroundColor: 'rgb(228,241,228)' },
        ],
      },
    ];
    render(<VolunteerScheduleTable maxSlots={1} rows={rows} />);
    const cell = screen.getByText('Test').closest('td');
    expect(cell).toHaveStyle('background-color: rgb(228,241,228)');
    fireEvent.mouseOver(cell!.parentElement!);
    expect(cell).toHaveStyle('background-color: rgb(228,241,228)');
  });
  it('enables horizontal scrolling', async () => {
    const { default: VolunteerScheduleTable } = await import('../components/VolunteerScheduleTable');
    const rows = [
      { time: '9:00 - 10:00', cells: [{ content: '' }] },
    ];
    render(<VolunteerScheduleTable maxSlots={5} rows={rows} />);
    const container = screen.getByRole('table').parentElement as HTMLElement;
    expect(container).toHaveStyle('overflow-x: auto');
  });
});
