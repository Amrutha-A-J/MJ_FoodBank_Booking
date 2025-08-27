import { render } from '@testing-library/react';
import FormCard from '../components/FormCard';

describe('FormCard', () => {
  it('renders title inside form element', () => {
    const { getByText, container } = render(
      <FormCard title="Test" onSubmit={() => {}}>
        <div />
      </FormCard>,
    );
    const form = container.querySelector('form');
    expect(form).toBeTruthy();
    const titleEl = getByText('Test');
    expect(form?.contains(titleEl)).toBe(true);
  });
});
