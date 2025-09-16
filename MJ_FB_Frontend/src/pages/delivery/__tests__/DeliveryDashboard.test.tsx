import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeliveryDashboard from '../DeliveryDashboard';
import { getEvents, type EventGroups } from '../../../api/events';

jest.mock('../../../api/events', () => ({
  getEvents: jest.fn(),
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    role: 'delivery',
    isAuthenticated: true,
    name: 'Test User',
    userRole: '',
    access: [],
    id: 123,
    login: jest.fn(),
    logout: jest.fn(),
    cardUrl: '',
    ready: true,
  }),
}));

const mockedGetEvents = getEvents as jest.MockedFunction<typeof getEvents>;

describe('DeliveryDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetEvents.mockReset();
  });

  it('shows events from the API', async () => {
    const events: EventGroups = {
      today: [
        {
          id: 1,
          title: 'Community BBQ',
          startDate: '2024-08-01',
          endDate: '2024-08-01',
          details: 'Join us for lunch',
          createdBy: 12,
          createdByName: 'Alex',
          priority: 0,
          visibleToClients: true,
        },
      ],
      upcoming: [],
      past: [],
    };
    mockedGetEvents.mockResolvedValue(events);

    render(
      <MemoryRouter>
        <DeliveryDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Community BBQ/i)).toBeInTheDocument();
  });

  it('surfaces errors in the feedback snackbar when the request fails', async () => {
    mockedGetEvents.mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter>
        <DeliveryDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Failed to load events/i)).toBeInTheDocument();
  });
});
