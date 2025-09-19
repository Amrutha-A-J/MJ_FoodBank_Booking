import { type ChangeEvent, type ComponentProps } from 'react';
import TextField from '@mui/material/TextField';
import { Stack } from '@mui/material';

type TextFieldProps = ComponentProps<typeof TextField>;

type ContactInfoFieldsProps = {
  onlineAccess: boolean;
  email: string;
  onEmailChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  emailTextFieldProps?: Omit<TextFieldProps, 'value' | 'onChange'>;
  phoneTextFieldProps?: Omit<TextFieldProps, 'value' | 'onChange'>;
};

export default function ContactInfoFields({
  onlineAccess,
  email,
  onEmailChange,
  phone,
  onPhoneChange,
  emailTextFieldProps,
  phoneTextFieldProps,
}: ContactInfoFieldsProps) {
  const emailLabel = emailTextFieldProps?.label ?? (onlineAccess ? 'Email' : 'Email (optional)');
  const emailType = emailTextFieldProps?.type ?? 'email';
  const emailRequired = emailTextFieldProps?.required ?? onlineAccess;

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    onEmailChange(event.target.value);
  };

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    onPhoneChange(event.target.value);
  };

  return (
    <Stack spacing={2}>
      <TextField
        {...emailTextFieldProps}
        label={emailLabel}
        type={emailType}
        required={emailRequired}
        value={email}
        onChange={handleEmailChange}
      />
      <TextField
        {...phoneTextFieldProps}
        label={phoneTextFieldProps?.label ?? 'Phone (optional)'}
        type={phoneTextFieldProps?.type ?? 'tel'}
        value={phone}
        onChange={handlePhoneChange}
      />
    </Stack>
  );
}
