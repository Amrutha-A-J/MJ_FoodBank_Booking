import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookDelivery from '../BookDelivery';
import type { DeliveryCategory } from '../../../types';
import { apiFetch, handleResponse } from '../../../api/client';

jest.mock('../../../api/client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(),
  handleResponse: jest.fn(),
  getApiErrorMessage: jest.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Request failed',
  ),
}));

const mockCategories: DeliveryCategory[] = [
  {
    id: 1,
    name: 'Pantry Staples',
    limit: 2,
    items: [
      { id: 10, categoryId: 1, name: 'Cereal' },
      { id: 11, categoryId: 1, name: 'Pasta' },
      { id: 12, categoryId: 1, name: 'Rice' },
    ],
  },
];

describe('BookDelivery', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockClear();
    (handleResponse as jest.Mock).mockClear();
    (apiFetch as jest.Mock).mockResolvedValue(
      new Response(null, { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
  });

  test('disables unchecked items when category limit reached', async () => {
    (handleResponse as jest.Mock).mockResolvedValueOnce(mockCategories);

    render(
      <MemoryRouter>
        <BookDelivery />
      </MemoryRouter>,
    );

    const cereal = await screen.findByRole('checkbox', { name: /cereal/i });
    const pasta = screen.getByRole('checkbox', { name: /pasta/i });
    const rice = screen.getByRole('checkbox', { name: /rice/i });

    fireEvent.click(cereal);
    fireEvent.click(pasta);
    expect(rice).toBeDisabled();
    fireEvent.click(cereal);
    expect(rice).not.toBeDisabled();
  });

  test('submits selections with contact information', async () => {
    (handleResponse as jest.Mock)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <BookDelivery />
      </MemoryRouter>,
    );

    const cereal = await screen.findByRole('checkbox', { name: /cereal/i });
    fireEvent.click(cereal);

    fireEvent.change(screen.getByLabelText(/delivery address/i), {
      target: { value: '123 Main Street' },
    });
    fireEvent.change(screen.getByLabelText(/phone number/i), {
      target: { value: '306-555-0100' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'test@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit delivery request/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));

    const postCall = (apiFetch as jest.Mock).mock.calls[1];
    expect(postCall[0]).toBe('/api/v1/delivery/orders');
    expect(postCall[1]).toMatchObject({ method: 'POST' });
    const body = JSON.parse(postCall[1].body);
    expect(body).toEqual({
      address: '123 Main Street',
      phone: '306-555-0100',
      email: 'test@example.com',
      items: [{ itemId: 10, quantity: 1 }],
    });

    expect(await screen.findByText(/delivery request submitted/i)).toBeInTheDocument();
  });
});
