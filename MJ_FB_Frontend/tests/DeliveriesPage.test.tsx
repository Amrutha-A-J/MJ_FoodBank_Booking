import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Deliveries from '../src/pages/pantry/Deliveries';
import {
  getOutstandingDeliveryOrders,
  markDeliveryOrderCompleted,
} from '../src/api/deliveryOrders';
import type { DeliveryOutstandingOrder } from '../src/types';

jest.mock('../src/api/deliveryOrders', () => ({
  getOutstandingDeliveryOrders: jest.fn(),
  markDeliveryOrderCompleted: jest.fn(),
}));

const mockOrders: DeliveryOutstandingOrder[] = [
  {
    id: 101,
    clientId: 1234,
    clientName: 'Jane Doe',
    status: 'approved',
    createdAt: '2024-08-10T15:00:00.000Z',
    scheduledFor: '2024-08-15T18:30:00.000Z',
    address: '123 Main St',
    phone: '306-555-1234',
    email: 'jane@example.com',
    notes: 'Leave at the back door.',
    items: [
      { itemId: 1, quantity: 2, name: 'Canned Beans', categoryId: 10, categoryName: 'Pantry' },
      { itemId: 2, quantity: 1, name: 'Whole Wheat Bread', categoryId: 11, categoryName: 'Bakery' },
    ],
  },
  {
    id: 102,
    clientId: 5678,
    status: 'pending',
    createdAt: '2024-08-12T12:00:00.000Z',
    scheduledFor: null,
    address: '456 Elm St',
    phone: '306-555-5678',
    email: null,
    notes: null,
    items: [],
  },
];

describe('Pantry Deliveries page', () => {
  const mockedGetOutstanding = getOutstandingDeliveryOrders as jest.MockedFunction<
    typeof getOutstandingDeliveryOrders
  >;
  const mockedMarkCompleted = markDeliveryOrderCompleted as jest.MockedFunction<
    typeof markDeliveryOrderCompleted
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetOutstanding.mockResolvedValue(mockOrders);
  });

  it('renders outstanding delivery orders with contact details and items', async () => {
    render(
      <MemoryRouter>
        <Deliveries />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Client 1234 · Jane Doe/)).toBeInTheDocument();
    expect(screen.getAllByText(/Order #:/i)).toHaveLength(2);
    expect(screen.getByText('101')).toBeInTheDocument();
    expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
    expect(screen.getByText(/306-555-1234/)).toBeInTheDocument();
    expect(screen.getByText(/2 × Canned Beans/)).toBeInTheDocument();
    expect(screen.getByText(/Bakery/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /record delivery/i })).toBeInTheDocument();
    expect(screen.getByText(/No items listed\./)).toBeInTheDocument();
  });

  it('marks a delivery as completed and removes it from the list', async () => {
    mockedMarkCompleted.mockResolvedValue();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Deliveries />
      </MemoryRouter>,
    );

    const buttons = await screen.findAllByRole('button', { name: /mark completed/i });
    await user.click(buttons[0]);

    expect(mockedMarkCompleted).toHaveBeenCalledWith(101);

    await waitFor(() => {
      expect(screen.queryByText(/Client 1234/)).not.toBeInTheDocument();
    });

    expect(await screen.findByText('Delivery marked completed.')).toBeInTheDocument();
    expect(screen.getByText(/Client 5678/)).toBeInTheDocument();
  });

  it('shows an error and keeps the order when marking completion fails', async () => {
    mockedMarkCompleted.mockRejectedValue({});
    const user = userEvent.setup();

    try {
      render(
        <MemoryRouter>
          <Deliveries />
        </MemoryRouter>,
      );

      const buttons = await screen.findAllByRole('button', { name: /mark completed/i });
      await user.click(buttons[0]);

      expect(mockedMarkCompleted).toHaveBeenCalledWith(101);

      expect(screen.getByText(/Client 1234 · Jane Doe/)).toBeInTheDocument();

      await waitFor(() => {
        expect(buttons[0]).toBeEnabled();
      });

      expect(
        await screen.findByText(
          'We could not mark this delivery as completed. Please try again.',
        ),
      ).toBeInTheDocument();
    } finally {
      mockedMarkCompleted.mockReset();
    }
  });
});
