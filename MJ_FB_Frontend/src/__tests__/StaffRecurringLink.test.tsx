import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { AuthProvider } from '../hooks/useAuth';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = mockFetch();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 204,
    json: async () => ({}),
    headers: new Headers(),
  });
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  restoreFetch();
  jest.resetAllMocks();
});

jest.mock('../pages/volunteer-management/VolunteerManagement', () => () => <div>VolunteerManagement</div>);
jest.mock('../pages/volunteer-management/VolunteerTabs', () => () => <div>VolunteerTabs</div>);
jest.mock('../pages/volunteer-management/VolunteerRankings', () => () => <div>VolunteerRankings</div>);
jest.mock('../pages/volunteer-management/StaffRecurringBookings', () => () => <div>StaffRecurringBookings</div>);
jest.mock('../api/volunteers', () => ({
  getVolunteerBookingsForReview: jest.fn().mockResolvedValue([]),
}));

test('shows Recurring Shifts link for staff with volunteer-management access', async () => {
  localStorage.setItem('role', 'staff');
  localStorage.setItem('name', 'Test Staff');
  localStorage.setItem('access', JSON.stringify(['volunteer_management']));

  render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );

  const vmButton = await screen.findByRole('button', { name: /volunteer management/i });
  fireEvent.click(vmButton);
  expect(
    await screen.findByRole('menuitem', { name: /recurring shifts/i })
  ).toBeInTheDocument();
});
