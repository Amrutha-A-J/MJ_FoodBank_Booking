import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../testUtils/renderWithProviders';
import Timesheets from '../timesheets';

describe('Timesheets', () => {
  it('renders table headers', () => {
    renderWithProviders(<Timesheets />);
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Reg')).toBeInTheDocument();
    expect(screen.getByText('OT')).toBeInTheDocument();
  });
});

