import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UpdateClientData from '../pages/staff/client-management/UpdateClientData';

jest.mock('../api/users', () => ({
  getIncompleteUsers: jest.fn().mockResolvedValue([
    {
      clientId: 1,
      firstName: 'Jane',
      lastName: 'Doe',
      email: '',
      phone: '',
      profileLink: 'link',
    },
  ]),
  updateUserInfo: jest.fn().mockRejectedValue({
    message: 'Update failed',
    details: { errors: [{ message: 'Email already exists' }] },
  }),
}));

describe('UpdateClientData', () => {
  it('shows server error message when update fails', async () => {
    render(<UpdateClientData />);

    await screen.findByRole('button', { name: 'Edit' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(
        screen.getByText('Email already exists')
      ).toBeInTheDocument()
    );
  });
});
