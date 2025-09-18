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

  it('prefills initial staff values', () => {
    const initial = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      access: ['pantry', 'warehouse'] as const,
    };
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<StaffForm initial={initial} submitLabel="Save" onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue('Jane');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
    expect(screen.getByLabelText(/email/i)).toHaveValue('jane@example.com');
    expect(screen.getByLabelText(/pantry/i)).toBeChecked();
    expect(screen.getByLabelText(/warehouse/i)).toBeChecked();
  });
});
