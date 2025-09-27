import { screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ClientManagement from '../ClientManagement';
import MainLayout from '../../../components/layout/MainLayout';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';

it('navigates to search tab via quick link', async () => {
  window.history.pushState({}, '', '/pantry/client-management?tab=add');

  localStorage.setItem('role', 'staff');
  localStorage.setItem('name', 'Test Staff');
  localStorage.setItem('access', '[]');

  renderWithProviders(
    <BrowserRouter>
      <MainLayout groups={[]}>
        <ClientManagement />
      </MainLayout>
    </BrowserRouter>,
  );

  const quickLink = await screen.findByText(/search client/i, { selector: 'a' });
  fireEvent.click(quickLink);

  expect(window.location.search).toBe('');
});
