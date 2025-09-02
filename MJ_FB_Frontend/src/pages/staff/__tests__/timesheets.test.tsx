import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../testUtils/renderWithProviders';
import Timesheets from '../timesheets';

describe('Timesheets', () => {
  it('renders table headers', () => {
    renderWithProviders(<Timesheets />);
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Reg')).toBeInTheDocument();
    expect(screen.getByText('OT')).toBeInTheDocument();
  });

  it('shows stat day lock icon and tooltip', () => {
    renderWithProviders(<Timesheets />);
    const rows = screen.getAllByRole('row');
    const statRow = rows[1];
    expect(within(statRow).getByTestId('LockIcon')).toBeInTheDocument();
    expect(screen.getByText('Stat holiday is locked at 8h')).toBeInTheDocument();
    const regInput = within(statRow).getAllByRole('spinbutton')[0];
    expect(regInput).toBeDisabled();
  });

  it('shows hint when day total exceeds cap', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Timesheets />);
    const rows = screen.getAllByRole('row');
    const dayRow = rows[2];
    const regInput = within(dayRow).getAllByRole('spinbutton')[0];
    await user.clear(regInput);
    await user.type(regInput, '9');
    expect(regInput).toHaveAttribute('aria-invalid', 'true');
    const cells = within(dayRow).getAllByRole('cell');
    const paidCell = cells[cells.length - 1];
    expect(paidCell.style.color).toBe('rgb(211, 47, 47)');
  });

  it('calculates footer summaries', () => {
    renderWithProviders(<Timesheets />);
    const totalsRow = screen.getByText('Totals').closest('tr')!;
    const cells = within(totalsRow).getAllByRole('cell');
    expect(cells[1]).toHaveTextContent('16');
    expect(cells[2]).toHaveTextContent('1');
    expect(cells[3]).toHaveTextContent('8');
    expect(cells[7]).toHaveTextContent('25');
    expect(screen.getByText(/Expected Hours: 24/)).toBeInTheDocument();
    expect(screen.getByText(/Shortfall: -1/)).toBeInTheDocument();
    expect(screen.getByText(/OT Bank Remaining: 39/)).toBeInTheDocument();
  });
});

