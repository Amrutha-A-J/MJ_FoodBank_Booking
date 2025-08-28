import { Box, Typography, type BoxProps } from '@mui/material';
import { type ReactNode } from 'react';
import { usePageTitle } from './layout/MainLayout';

interface PageProps extends BoxProps {
  title: string;
  header?: ReactNode;
  children: ReactNode;
}

export default function Page({ title, header, children, ...boxProps }: PageProps) {
  usePageTitle(title);

  return (
    <Box {...boxProps}>
      {header}
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

