import type { StaffAccess } from '../types';
import { getStaffRootPath } from '../utils/staffRootPath';

describe('getStaffRootPath', () => {
  it.each<{
    access: StaffAccess[];
    expected: string;
    description: string;
  }>([
    {
      access: ['pantry'],
      expected: '/pantry',
      description: 'single pantry access',
    },
    {
      access: ['warehouse'],
      expected: '/warehouse-management',
      description: 'single warehouse access',
    },
    {
      access: ['donor_management'],
      expected: '/donor-management',
      description: 'single donor management access',
    },
    {
      access: ['volunteer_management'],
      expected: '/volunteer-management',
      description: 'single volunteer management access',
    },
  ])('returns $expected for $description', ({ access, expected }) => {
    expect(getStaffRootPath(access)).toBe(expected);
  });

  it.each<{
    access: StaffAccess[];
    description: string;
  }>([
    { access: ['admin'], description: 'admin access' },
    {
      access: ['pantry', 'warehouse'],
      description: 'multiple access values',
    },
  ])('returns root path for $description', ({ access }) => {
    expect(getStaffRootPath(access)).toBe('/');
  });
});
