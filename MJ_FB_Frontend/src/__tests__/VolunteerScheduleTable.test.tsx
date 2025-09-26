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
  it('renders cards with fallback label on small screens', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    try {
      const onClick = jest.fn();
      const { default: VolunteerScheduleTable } = await import('../components/VolunteerScheduleTable');
      const rows = [
        {
          time: '9:00 - 10:00',
          cells: [
            { content: undefined, onClick },
          ],
        },
      ];
      render(<VolunteerScheduleTable maxSlots={2} rows={rows} />);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      const signupCell = screen.getByText('Sign up');
      fireEvent.click(signupCell);
      expect(onClick).toHaveBeenCalled();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
