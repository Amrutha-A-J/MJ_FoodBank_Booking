import { Box, Paper, Stack, Typography, type PaperProps, type BoxProps } from '@mui/material';
import type { FormEvent, ReactNode } from 'react';

interface FormCardProps extends Omit<PaperProps<'form'>, 'onSubmit'> {
  title: string;
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  actions?: ReactNode;
  header?: ReactNode;
  centered?: boolean;
  boxProps?: BoxProps;
}

export default function FormCard({
  title,
  children,
  onSubmit,
  actions,
  header,
  centered = true,
  boxProps,
  ...paperProps
}: FormCardProps) {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems={centered ? 'center' : 'flex-start'}
      minHeight="100vh"
      px={2}
      py={centered ? 0 : 4}
      {...boxProps}
    >
      <Paper component="form" onSubmit={onSubmit} sx={{ p: 3, width: '100%', maxWidth: 400 }} {...paperProps}>
        <Stack spacing={2}>
          {header && <Box textAlign="center">{header}</Box>}
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
