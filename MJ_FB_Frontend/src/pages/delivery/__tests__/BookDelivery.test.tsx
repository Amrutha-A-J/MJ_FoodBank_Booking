import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookDelivery from '../BookDelivery';
import type { DeliveryCategory } from '../../../types';
import { apiFetch, handleResponse } from '../../../api/client';
import { getUserProfile } from '../../../api/users';

const mockUseAuth = jest.fn();
const mockGetUserProfile = getUserProfile as jest.Mock;

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../../api/client', () => ({
  API_BASE: '/api/v1',
  apiFetch: jest.fn(),
  handleResponse: jest.fn(),
  getApiErrorMessage: jest.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Request failed',
  ),
}));

jest.mock('../../../api/users', () => ({
  getUserProfile: jest.fn(),
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

const mockProfile = {
  firstName: 'Test',
  lastName: 'User',
  email: 'prefill@example.com',
  phone: '306-555-0199',
  address: '321 Default Ave',
  role: 'delivery' as const,
  clientId: 321,
};

function renderPage() {
  render(
    <MemoryRouter>
      <BookDelivery />
    </MemoryRouter>,
  );
}

describe('BookDelivery', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockClear();
    (handleResponse as jest.Mock).mockReset();
    (handleResponse as jest.Mock).mockResolvedValue(mockCategories);
    mockGetUserProfile.mockReset();
    (apiFetch as jest.Mock).mockResolvedValue(
      new Response(null, { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    mockGetUserProfile.mockResolvedValue(mockProfile);
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({
      id: mockProfile.clientId,
      isAuthenticated: true,
      role: 'delivery',
      name: 'Test User',
      userRole: '',
      access: [],
      login: jest.fn(),
      logout: jest.fn(),
      cardUrl: '',
      ready: true,
    });
  });

  test('disables unchecked items when category limit reached', async () => {
    renderPage();

    const cereal = await screen.findByRole('checkbox', { name: /cereal/i });
    const pasta = screen.getByRole('checkbox', { name: /pasta/i });
    const rice = screen.getByRole('checkbox', { name: /rice/i });

    fireEvent.click(cereal);
    fireEvent.click(pasta);
    expect(rice).toBeDisabled();
    fireEvent.click(cereal);
    expect(rice).not.toBeDisabled();
  });

  test('prefills contact fields from the user profile', async () => {
    renderPage();

    expect(await screen.findByDisplayValue(mockProfile.address)).toBeInTheDocument();
    const phoneField = screen.getByLabelText(/^phone number$/i) as HTMLInputElement;
    expect(phoneField).toHaveValue(mockProfile.phone);
    const emailField = screen.getByLabelText(/^email$/i) as HTMLInputElement;
    expect(emailField).toHaveValue(mockProfile.email);
    const addressField = screen.getByLabelText(/delivery address/i) as HTMLInputElement;
    expect(addressField).toHaveAttribute('readonly');
    expect(
      screen.getByRole('button', { name: /edit contact info/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/address is correct/i)).not.toBeChecked();
    expect(screen.getByLabelText(/phone number is correct/i)).not.toBeChecked();
    expect(screen.getByLabelText(/email is correct/i)).not.toBeChecked();
  });

  test('enables contact editing when profile contact info is missing', async () => {
    mockGetUserProfile.mockResolvedValue({
      ...mockProfile,
      email: '',
    });

    renderPage();

    const addressField = await screen.findByLabelText(/delivery address/i);
    const phoneField = screen.getByLabelText(/^phone number$/i);
    const emailField = screen.getByLabelText(/^email$/i);

    expect(addressField).not.toHaveAttribute('readonly');
    expect(phoneField).not.toHaveAttribute('readonly');
    expect(emailField).not.toHaveAttribute('readonly');
    expect(
      screen.queryByRole('button', { name: /edit contact info/i }),
    ).not.toBeInTheDocument();

    fireEvent.change(emailField, { target: { value: 'updated@example.com' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /done editing/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /done editing/i }));
    expect(addressField).toHaveAttribute('readonly');
    expect(phoneField).toHaveAttribute('readonly');
    expect(emailField).toHaveAttribute('readonly');
    expect(
      screen.getByRole('button', { name: /edit contact info/i }),
    ).toBeInTheDocument();
  });

  test('requires confirming contact information before enabling submission', async () => {
    renderPage();

    const submitButton = await screen.findByRole('button', {
      name: /submit delivery request/i,
    });
    const addressConfirm = screen.getByLabelText(/address is correct/i);
    const phoneConfirm = screen.getByLabelText(/phone number is correct/i);
    const emailConfirm = screen.getByLabelText(/email is correct/i);

    expect(submitButton).toBeDisabled();

    fireEvent.click(addressConfirm);
    expect(submitButton).toBeDisabled();

    fireEvent.click(phoneConfirm);
    expect(submitButton).toBeDisabled();

    fireEvent.click(emailConfirm);
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(phoneConfirm);
    expect(submitButton).toBeDisabled();
  });

  test('allows editing contact fields and resets confirmation', async () => {
    renderPage();

    const submitButton = await screen.findByRole('button', {
      name: /submit delivery request/i,
    });
    const addressConfirm = screen.getByLabelText(/address is correct/i);
    const phoneConfirm = screen.getByLabelText(/phone number is correct/i);
    const emailConfirm = screen.getByLabelText(/email is correct/i);

    fireEvent.click(addressConfirm);
    fireEvent.click(phoneConfirm);
    fireEvent.click(emailConfirm);
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /edit contact info/i }));
    const addressField = screen.getByLabelText(/delivery address/i) as HTMLInputElement;
    expect(addressField).not.toHaveAttribute('readonly');
    expect(addressConfirm).not.toBeChecked();
    expect(phoneConfirm).not.toBeChecked();
    expect(emailConfirm).not.toBeChecked();
    expect(submitButton).toBeDisabled();

    fireEvent.change(addressField, { target: { value: '456 New Street' } });
    expect(addressConfirm).not.toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /done editing/i }));
    expect(addressField).toHaveAttribute('readonly');
    expect(
      screen.getByRole('button', { name: /edit contact info/i }),
    ).toBeInTheDocument();
  });

  test('submits updated contact information in delivery payload', async () => {
    (handleResponse as jest.Mock)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce({});

    renderPage();

    const cereal = await screen.findByRole('checkbox', { name: /cereal/i });
    fireEvent.click(cereal);

    fireEvent.click(screen.getByRole('button', { name: /edit contact info/i }));
    fireEvent.change(screen.getByLabelText(/delivery address/i), {
      target: { value: ' 456 New Street ' },
    });
    fireEvent.change(screen.getByLabelText(/^phone number$/i), {
      target: { value: ' 306-555-2222 ' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: ' new@example.com ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /done editing/i }));

    fireEvent.click(screen.getByLabelText(/address is correct/i));
    fireEvent.click(screen.getByLabelText(/phone number is correct/i));
    fireEvent.click(screen.getByLabelText(/email is correct/i));

    fireEvent.click(screen.getByRole('button', { name: /submit delivery request/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));

    const postCall = (apiFetch as jest.Mock).mock.calls[1];
    expect(postCall[0]).toBe('/api/v1/delivery/orders');
    expect(postCall[1]).toMatchObject({ method: 'POST' });
    const body = JSON.parse(postCall[1].body);
    expect(body).toEqual({
      clientId: mockProfile.clientId,
      address: '456 New Street',
      phone: '306-555-2222',
      email: 'new@example.com',
      selections: [{ itemId: 10, quantity: 1 }],
    });

    expect(await screen.findByText(/delivery request submitted/i)).toBeInTheDocument();
  });

  test('shows an error when the client id is unavailable', async () => {
    mockUseAuth.mockReturnValue({
      id: null,
      isAuthenticated: true,
      role: 'delivery',
      name: 'Test User',
      userRole: '',
      access: [],
      login: jest.fn(),
      logout: jest.fn(),
      cardUrl: '',
      ready: true,
    });

    renderPage();

    await screen.findByDisplayValue(mockProfile.address);
    fireEvent.click(screen.getByLabelText(/address is correct/i));
    fireEvent.click(screen.getByLabelText(/phone number is correct/i));
    fireEvent.click(screen.getByLabelText(/email is correct/i));

    fireEvent.click(screen.getByRole('button', { name: /submit delivery request/i }));

    expect(
      await screen.findByText(/we could not confirm your account. please sign in again./i),
    ).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
