import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeleteVolunteer from '../pages/volunteer-management/DeleteVolunteer';
import { deleteVolunteer } from '../api/volunteers';

jest.mock('../api/volunteers', () => ({ deleteVolunteer: jest.fn() }));

jest.mock('../components/EntitySearch', () => (props: any) => (
  <button onClick={() => props.onSelect({ id: 2, name: 'Jane' })}>Select Volunteer</button>
));

describe('DeleteVolunteer', () => {
  it('deletes selected volunteer', async () => {
    render(
      <MemoryRouter>
        <DeleteVolunteer />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Select Volunteer'));
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(deleteVolunteer).toHaveBeenCalledWith(2);
  });
});
