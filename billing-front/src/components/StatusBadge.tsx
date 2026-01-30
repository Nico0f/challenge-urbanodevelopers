import { Clock, CheckCircle2, XCircle, AlertCircle, Package, ArrowRight, LucideIcon } from 'lucide-react';

interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

const statusConfig: Record<string, StatusConfig> = {
  PENDING: { label: 'Pendiente', color: 'status-pending', icon: Clock },
  INVOICED: { label: 'Facturado', color: 'status-invoiced', icon: CheckCircle2 },
  PROCESSED: { label: 'Procesado', color: 'status-processed', icon: CheckCircle2 },
  ERROR: { label: 'Error', color: 'status-error', icon: XCircle },
  CREATED: { label: 'Creado', color: 'status-created', icon: Package },
  SENT_TO_BILL: { label: 'Enviado', color: 'status-sent', icon: ArrowRight },
};

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status] || { label: status, color: 'status-default', icon: AlertCircle };
  const Icon = config.icon;
  
  return (
    <span className={`status-badge ${config.color}`}>
      <Icon size={14} />
      {config.label}
    </span>
  );
};
