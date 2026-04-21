import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';

type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

interface AlertItemProps {
  severity: AlertSeverity;
  title: string;
  message: string;
  time?: string;
  onClick?: () => void;
  className?: string;
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    className: 'alert-critical',
    iconClass: 'text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    className: 'alert-warning',
    iconClass: 'text-warning',
  },
  info: {
    icon: Info,
    className: 'alert-info',
    iconClass: 'text-info',
  },
  success: {
    icon: CheckCircle,
    className: '',
    iconClass: 'text-success',
  },
};

export function AlertItem({ severity, title, message, time, onClick, className }: AlertItemProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div
      className={cn('alert-item', config.className, className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', config.iconClass)} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{message}</p>
        {time && (
          <p className="text-xs text-muted-foreground mt-1">{time}</p>
        )}
      </div>
    </div>
  );
}
