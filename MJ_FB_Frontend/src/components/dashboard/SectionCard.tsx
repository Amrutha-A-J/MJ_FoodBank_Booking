import { CardHeader, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import PageCard from '../layout/PageCard';

interface SectionCardProps {
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

export default function SectionCard({ title, icon, children, sx }: SectionCardProps) {
  return (
    <PageCard
      sx={sx}
      header={<CardHeader title={title} avatar={icon} />}
    >
      {children}
    </PageCard>
  );
}
