import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookDelivery from '../src/pages/delivery/BookDelivery';
import { apiFetch } from '../src/api/client';
import { getUserProfile } from '../src/api/users';
import { useAuth } from '../src/hooks/useAuth';

jest.mock('../src/api/client', () => {
  const actual = jest.requireActual('../src/api/client');
  return {
    ...actual,
    apiFetch: jest.fn(),
  };
});

jest.mock('../src/api/users', () => {
  const actual = jest.requireActual('../src/api/users');
  return {
    ...actual,
    getUserProfile: jest.fn(),
  };
});

jest.mock('../src/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

describe('BookDelivery page', () => {
  const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;
  const mockedGetUserProfile = getUserProfile as jest.MockedFunction<
    typeof getUserProfile
  >;
  const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserProfile.mockResolvedValue({
      address: '123 Main St',
      phone: '306-555-0101',
      email: 'client@example.com',
    } as any);
    mockedUseAuth.mockReturnValue({
      id: 42,
      role: 'delivery',
      isAuthenticated: true,
      name: 'Test User',
      userRole: 'delivery',
      access: [],
      login: jest.fn(),
      logout: jest.fn(),
      cardUrl: '',
      ready: true,
    } as any);
  });

  it('renders category names containing a dollar sign without stripping the character', async () => {
    const categories = [
      {
        id: 1,
        name: 'Fresh $tart',
        description: null,
        limit: 2,
        maxItems: null,
        maxSelections: null,
        limitPerOrder: null,
        items: [
          { id: 10, categoryId: 1, name: 'Apples', description: null, maxQuantity: null, maxPerOrder: null, unit: null },
        ],
      },
    ];

    mockedApiFetch.mockImplementation(async input => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/delivery/categories')) {
        return new Response(JSON.stringify(categories), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 204 });
    });

    render(
      <MemoryRouter>
        <BookDelivery />
      </MemoryRouter>,
    );

    const categoryTitle = await screen.findByText('Fresh $tart (Select up to 2)');
    expect(categoryTitle).toBeInTheDocument();
    const dollarMatches = categoryTitle.textContent?.match(/\$/g) ?? [];
    expect(dollarMatches).toHaveLength(1);

    expect(
      screen.getByText('Select up to 2 choices.'),
    ).toBeInTheDocument();
  });
});
