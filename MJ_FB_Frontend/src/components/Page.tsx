import { Box, Typography, type BoxProps } from '@mui/material';
import { type ReactNode } from 'react';
import { usePageTitle, useBreadcrumbActions } from './layout/MainLayout';

interface PageProps extends BoxProps {
  title: string;
  header?: ReactNode;
  children: ReactNode;
}

export default function Page({ title, header, children, ...boxProps }: PageProps) {
  usePageTitle(title);
  useBreadcrumbActions(header ?? null);

  return (
    <Box {...boxProps}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

