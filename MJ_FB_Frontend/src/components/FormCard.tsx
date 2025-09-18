import { Box, Paper, Stack, Typography, type PaperProps, type BoxProps } from '@mui/material';
import type { FormEvent, ReactNode } from 'react';

interface FormCardProps extends Omit<PaperProps<'form'>, 'onSubmit' | 'elevation'> {
  title: string;
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  actions?: ReactNode;
  header?: ReactNode;
  centered?: boolean;
  boxProps?: BoxProps;
  elevation?: number;
}

export default function FormCard({
  title,
  children,
  onSubmit,
  actions,
  header,
  centered = true,
  boxProps,
  elevation = 1,
  ...paperProps
}: FormCardProps) {
  const { sx: boxSx, ...restBoxProps } = boxProps ?? {};

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent={
        centered ? { xs: 'flex-start', sm: 'center' } : 'flex-start'
      }
      alignItems="center"
      minHeight={{ xs: 'auto', sm: '80vh' }}
      px={2}
      sx={{
        pt: { xs: centered ? 6 : 4, sm: centered ? 0 : 4 },
        pb: { xs: centered ? 6 : 4, sm: centered ? 0 : 4 },
        ...(boxSx ?? {}),
      }}
      {...restBoxProps}
    >
      <Paper
        component="form"
        onSubmit={onSubmit}
        variant="outlined"
        sx={{ p: 3, width: '100%', maxWidth: 400, boxShadow: elevation }}
        {...paperProps}
      >
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
