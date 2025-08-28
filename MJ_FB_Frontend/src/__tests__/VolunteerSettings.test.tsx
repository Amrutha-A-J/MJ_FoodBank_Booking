import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import VolunteerSettings from '../pages/admin/VolunteerSettings';
import {
  getVolunteerMasterRoles,
  getVolunteerRoles,
  createVolunteerRole,
} from '../api/volunteers';

jest.mock('../api/volunteers', () => ({
  getVolunteerMasterRoles: jest.fn(),
  getVolunteerRoles: jest.fn(),
  createVolunteerRole: jest.fn(),
  createVolunteerMasterRole: jest.fn(),
  updateVolunteerMasterRole: jest.fn(),
  deleteVolunteerMasterRole: jest.fn(),
  updateVolunteerRole: jest.fn(),
  toggleVolunteerRole: jest.fn(),
  deleteVolunteerRole: jest.fn(),
}));

describe('VolunteerSettings', () => {
  it('shows inline errors for required fields', async () => {
    (getVolunteerMasterRoles as jest.Mock).mockResolvedValue([{ id: 1, name: 'Pantry' }]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    const queryClient = new QueryClient();
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <VolunteerSettings />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    const addSubRole = await screen.findByRole('button', { name: /add sub-role/i });
    fireEvent.click(addSubRole);
    fireEvent.change(screen.getByLabelText(/max volunteers/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));

    expect(createVolunteerRole).not.toHaveBeenCalled();
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Start time is required')).toBeInTheDocument();
    expect(screen.getByText('End time is required')).toBeInTheDocument();
    expect(screen.getByText('Max volunteers is required')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
