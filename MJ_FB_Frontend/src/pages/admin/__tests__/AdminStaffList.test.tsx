import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminStaffList from '../AdminStaffList';
import { listStaff, deleteStaff, searchStaff } from '../../../api/adminStaff';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';

jest.mock('../../../api/adminStaff', () => ({
  ...jest.requireActual('../../../api/adminStaff'),
  listStaff: jest.fn(),
  deleteStaff: jest.fn(),
  searchStaff: jest.fn(),
}));

const mockStaff = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    access: ['admin'],
  },
];

describe('AdminStaffList', () => {
  beforeEach(() => {
    (listStaff as jest.Mock).mockResolvedValue(mockStaff);
    (searchStaff as jest.Mock).mockResolvedValue(mockStaff);
    (deleteStaff as jest.Mock).mockResolvedValue(undefined);
  });

  it('asks for confirmation before deleting staff', async () => {
    renderWithProviders(
      <MemoryRouter>
        <AdminStaffList />
      </MemoryRouter>,
    );

    expect(await screen.findByText('John Doe')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('delete'));
    expect(await screen.findByText('Delete John Doe?')).toBeInTheDocument();
    expect(deleteStaff).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(deleteStaff).toHaveBeenCalledWith(1);
    });
  });

  it('does not delete staff when dialog is dismissed', async () => {
    renderWithProviders(
      <MemoryRouter>
        <AdminStaffList />
      </MemoryRouter>,
    );

    expect(await screen.findByText('John Doe')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('delete'));
    expect(await screen.findByText('Delete John Doe?')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/close/i));

    await waitFor(() => {
      expect(screen.queryByText('Delete John Doe?')).not.toBeInTheDocument();
    });
    expect(deleteStaff).not.toHaveBeenCalled();
  });
});
