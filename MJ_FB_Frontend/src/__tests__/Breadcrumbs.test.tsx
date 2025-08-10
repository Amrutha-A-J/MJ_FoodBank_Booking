import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';

describe('Breadcrumbs component', () => {
  it('renders path segments', () => {
    render(
      <MemoryRouter initialEntries={['/foo/bar']}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Foo')).toHaveAttribute('href', '/foo');
    expect(screen.getByText('Bar')).toBeInTheDocument();
  });
});

