import { render, screen, fireEvent } from '@testing-library/react';
import MonetaryGivingTierChart, {
  type MonetaryGivingTierDatum,
} from '../MonetaryGivingTierChart';

describe('MonetaryGivingTierChart', () => {
  const sampleData: MonetaryGivingTierDatum[] = [
    { tierLabel: 'Community Champions', donorCount: 15, amount: 5000, deltaFromPreviousMonth: 3 },
    { tierLabel: 'Sustaining Friends', donorCount: 10, amount: 2500, deltaFromPreviousMonth: -2 },
  ];

  it('renders tier labels and delta badges', () => {
    render(<MonetaryGivingTierChart data={sampleData} />);

    expect(screen.getByText('Community Champions')).toBeInTheDocument();
    expect(screen.getByText('Sustaining Friends')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('-2')).toBeInTheDocument();
  });

  it('shows tooltip details when hovering a bar', () => {
    render(<MonetaryGivingTierChart data={sampleData} />);

    const chart = screen.getByTestId('monetary-giving-tier-chart');
    const bars = chart.querySelectorAll('.recharts-rectangle');

    expect(bars.length).toBeGreaterThan(0);

    fireEvent.mouseMove(bars[0]);

    expect(screen.getByText('Amount: $5,000.00')).toBeInTheDocument();
    expect(screen.getByText('Donors: 15')).toBeInTheDocument();
    expect(screen.getByText('Change: +3')).toBeInTheDocument();
  });
});
