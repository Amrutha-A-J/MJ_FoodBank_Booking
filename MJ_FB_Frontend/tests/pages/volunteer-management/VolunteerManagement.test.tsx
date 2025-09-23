import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VolunteerManagement from '../../../src/pages/volunteer-management/VolunteerManagement';
import {
  getVolunteerById,
  getVolunteerRoles,
  getVolunteerStatsById,
  getVolunteerBookingsByRoles,
} from '../../../src/api/volunteers';
import {
  renderWithProviders,
  screen,
  waitFor,
  within,
  fireEvent,
  act,
} from '../../../testUtils/renderWithProviders';
import type { VolunteerSearchResult } from '../../../src/api/volunteers';
import { useState, type ReactElement } from 'react';

jest.mock('../../../src/api/volunteers', () => ({
  getVolunteerRoles: jest.fn(),
  getVolunteerBookingsByRoles: jest.fn(),
  searchVolunteers: jest.fn(),
  getVolunteerById: jest.fn(),
  getVolunteerStatsById: jest.fn(),
  createVolunteer: jest.fn(),
  updateVolunteerTrainedAreas: jest.fn(),
  createVolunteerBookingForVolunteer: jest.fn(),
  createVolunteerShopperProfile: jest.fn(),
  removeVolunteerShopperProfile: jest.fn(),
}));

jest.mock('../../../src/components/EntitySearch', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onSelect }: { onSelect: (volunteer: any) => void }) =>
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () =>
            onSelect({
              id: 1,
              name: 'Focus Volunteer',
              firstName: 'Focus',
              lastName: 'Volunteer',
              email: 'focus@example.com',
              phone: '555-0000',
              trainedAreas: [],
              hasShopper: false,
              hasPassword: true,
            }),
        },
        'Select volunteer',
      ),
  };
});

jest.mock('../../../src/components/dashboard/Dashboard', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('div', null, 'Dashboard'),
  };
});

jest.mock('../../../src/components/VolunteerScheduleTable', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('div', null, 'VolunteerScheduleTable'),
  };
});

jest.mock('../../../src/components/ManageVolunteerShiftDialog', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('div', null),
  };
});

jest.mock('../../../src/components/VolunteerQuickLinks', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('div', null, 'VolunteerQuickLinks'),
  };
});

jest.mock('../../../src/pages/volunteer-management/BookingManagementBase', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('div', null, 'BookingManagementBase'),
  };
});

const getVolunteerRolesMock = getVolunteerRoles as jest.MockedFunction<typeof getVolunteerRoles>;
const getVolunteerByIdMock = getVolunteerById as jest.MockedFunction<typeof getVolunteerById>;
const getVolunteerStatsByIdMock = getVolunteerStatsById as jest.MockedFunction<typeof getVolunteerStatsById>;
const getVolunteerBookingsByRolesMock = getVolunteerBookingsByRoles as jest.MockedFunction<typeof getVolunteerBookingsByRoles>;

let forceRerender: (() => void) | null = null;

function App(): ReactElement {
  const [, setTick] = useState(0);
  forceRerender = () => setTick(t => t + 1);
  return (
    <MemoryRouter initialEntries={['/volunteer-management/search']}>
      <Routes>
        <Route path="/volunteer-management/:tab" element={<VolunteerManagement />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('VolunteerManagement edit dialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getVolunteerRolesMock.mockResolvedValue([
      {
        id: 1,
        name: 'Pantry Helper',
        category_id: 10,
        category_name: 'Pantry',
        max_volunteers: 2,
        shifts: [],
      },
    ] as any);
    getVolunteerBookingsByRolesMock.mockResolvedValue([]);
    const apiVolunteer: VolunteerSearchResult = {
      id: 1,
      name: 'Focus Volunteer',
      firstName: 'Focus',
      lastName: 'Volunteer',
      email: 'focus@example.com',
      phone: '555-0000',
      trainedAreas: [],
      hasShopper: false,
      hasPassword: true,
      clientId: null,
    };
    getVolunteerByIdMock.mockResolvedValue(apiVolunteer);
    getVolunteerStatsByIdMock.mockResolvedValue({
      volunteerId: 1,
      lifetime: { hours: 0, shifts: 0 },
      yearToDate: { hours: 0, shifts: 0 },
      monthToDate: { hours: 0, shifts: 0 },
    });
  });

  it('keeps focus and form values while typing through re-renders', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    await user.click(screen.getByRole('button', { name: /select volunteer/i }));

    const editButton = await screen.findByRole('button', { name: /edit/i });
    await user.click(editButton);

    const dialog = await screen.findByRole('dialog', { name: /edit volunteer/i });
    const firstNameField = within(dialog).getByLabelText(/first name/i) as HTMLInputElement;

    await waitFor(() => {
      expect(firstNameField).toHaveValue('Focus');
    });

    fireEvent.focus(firstNameField);
    fireEvent.change(firstNameField, { target: { value: 'Focused' } });

    await waitFor(() => {
      expect(firstNameField).toHaveValue('Focused');
    });

    act(() => {
      forceRerender?.();
    });

    await waitFor(() => {
      const dialogAfter = screen.getByRole('dialog', { name: /edit volunteer/i });
      const firstNameFieldAfter = within(dialogAfter).getByLabelText(/first name/i) as HTMLInputElement;
      expect(firstNameFieldAfter).toHaveValue('Focused');
      fireEvent.change(firstNameFieldAfter, { target: { value: 'FocusedMore' } });
      expect(firstNameFieldAfter).toHaveValue('FocusedMore');
    });
  });
});
