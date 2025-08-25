import { render } from '@testing-library/react';
import Page from '../components/Page';

describe('Page', () => {
  it('sets document title from props', () => {
    render(<Page title="Dashboard">content</Page>);
    expect(document.title).toBe('MJ Foodbank - Dashboard');
  });
});
