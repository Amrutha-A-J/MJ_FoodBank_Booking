import { Card, CardHeader, CardContent } from '@mui/material';
import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export default function SectionCard({ title, icon, children }: SectionCardProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
      <CardHeader title={title} avatar={icon} />
      <CardContent>{children}</CardContent>
    </Card>
  );
}
