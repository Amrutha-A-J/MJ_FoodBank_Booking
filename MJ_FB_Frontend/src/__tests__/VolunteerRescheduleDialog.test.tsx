import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VolunteerRescheduleDialog from '../components/VolunteerRescheduleDialog';
import { formatTime } from '../utils/time';

jest.mock('../api/volunteers', () => ({
  ...jest.requireActual('../api/volunteers'),
  getVolunteerRolesForVolunteer: jest.fn(),
}));

const { getVolunteerRolesForVolunteer } = jest.requireMock('../api/volunteers');

describe('VolunteerRescheduleDialog', () => {
  beforeAll(() => {
    window.matchMedia =
      window.matchMedia ||
      ((query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }));
  });

  beforeEach(() => {
    (getVolunteerRolesForVolunteer as jest.Mock).mockReset();
  });

  it('omits slots with no availability', async () => {
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: 'Pantry',
        start_time: '09:00:00',
        end_time: '12:00:00',
        max_volunteers: 5,
        booked: 5,
        available: 0,
        status: 'open',
        date: '2024-02-02',
        category_id: 1,
        category_name: 'Pantry',
        is_wednesday_slot: false,
      },
      {
        id: 2,
        role_id: 1,
        name: 'Pantry',
        start_time: '13:00:00',
        end_time: '16:00:00',
        max_volunteers: 5,
        booked: 3,
        available: 2,
        status: 'open',
        date: '2024-02-02',
        category_id: 1,
        category_name: 'Pantry',
        is_wednesday_slot: false,
      },
    ]);

    render(
      <VolunteerRescheduleDialog open onClose={() => {}} onSubmit={() => {}} />,
    );

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: '2024-02-02' },
    });

    fireEvent.mouseDown(await screen.findByLabelText(/role/i));

    {
      const label = `Pantry ${formatTime('13:00:00')}–${formatTime('16:00:00')}`;
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    {
      const label = `Pantry ${formatTime('09:00:00')}–${formatTime('12:00:00')}`;
      expect(screen.queryByText(label)).toBeNull();
    }
  });
});
