import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import RecordDelivery from '../../../src/pages/pantry/RecordDelivery';
import { theme } from '../../../src/theme';
import { searchUsers, getUserByClientId } from '../../../src/api/users';
import { createDeliveryOrder } from '../../../src/api/deliveryOrders';
import { useDeliveryCategories } from '../../../src/utils/deliveryCategories';

jest.mock('../../../src/api/users', () => ({
  searchUsers: jest.fn(),
  getUserByClientId: jest.fn(),
}));

jest.mock('../../../src/api/deliveryOrders', () => ({
  createDeliveryOrder: jest.fn(),
}));

jest.mock('../../../src/utils/deliveryCategories', () => {
  const actual = jest.requireActual('../../../src/utils/deliveryCategories');
  return {
    ...actual,
    useDeliveryCategories: jest.fn(),
  };
});

jest.mock('../../../src/components/PantryQuickLinks', () => () => (
  <div data-testid="pantry-quick-links" />
));

jest.mock('../../../src/components/layout/MainLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
  usePageTitle: jest.fn(),
  useBreadcrumbActions: jest.fn(),
}));

const snackbarMessages: { message: string; severity: 'success' | 'error' }[] = [];

jest.mock('../../../src/components/FeedbackSnackbar', () => {
  const React = require('react');
  const { createPortal } = require('react-dom');
  return {
    __esModule: true,
    default: ({
      open,
      message,
      severity,
    }: {
      open: boolean;
      message: string;
      severity: 'success' | 'error';
    }) =>
      open
        ? (() => {
            snackbarMessages.push({ message, severity });
            return createPortal(
              React.createElement(
                'div',
                { role: 'alert', 'data-severity': severity },
                message,
              ),
              document.body,
            );
          })()
        : null,
  };
});

jest.setTimeout(15000);

describe('RecordDelivery page', () => {
  const categories = [
    {
      id: 1,
      name: 'Pantry Staples',
      description: null,
      limit: 2,
      maxItems: null,
      maxSelections: null,
      limitPerOrder: null,
      items: [
        {
          id: 11,
          categoryId: 1,
          name: 'Canned beans',
          description: null,
          maxQuantity: null,
          maxPerOrder: null,
          unit: null,
        },
        {
          id: 12,
          categoryId: 1,
          name: 'Pasta',
          description: null,
          maxQuantity: null,
          maxPerOrder: null,
          unit: null,
        },
      ],
    },
    {
      id: 2,
      name: 'Fresh Produce',
      description: null,
      limit: 2,
      maxItems: null,
      maxSelections: null,
      limitPerOrder: null,
      items: [
        {
          id: 21,
          categoryId: 2,
          name: 'Apples',
          description: null,
          maxQuantity: null,
          maxPerOrder: null,
          unit: null,
        },
        {
          id: 22,
          categoryId: 2,
          name: 'Carrots',
          description: null,
          maxQuantity: null,
          maxPerOrder: null,
          unit: null,
        },
      ],
    },
  ];

  const searchResult = {
    client_id: 123,
    name: 'Jane Doe',
    phone: '306-555-0101',
    email: 'jane@example.com',
  } as const;

  const userProfile = {
    clientId: searchResult.client_id,
    address: '123 Main St',
    phone: searchResult.phone,
    email: searchResult.email,
  } as const;

  const renderPage = () =>
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <RecordDelivery />
        </ThemeProvider>
      </MemoryRouter>,
    );

  const searchUsersMock = searchUsers as jest.MockedFunction<typeof searchUsers>;
  const getUserByClientIdMock =
    getUserByClientId as jest.MockedFunction<typeof getUserByClientId>;
  const createDeliveryOrderMock =
    createDeliveryOrder as jest.MockedFunction<typeof createDeliveryOrder>;
  const useDeliveryCategoriesMock =
    useDeliveryCategories as jest.MockedFunction<typeof useDeliveryCategories>;

  beforeEach(() => {
    jest.clearAllMocks();
    snackbarMessages.length = 0;

    useDeliveryCategoriesMock.mockReturnValue({
      categories,
      loading: false,
      error: '',
      reload: jest.fn(),
      clearError: jest.fn(),
    });

    searchUsersMock.mockResolvedValue([searchResult] as any);
    getUserByClientIdMock.mockResolvedValue(userProfile as any);
    createDeliveryOrderMock.mockResolvedValue({} as any);
  });

  async function selectClient() {
    const user = userEvent.setup();

    renderPage();

    const searchInput = screen.getByPlaceholderText(/search client by name or id/i);
    await user.type(searchInput, 'Jane');

    await waitFor(() => {
      expect(searchUsersMock).toHaveBeenCalledWith('Jane');
    });

    const resultButton = await screen.findByRole('button', {
      name: /jane doe \(123\)/i,
    });
    await user.click(resultButton);

    expect(await screen.findByText(/selected client/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(getUserByClientIdMock).toHaveBeenCalledWith('123');
    });

    const addressField = await screen.findByLabelText(/delivery address/i);
    const phoneField = screen.getByRole('textbox', { name: /^phone number$/i });
    const emailField = screen.getByRole('textbox', { name: /email \(optional\)/i });

    return { user, addressField, phoneField, emailField };
  }

  it('submits a delivery order after confirming contact details', async () => {
    const { user, addressField, phoneField, emailField } = await selectClient();

    await user.clear(addressField);
    await user.type(addressField, '987 Oak Ave');
    await user.clear(phoneField);
    await user.type(phoneField, '306-555-0202');
    await user.clear(emailField);
    await user.type(emailField, 'updated@example.com');

    const beansCheckbox = await screen.findByRole('checkbox', { name: /canned beans/i });
    const applesCheckbox = screen.getByRole('checkbox', { name: /apples/i });

    await user.click(beansCheckbox);
    await user.click(applesCheckbox);

    const addressConfirm = screen.getByRole('checkbox', {
      name: /address confirmed with client/i,
    });
    const phoneConfirm = screen.getByRole('checkbox', {
      name: /phone number confirmed with client/i,
    });
    const emailConfirm = screen.getByRole('checkbox', {
      name: /email confirmed with client/i,
    });

    await user.click(addressConfirm);
    await user.click(phoneConfirm);
    await user.click(emailConfirm);

    const submitButton = screen.getByRole('button', {
      name: /submit delivery request/i,
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(createDeliveryOrderMock).toHaveBeenCalledTimes(1);
    });

    expect(createDeliveryOrderMock).toHaveBeenCalledWith({
      clientId: 123,
      address: '987 Oak Ave',
      phone: '306-555-0202',
      email: 'updated@example.com',
      selections: [
        { itemId: 11, quantity: 1 },
        { itemId: 21, quantity: 1 },
      ],
    });

    expect(snackbarMessages).toContainEqual({
      message: 'Delivery request submitted for processing.',
      severity: 'success',
    });

    expect(
      await screen.findByRole('dialog', { name: /delivery request submitted/i }),
    ).toBeInTheDocument();
  });

  it('prevents submission when required contact details are missing', async () => {
    const { user, addressField, phoneField, emailField } = await selectClient();

    await user.clear(addressField);
    await user.clear(phoneField);
    await user.clear(emailField);

    const addressConfirm = screen.getByRole('checkbox', {
      name: /address confirmed with client/i,
    });
    const phoneConfirm = screen.getByRole('checkbox', {
      name: /phone number confirmed with client/i,
    });

    await user.click(addressConfirm);
    await user.click(phoneConfirm);

    const submitButton = screen.getByRole('button', {
      name: /submit delivery request/i,
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    await user.click(submitButton);

    expect(createDeliveryOrderMock).not.toHaveBeenCalled();

    expect(
      await screen.findByText(/enter the delivery address/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/enter a contact phone number/i),
    ).toBeInTheDocument();
  });

  it('shows an error snackbar when the delivery request fails', async () => {
    createDeliveryOrderMock.mockRejectedValueOnce(new Error('Server exploded'));

    const { user, addressField, phoneField, emailField } = await selectClient();

    await user.clear(addressField);
    await user.type(addressField, '654 Birch Ln');
    await user.clear(phoneField);
    await user.type(phoneField, '306-555-0303');
    await user.clear(emailField);
    await user.type(emailField, 'client-updated@example.com');

    const beansCheckbox = await screen.findByRole('checkbox', { name: /canned beans/i });
    await user.click(beansCheckbox);

    const addressConfirm = screen.getByRole('checkbox', {
      name: /address confirmed with client/i,
    });
    const phoneConfirm = screen.getByRole('checkbox', {
      name: /phone number confirmed with client/i,
    });
    const emailConfirm = screen.getByRole('checkbox', {
      name: /email confirmed with client/i,
    });

    await user.click(addressConfirm);
    await user.click(phoneConfirm);
    await user.click(emailConfirm);

    const submitButton = screen.getByRole('button', {
      name: /submit delivery request/i,
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(createDeliveryOrderMock).toHaveBeenCalledTimes(1);
    });

    expect(snackbarMessages).toContainEqual({
      message: 'Server exploded',
      severity: 'error',
    });
  });
});
