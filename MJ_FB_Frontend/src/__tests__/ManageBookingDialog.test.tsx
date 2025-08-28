import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManageBookingDialog from '../components/ManageBookingDialog';
import { createClientVisit } from '../api/clientVisits';
import { markBookingVisited } from '../api/bookings';

jest.mock('../api/clientVisits', () => ({
  createClientVisit: jest.fn(),
}));

jest.mock('../api/bookings', () => ({
  markBookingVisited: jest.fn(),
}));

const booking = { id: 1, client_id: 2, date: '2024-01-01', status: 'approved' };

describe('ManageBookingDialog', () => {
  it('creates visit and marks booking visited', async () => {
    (createClientVisit as jest.Mock).mockResolvedValue({});
    (markBookingVisited as jest.Mock).mockResolvedValue({});
    const onUpdated = jest.fn();
    const onClose = jest.fn();

    render(
      <ManageBookingDialog
        open
        booking={booking}
        onClose={onClose}
        onUpdated={onUpdated}
      />,
    );

    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: 'visited' },
    });

    fireEvent.change(screen.getByLabelText(/Weight With Cart/i), {
      target: { value: '40' },
    });

    await waitFor(() => {
      const withoutCart = screen.getByLabelText(/Weight Without Cart/i) as HTMLInputElement;
      expect(withoutCart.value).toBe('13');
    });

    fireEvent.change(screen.getByLabelText(/Pet Item/i), {
      target: { value: '1' },
    });

    fireEvent.click(screen.getByText(/save/i));

    await waitFor(() => {
      expect(createClientVisit).toHaveBeenCalledWith({
        date: '2024-01-01',
        clientId: 2,
        weightWithCart: 40,
        weightWithoutCart: 13,
        petItem: 1,
        anonymous: false,
      });
    });
    expect(markBookingVisited).toHaveBeenCalledWith(1);
    expect(onUpdated).toHaveBeenCalled();
  });
});

