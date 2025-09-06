import { validatePassword } from '../src/utils/passwordUtils';

describe('validatePassword', () => {
  it('allows passwords without numbers', () => {
    expect(validatePassword('TammyM@MJFB')).toBeNull();
  });
});
