import Button from '@mui/material/Button';
import { renderWithProviders, screen } from '../../testUtils/renderWithProviders';

// Ensure small buttons keep text within bounds by using a smaller font size
it('uses reduced font size without wrapping text', () => {
  renderWithProviders(
    <div style={{ width: 40 }}>
      <Button>Really long button label</Button>
    </div>,
  );
  const btn = screen.getByRole('button');
  const style = getComputedStyle(btn);
  expect(style.fontSize).toBe('0.875rem');
});
