import { render, screen, fireEvent } from '@testing-library/react';
import RoleTabs from '../components/RoleTabs';

describe('RoleTabs', () => {
  it('switches content when tabs are clicked', () => {
    const tabs = [
      { label: 'First', content: <div>First Content</div> },
      { label: 'Second', content: <div>Second Content</div> },
    ];
    render(<RoleTabs tabs={tabs} />);
    expect(screen.getByText(/First Content/i)).toBeInTheDocument();
    expect(screen.queryByText(/Second Content/i)).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Second/i }));
    expect(screen.getByText(/Second Content/i)).toBeInTheDocument();
  });
});

