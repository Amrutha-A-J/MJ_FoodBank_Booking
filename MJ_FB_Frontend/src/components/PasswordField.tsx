import { useState } from 'react';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export default function PasswordField({ InputProps, ...props }: TextFieldProps) {
  const [show, setShow] = useState(false);
  const { t } = useTranslation();

  return (
    <TextField
      {...props}
      type={show ? 'text' : 'password'}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              edge="end"
              onClick={() => setShow(!show)}
              aria-label={show ? t('hide_password') : t('show_password')}
            >
              {show ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}
