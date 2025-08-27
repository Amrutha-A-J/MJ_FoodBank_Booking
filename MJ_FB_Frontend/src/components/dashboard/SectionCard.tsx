import { CardHeader } from '@mui/material';
import type { ReactNode } from 'react';
import PageCard from '../layout/PageCard';

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export default function SectionCard({ title, icon, children }: SectionCardProps) {
  return (
    <PageCard header={<CardHeader title={title} avatar={icon} />}>{children}</PageCard>
  );
}
