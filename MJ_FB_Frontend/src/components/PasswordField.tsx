import { useState } from 'react';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { IconButton, type IconButtonProps, InputAdornment } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export default function PasswordField({
  InputProps,
  visibilityIconButtonProps,
  ...props
}: TextFieldProps & { visibilityIconButtonProps?: IconButtonProps }) {
  const [show, setShow] = useState(false);

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
              aria-label={show ? 'Hide password' : 'Show password'}
              {...visibilityIconButtonProps}
            >
              {show ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}
