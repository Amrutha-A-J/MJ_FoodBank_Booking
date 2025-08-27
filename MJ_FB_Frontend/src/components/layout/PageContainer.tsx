import { Container, type ContainerProps } from '@mui/material';
import type { ReactNode } from 'react';

export default function PageContainer({
  children,
  maxWidth = 'lg',
  sx,
  ...props
}: ContainerProps & { children: ReactNode }) {
  return (
    <Container
      maxWidth={maxWidth}
      sx={{ py: { xs: 2, md: 4 }, ...sx }}
      {...props}
    >
      {children}
    </Container>
  );
}
