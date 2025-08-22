import { Box, Stack, Button, Typography, type BoxProps } from '@mui/material';
import type { ReactNode, FormEvent } from 'react';

interface FormContainerProps extends Omit<BoxProps<'form'>, 'onSubmit'> {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  children: ReactNode;
  title?: string;
  header?: ReactNode;
  centered?: boolean;
}

export default function FormContainer({ onSubmit, submitLabel, children, title, header, centered = true, ...boxProps }: FormContainerProps) {
  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <Box
        flexGrow={1}
        display="flex"
        justifyContent="center"
        alignItems={centered ? 'center' : 'flex-start'}
        px={2}
        py={centered ? 0 : 4}
      >
        <Box component="form" onSubmit={onSubmit} maxWidth={400} width="100%" mx="auto" {...boxProps}>
          <Stack spacing={2}>
            {header && <Box textAlign="center">{header}</Box>}
            {title && (
              <Typography variant="h5" textAlign="center">
                {title}
              </Typography>
            )}
            {children}
            <Button type="submit" variant="contained" color="primary" fullWidth>
              {submitLabel}
            </Button>
          </Stack>
        </Box>
      </Box>
      <Box component="footer" py={2}>
        <Typography variant="body2" color="text.secondary" align="center">
          copyright@Moose Jaw & District food bank
        </Typography>
      </Box>
    </Box>
  );
}

