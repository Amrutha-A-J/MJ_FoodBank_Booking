import { Box, Stack, Button, type BoxProps } from '@mui/material';
import type { ReactNode, FormEvent } from 'react';

interface FormContainerProps extends Omit<BoxProps, 'component' | 'onSubmit'> {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  children: ReactNode;
}

export default function FormContainer({ onSubmit, submitLabel, children, ...boxProps }: FormContainerProps) {
  return (
    <Box component="form" onSubmit={onSubmit} mt={2} maxWidth={400} mx="auto" {...boxProps}>
      <Stack spacing={2}>
        {children}
        <Button type="submit" variant="contained" color="primary" fullWidth>
          {submitLabel}
        </Button>
      </Stack>
    </Box>
  );
}

