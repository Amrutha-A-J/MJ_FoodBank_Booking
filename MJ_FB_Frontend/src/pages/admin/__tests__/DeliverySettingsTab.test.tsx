import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import DeliverySettingsTab from '../settings/DeliverySettingsTab';
import { theme } from '../../../theme';

jest.mock('../../../api/deliveryCategories', () => ({
  getDeliveryCategories: jest.fn(),
  createDeliveryCategory: jest.fn(),
  updateDeliveryCategory: jest.fn(),
  deleteDeliveryCategory: jest.fn(),
  createDeliveryCategoryItem: jest.fn(),
  updateDeliveryCategoryItem: jest.fn(),
  deleteDeliveryCategoryItem: jest.fn(),
}));

const {
  getDeliveryCategories,
  createDeliveryCategory,
  createDeliveryCategoryItem,
} = jest.requireMock('../../../api/deliveryCategories');

function renderComponent() {
  return render(
    <ThemeProvider theme={theme}>
      <DeliverySettingsTab />
    </ThemeProvider>,
  );
}

describe('DeliverySettingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new delivery category', async () => {
    (getDeliveryCategories as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ id: 1, name: 'Produce', maxItems: 5, items: [] }]);
    (createDeliveryCategory as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'Produce',
      maxItems: 5,
      items: [],
    });

    renderComponent();

    expect(await screen.findByText(/no delivery categories yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add category/i }));

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Produce' },
    });
    fireEvent.change(screen.getByLabelText(/max items per delivery/i), {
      target: { value: '5' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create category/i }));

    await waitFor(() => {
      expect(createDeliveryCategory).toHaveBeenCalledWith({
        name: 'Produce',
        maxItems: 5,
      });
    });

    await waitFor(() => {
      expect(getDeliveryCategories).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText('Produce')).toBeInTheDocument();
    expect(screen.getByText('Max items per delivery: 5')).toBeInTheDocument();
  });

  it('creates a new item inside a category', async () => {
    (getDeliveryCategories as jest.Mock)
      .mockResolvedValueOnce([
        { id: 1, name: 'Dry goods', maxItems: 3, items: [] },
      ])
      .mockResolvedValue([
        {
          id: 1,
          name: 'Dry goods',
          maxItems: 3,
          items: [{ id: 2, name: 'Pasta' }],
        },
      ]);
    (createDeliveryCategoryItem as jest.Mock).mockResolvedValue({
      id: 2,
      name: 'Pasta',
    });

    renderComponent();

    await screen.findByText('Dry goods');

    const addItemButton = await screen.findByRole('button', { name: /^add item$/i });
    fireEvent.click(addItemButton);

    const nameField = await screen.findByLabelText(/item name/i);
    fireEvent.change(nameField, { target: { value: 'Pasta' } });

    const dialog = await screen.findByRole('dialog', { name: /add item/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /^add item$/i }));

    await waitFor(() => {
      expect(createDeliveryCategoryItem).toHaveBeenCalledWith(1, { name: 'Pasta' });
    });

    await waitFor(() => {
      expect(getDeliveryCategories).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText('Pasta')).toBeInTheDocument();
  });
});
