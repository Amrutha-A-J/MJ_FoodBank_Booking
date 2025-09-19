import { useCallback, type ChangeEvent, type ComponentProps, type MouseEvent } from 'react';
import { Checkbox, FormControlLabel, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import PasswordField from './PasswordField';

type PasswordFieldProps = ComponentProps<typeof PasswordField>;

type OnlineAccessControlsProps = {
  onlineAccess: boolean;
  onOnlineAccessChange: (value: boolean) => void;
  sendPasswordLink: boolean;
  onSendPasswordLinkChange: (value: boolean) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  checkboxLabel?: string;
  sendLinkOptionLabel?: string;
  setPasswordOptionLabel?: string;
  invitationMessage?: string;
  passwordFieldLabel?: string;
  passwordFieldProps?: Omit<PasswordFieldProps, 'value' | 'onChange'>;
};

export default function OnlineAccessControls({
  onlineAccess,
  onOnlineAccessChange,
  sendPasswordLink,
  onSendPasswordLinkChange,
  password,
  onPasswordChange,
  checkboxLabel = 'Online Access',
  sendLinkOptionLabel = 'Send link',
  setPasswordOptionLabel = 'Set password',
  invitationMessage = 'An email invitation will be sent.',
  passwordFieldLabel = 'Password',
  passwordFieldProps,
}: OnlineAccessControlsProps) {
  const handleOnlineAccessChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.checked;
      onOnlineAccessChange(next);
      if (!next) {
        onSendPasswordLinkChange(true);
        onPasswordChange('');
      }
    },
    [onOnlineAccessChange, onPasswordChange, onSendPasswordLinkChange],
  );

  const handleSendPasswordChange = useCallback(
    (_: MouseEvent<HTMLElement>, value: 'link' | 'password' | null) => {
      if (!value) return;
      const useLink = value === 'link';
      onSendPasswordLinkChange(useLink);
      if (useLink) {
        onPasswordChange('');
      }
    },
    [onPasswordChange, onSendPasswordLinkChange],
  );

  return (
    <Stack spacing={1.5}>
      <FormControlLabel
        control={<Checkbox checked={onlineAccess} onChange={handleOnlineAccessChange} />}
        label={checkboxLabel}
      />
      {onlineAccess && (
        <Stack spacing={1}>
          <ToggleButtonGroup
            value={sendPasswordLink ? 'link' : 'password'}
            exclusive
            onChange={handleSendPasswordChange}
            color="primary"
          >
            <ToggleButton value="link">{sendLinkOptionLabel}</ToggleButton>
            <ToggleButton value="password">{setPasswordOptionLabel}</ToggleButton>
          </ToggleButtonGroup>
          {sendPasswordLink ? (
            <Typography variant="body2" color="text.secondary">
              {invitationMessage}
            </Typography>
          ) : (
            <PasswordField
              {...passwordFieldProps}
              label={passwordFieldProps?.label ?? passwordFieldLabel}
              value={password}
              onChange={event => onPasswordChange(event.target.value)}
              visibilityIconButtonProps={{
                'aria-label': 'Toggle password visibility',
                ...passwordFieldProps?.visibilityIconButtonProps,
              }}
            />
          )}
        </Stack>
      )}
    </Stack>
  );
}
