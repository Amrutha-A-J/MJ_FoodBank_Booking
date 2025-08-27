import { Card, CardContent, type CardProps, type CardContentProps } from '@mui/material';
import type { ReactNode } from 'react';

interface PageCardProps extends CardProps {
  children: ReactNode;
  header?: ReactNode;
  contentProps?: CardContentProps;
}

export default function PageCard({
  children,
  header,
  contentProps,
  sx,
  variant = 'outlined',
  ...cardProps
}: PageCardProps) {
  return (
    <Card variant={variant} sx={{ borderRadius: 1, boxShadow: 1, ...sx }} {...cardProps}>
      {header}
      <CardContent {...contentProps}>{children}</CardContent>
    </Card>
  );
}
