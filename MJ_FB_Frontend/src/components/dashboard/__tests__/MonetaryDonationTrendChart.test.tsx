import { render, screen, fireEvent } from '@testing-library/react';
import MonetaryDonationTrendChart, {
  type MonetaryDonationTrendDatum,
} from '../MonetaryDonationTrendChart';

describe('MonetaryDonationTrendChart', () => {
  const sampleData: MonetaryDonationTrendDatum[] = [
    {
      month: '2024-01',
      amount: 1000,
      donationCount: 12,
      donorCount: 10,
      averageGift: 83.33,
    },
    {
      month: '2024-02',
      amount: 1500,
      donationCount: 18,
      donorCount: 14,
      averageGift: 83.33,
    },
  ];

  it('renders formatted month labels', () => {
    render(<MonetaryDonationTrendChart data={sampleData} />);

    expect(screen.getByText('Jan 2024')).toBeInTheDocument();
    expect(screen.getByText('Feb 2024')).toBeInTheDocument();
  });

  it('shows tooltip details when hovering a point', () => {
    render(<MonetaryDonationTrendChart data={sampleData} />);

    const chart = screen.getByTestId('monetary-donation-trend-chart');
    const dots = chart.querySelectorAll('.recharts-dot');

    expect(dots.length).toBeGreaterThan(0);

    fireEvent.mouseOver(dots[0]);

    expect(screen.getByText('Amount: $1,000.00')).toBeInTheDocument();
    expect(screen.getByText('Donors: 10')).toBeInTheDocument();
    expect(screen.getByText('Avg. Gift: $83.33')).toBeInTheDocument();
    expect(screen.queryByText('Donations: 12')).not.toBeInTheDocument();
  });
});
