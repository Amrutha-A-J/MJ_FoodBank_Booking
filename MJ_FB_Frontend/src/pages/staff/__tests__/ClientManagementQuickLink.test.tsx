import { screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ClientManagement from '../ClientManagement';
import MainLayout from '../../../components/layout/MainLayout';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';

it('navigates to search tab via quick link', async () => {
  window.history.pushState({}, '', '/pantry/client-management?tab=add');

  renderWithProviders(
    <BrowserRouter>
      <MainLayout groups={[]}> 
        <ClientManagement />
      </MainLayout>
    </BrowserRouter>,
  );

  fireEvent.click(screen.getByRole('link', { name: /search client/i }));

  await waitFor(() => {
    expect(screen.getByRole('tab', { name: /search client/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  expect(window.location.search).toBe('?tab=history');
});
