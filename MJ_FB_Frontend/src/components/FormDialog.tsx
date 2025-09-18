import { forwardRef } from 'react';
import { Dialog, type DialogProps } from '@mui/material';

const FormDialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ fullWidth = true, maxWidth = 'sm', ...props }, ref) => (
    <Dialog ref={ref} fullWidth={fullWidth} maxWidth={maxWidth} {...props} />
  ),
);

FormDialog.displayName = 'FormDialog';

export default FormDialog;
