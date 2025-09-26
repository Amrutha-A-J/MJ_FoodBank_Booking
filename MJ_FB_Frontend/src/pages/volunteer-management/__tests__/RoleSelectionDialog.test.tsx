import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoleSelectionDialog, { RoleSelectionGroup } from '../RoleSelectionDialog';

describe('RoleSelectionDialog', () => {
  const groupedRoles: RoleSelectionGroup[] = [
    {
      category: 'Front of House',
      roles: [
        { name: 'Greeter', role_id: 1 },
        { name: 'Welcome Desk', role_id: 2 },
      ],
    },
    {
      category: 'Warehouse',
      roles: [
        { name: 'Sorter', role_id: 3 },
      ],
    },
  ];

  it('returns ordered selections when confirming', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    render(
      <RoleSelectionDialog
        open
        groupedRoles={groupedRoles}
        selectedRoles={[]}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
        dialogId="role-dialog-test"
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Greeter' }));
    await user.click(screen.getByRole('checkbox', { name: 'Sorter' }));

    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(onConfirm).toHaveBeenCalledWith(['Greeter', 'Sorter']);
  });

  it('calls onCancel without confirming', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      <RoleSelectionDialog
        open
        groupedRoles={groupedRoles}
        selectedRoles={['Greeter']}
        onCancel={onCancel}
        onConfirm={onConfirm}
        dialogId="role-dialog-test"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
