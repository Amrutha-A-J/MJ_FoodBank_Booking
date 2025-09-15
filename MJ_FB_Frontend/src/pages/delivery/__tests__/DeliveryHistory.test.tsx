import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import DeliveryHistory from '../DeliveryHistory';
import { theme } from '../../../theme';
import {
  apiFetch,
  handleResponse,
  getApiErrorMessage,
} from '../../../api/client';

jest.mock('../../../api/client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(),
  handleResponse: jest.fn(),
  getApiErrorMessage: jest.fn(),
}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <DeliveryHistory />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('DeliveryHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders delivery orders with status and item details', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({});
    (handleResponse as jest.Mock).mockResolvedValueOnce([
      {
        id: 42,
        status: 'pending',
        createdAt: '2024-06-05T15:45:00Z',
        scheduledFor: '2024-06-10',
        address: '123 Main St',
        phone: '306-555-0100',
        email: 'client@example.com',
        notes: 'Leave at the back door',
        items: [
          {
            itemId: 7,
            name: 'Whole wheat bread',
            quantity: 2,
            categoryId: 3,
            categoryName: 'Bakery',
          },
        ],
      },
    ]);

    renderComponent();

    expect(await screen.findByText('Order #42')).toBeInTheDocument();

    expect(apiFetch).toHaveBeenCalledWith('/api/v1/delivery/orders');
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText(/leave at the back door/i)).toBeInTheDocument();
    expect(screen.getByText(/address:/i).parentElement).toHaveTextContent(
      'Address: 123 Main St',
    );
    expect(screen.getByText(/phone:/i).parentElement).toHaveTextContent(
      'Phone: 306-555-0100',
    );
    expect(screen.getByText(/email:/i).parentElement).toHaveTextContent(
      'Email: client@example.com',
    );
    expect(screen.getByText(/scheduled for/i)).toBeInTheDocument();
    expect(screen.getByText('Whole wheat bread')).toBeInTheDocument();
    expect(
      screen.getByText('Quantity: 2 · Bakery'),
    ).toBeInTheDocument();
  });

  it('shows the empty state when there are no delivery orders', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({});
    (handleResponse as jest.Mock).mockResolvedValueOnce([]);

    renderComponent();

    expect(await screen.findByText(/no deliveries yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /book a delivery/i })).toBeInTheDocument();
  });

  it('displays an error message when loading orders fails', async () => {
    const error = new Error('Network unavailable');
    (apiFetch as jest.Mock).mockRejectedValueOnce(error);
    (getApiErrorMessage as jest.Mock).mockReturnValue('Network unavailable');

    renderComponent();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Network unavailable');
    await waitFor(() => {
      expect(handleResponse).not.toHaveBeenCalled();
    });
  });
});
