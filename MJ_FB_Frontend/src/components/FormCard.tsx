import { Box, Paper, Stack, Typography, type PaperProps } from '@mui/material';
import type { FormEvent, ReactNode } from 'react';

interface FormCardProps extends Omit<PaperProps<'form'>, 'onSubmit'> {
  title: string;
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  actions?: ReactNode;
}

export default function FormCard({ title, children, onSubmit, actions, ...paperProps }: FormCardProps) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Paper component="form" onSubmit={onSubmit} sx={{ p: 3, width: '100%', maxWidth: 400 }} {...paperProps}>
        <Stack spacing={2}>
          <Typography variant="h5" textAlign="center">
            {title}
          </Typography>
          {children}
          {actions && <Box>{actions}</Box>}
        </Stack>
      </Paper>
    </Box>
  );
}
