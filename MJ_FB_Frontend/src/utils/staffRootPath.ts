import type { StaffAccess } from '../types';

export function getStaffRootPath(access: StaffAccess[]): string {
  if (access.length === 1 && access[0] !== 'admin') {
    const [first] = access;
    if (first === 'pantry') return '/pantry';
    if (first === 'volunteer_management') return '/volunteer-management';
    if (first === 'warehouse') return '/warehouse-management';
    if (first === 'donor_management') return '/donor-management';
  }
  return '/';
}
