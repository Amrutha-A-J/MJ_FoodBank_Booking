import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RescheduleDialog from '../components/RescheduleDialog';

describe('RescheduleDialog', () => {
  it('loads options and submits selection', async () => {
    const loadOptions = jest.fn().mockResolvedValue([
      { id: '1', label: 'First' },
      { id: '2', label: 'Second' },
    ]);
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <RescheduleDialog
        open
        onClose={() => {}}
        loadOptions={loadOptions}
        onSubmit={onSubmit}
        optionLabel="Time"
        submitLabel="Reschedule"
      />,
    );

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: '2099-01-02' },
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: /time/i }));
    await user.click(await screen.findByRole('option', { name: 'First' }));
    await user.click(screen.getByRole('button', { name: /reschedule/i }));
    expect(onSubmit).toHaveBeenCalledWith('2099-01-02', '1');
  });
});
