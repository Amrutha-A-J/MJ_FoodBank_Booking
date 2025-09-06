import Button from '@mui/material/Button';
import { renderWithProviders, screen } from '../../testUtils/renderWithProviders';

// Ensure button labels wrap instead of overflowing their container
it('wraps long button text when space is constrained', () => {
  renderWithProviders(
    <div style={{ width: 40 }}>
      <Button>Really long button label</Button>
    </div>,
  );
  const btn = screen.getByRole('button');
  expect(getComputedStyle(btn).whiteSpace).toBe('normal');
});

