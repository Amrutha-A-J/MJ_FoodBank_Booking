import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeliveryHistory from '../DeliveryHistory';

jest.mock('../../../api/client', () => {
  const actual = jest.requireActual('../../../api/client');
  return {
    ...actual,
    apiFetch: jest.fn(),
    handleResponse: jest.fn(),
    getApiErrorMessage: jest.fn(),
  };
});

import { theme } from '../../../theme';
import type { DeliveryOrder } from '../../../types';
import {
  API_BASE,
  apiFetch,
  handleResponse,
  getApiErrorMessage,
} from '../../../api/client';

describe('DeliveryHistory', () => {
  const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;
  const mockedHandleResponse = handleResponse as jest.MockedFunction<typeof handleResponse>;
  const mockedGetApiErrorMessage = getApiErrorMessage as jest.MockedFunction<typeof getApiErrorMessage>;

  beforeEach(() => {
    jest.resetAllMocks();
    mockedGetApiErrorMessage.mockImplementation((_, fallback) => fallback);
  });

  it('cancels a pending delivery request and refreshes the list', async () => {
    const initialOrders = [
      {
        id: 1,
        status: 'pending' as const,
        createdAt: '2024-07-10T15:00:00Z',
        scheduledFor: null,
        address: '123 Main St',
        phone: '555-0000',
        email: 'client@example.com',
        notes: null,
        items: [],
      },
    ];
    const cancelledOrders = [
      {
        ...initialOrders[0],
        status: 'cancelled' as const,
      },
    ];

    mockedApiFetch
      .mockResolvedValueOnce({} as Response)
      .mockResolvedValueOnce({} as Response)
      .mockResolvedValueOnce({} as Response);

    mockedHandleResponse
      .mockResolvedValueOnce(initialOrders)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(cancelledOrders);

    render(<DeliveryHistory />);

    expect(await screen.findByText('Order #1')).toBeInTheDocument();
    const cancelButton = screen.getByRole('button', { name: /cancel request/i });

    await userEvent.click(cancelButton);

  it('shows a fallback label when a delivery status is missing', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({});
    (handleResponse as jest.Mock).mockResolvedValueOnce([
      {
        id: 101,
        status: undefined,
        createdAt: '2024-06-01T12:00:00Z',
        scheduledFor: null,
        address: '456 Oak Ave',
        phone: '306-555-0199',
        email: null,
        notes: null,
        items: [
          {
            itemId: 11,
            name: 'Milk',
            quantity: 1,
            categoryId: 5,
            categoryName: null,
          },
        ],
      } as unknown as DeliveryOrder,
    ]);

    renderComponent();

    expect(await screen.findByText('Order #101')).toBeInTheDocument();
    expect(screen.getByText('Status Unknown')).toBeInTheDocument();
  });

  it('displays an error message when loading orders fails', async () => {
    const error = new Error('Network unavailable');
    (apiFetch as jest.Mock).mockRejectedValueOnce(error);
    (getApiErrorMessage as jest.Mock).mockReturnValue('Network unavailable');

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenNthCalledWith(2, `${API_BASE}/delivery/orders/1/cancel`, {
        method: 'POST',
      });
    });

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenNthCalledWith(3, `${API_BASE}/delivery/orders`);
    });

    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(await screen.findByText('Delivery request cancelled.')).toBeInTheDocument();
  });
});
