import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PantryVisits from '../PantryVisits';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';

jest.mock('../../../api/clientVisits', () => ({
  getClientVisits: jest.fn(),
  createClientVisit: jest.fn(),
  updateClientVisit: jest.fn(),
  deleteClientVisit: jest.fn(),
}));

jest.mock('../../../api/users', () => ({
  addUser: jest.fn(),
  getUserByClientId: jest.fn(),
}));

jest.mock('../../../api/appConfig', () => ({
  getAppConfig: jest.fn(),
}));

const { getClientVisits } = jest.requireMock('../../../api/clientVisits');
const { getAppConfig } = jest.requireMock('../../../api/appConfig');

describe('PantryVisits', () => {
  beforeAll(() => {
    window.matchMedia =
      window.matchMedia ||
      ((() => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      })) as any);
  });

  it('uses cart tare from config when calculating weight', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 10, breadWeightMultiplier: 0, cansWeightMultiplier: 0 });

    render(
      <ThemeProvider theme={theme}>
        <PantryVisits />
      </ThemeProvider>,
    );

    await waitFor(() => expect(getAppConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Record Visit'));

    const withCart = screen.getByLabelText('Weight With Cart');
    fireEvent.change(withCart, { target: { value: '50' } });

    const withoutCart = screen.getByLabelText('Weight Without Cart');
    expect(withoutCart).toHaveValue('40');
  });
});
