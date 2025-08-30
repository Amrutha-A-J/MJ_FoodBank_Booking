import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StaffForm from '../components/StaffForm';

describe('StaffForm', () => {
  it('submits without password and shows invitation message', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<StaffForm submitLabel="Add" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@example.com' } });
    fireEvent.click(screen.getByLabelText(/pantry/i));
    fireEvent.click(screen.getByRole('button', { name: /Add/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'a@example.com',
        access: ['pantry'],
      }),
    );
    expect(screen.getByText(/email invitation/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });
});
