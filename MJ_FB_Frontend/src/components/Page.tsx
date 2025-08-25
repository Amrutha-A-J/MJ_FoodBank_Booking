import { Box, Typography, type BoxProps } from '@mui/material';
import { useEffect, type ReactNode } from 'react';

interface PageProps extends BoxProps {
  title: string;
  header?: ReactNode;
  children: ReactNode;
}

export default function Page({ title, header, children, ...boxProps }: PageProps) {
  useEffect(() => {
    document.title = `MJ Foodbank - ${title}`;
  }, [title]);

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

