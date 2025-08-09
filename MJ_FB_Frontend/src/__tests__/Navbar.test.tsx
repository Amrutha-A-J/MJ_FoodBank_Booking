import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../components/Navbar';
import { MemoryRouter } from 'react-router-dom';

describe('Navbar component', () => {
  it('renders with title and name', () => {
    render(
      <MemoryRouter>
        <Navbar
          groups={[{ label: 'Home', links: [{ label: 'Home', to: '/' }] }]}
          onLogout={() => {}}
          name="Tester"
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Food Bank Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Hello, Tester/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Hello, Tester/i));
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });

  it('renders without greeting when name is absent', () => {
    render(
      <MemoryRouter>
        <Navbar
          groups={[{ label: 'Home', links: [{ label: 'Home', to: '/' }] }]}
          onLogout={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Food Bank Portal/i)).toBeInTheDocument();
    expect(screen.queryByText(/Hello/)).toBeNull();
    expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
  });
});
