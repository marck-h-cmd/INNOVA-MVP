import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  ActionStatus,
  AlertStatus,
  PriorityLevel,
  RiskLevel,
  ServiceStatus,
  SourceType,
} from '../../types/domain';

interface StatusBadgeProps {
  status: ServiceStatus | ActionStatus | AlertStatus | PriorityLevel | RiskLevel | string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; colorClass: string; Icon: typeof CheckCircle2 }
> = {
  OPERATIVO: {
    label: 'Operativo',
    colorClass: 'text-[#178353] dark:text-[#4AD196] bg-[#E7F5EE] dark:bg-[#178353]/20',
    Icon: CheckCircle2,
  },
  NORMAL: {
    label: 'Normal',
    colorClass: 'text-[#178353] dark:text-[#4AD196] bg-[#E7F5EE] dark:bg-[#178353]/20',
    Icon: CheckCircle2,
  },
  VERIFICADA: {
    label: 'Verificada',
    colorClass: 'text-[#178353] dark:text-[#4AD196] bg-[#E7F5EE] dark:bg-[#178353]/20',
    Icon: CheckCircle2,
  },
  CERRADA: {
    label: 'Cerrada',
    colorClass: 'text-[#53636B] dark:text-[#BDCCCF] bg-[#EDF1F0] dark:bg-[#20313B]',
    Icon: CheckCircle2,
  },
  EN_OBSERVACION: {
    label: 'En observación',
    colorClass: 'text-[#A96A00] dark:text-[#F0B44C] bg-[#FDF4E2] dark:bg-[#A96A00]/20',
    Icon: Clock,
  },
  EN_REVISION: {
    label: 'En revisión',
    colorClass: 'text-[#A96A00] dark:text-[#F0B44C] bg-[#FDF4E2] dark:bg-[#A96A00]/20',
    Icon: Clock,
  },
  PENDIENTE: {
    label: 'Pendiente',
    colorClass: 'text-[#C25B2B] dark:text-[#F28B5B] bg-[#FCECE5] dark:bg-[#C25B2B]/20',
    Icon: AlertTriangle,
  },
  PENDIENTE_APROBACION: {
    label: 'Pendiente de aprobación',
    colorClass: 'text-[#A96A00] dark:text-[#F0B44C] bg-[#FDF4E2] dark:bg-[#A96A00]/20',
    Icon: Clock,
  },
  LIMITADO: {
    label: 'Limitado',
    colorClass: 'text-[#C25B2B] dark:text-[#F28B5B] bg-[#FCECE5] dark:bg-[#C25B2B]/20',
    Icon: AlertTriangle,
  },
  NO_DISPONIBLE: {
    label: 'No disponible',
    colorClass: 'text-[#B62C49] dark:text-[#F2728C] bg-[#FBE9ED] dark:bg-[#B62C49]/25',
    Icon: XCircle,
  },
  SIN_CONFIRMAR: {
    label: 'Sin confirmar',
    colorClass: 'text-[#A96A00] dark:text-[#F0B44C] bg-[#FDF4E2] dark:bg-[#A96A00]/20',
    Icon: HelpCircle,
  },
  BORRADOR: {
    label: 'Borrador',
    colorClass: 'text-[#53636B] dark:text-[#BDCCCF] bg-[#EDF1F0] dark:bg-[#20313B]',
    Icon: Info,
  },
  APROBADA: {
    label: 'Aprobada',
    colorClass: 'text-[#178353] dark:text-[#4AD196] bg-[#E7F5EE] dark:bg-[#178353]/20',
    Icon: CheckCircle2,
  },
  DIFUNDIDA: {
    label: 'Difundida (sim.)',
    colorClass: 'text-[#126A64] dark:text-[#75D5C4] bg-[#126A64]/12 dark:bg-[#75D5C4]/15',
    Icon: CheckCircle2,
  },
  RECHAZADA: {
    label: 'Rechazada',
    colorClass: 'text-[#B62C49] dark:text-[#F2728C] bg-[#FBE9ED] dark:bg-[#B62C49]/25',
    Icon: XCircle,
  },
  BAJO: {
    label: 'Bajo',
    colorClass: 'text-[#178353] dark:text-[#4AD196] bg-[#E7F5EE] dark:bg-[#178353]/20',
    Icon: CheckCircle2,
  },
  MODERADO: {
    label: 'Moderado',
    colorClass: 'text-[#A96A00] dark:text-[#F0B44C] bg-[#FDF4E2] dark:bg-[#A96A00]/20',
    Icon: Clock,
  },
  ALTO: {
    label: 'Alto',
    colorClass: 'text-[#C25B2B] dark:text-[#F28B5B] bg-[#FCECE5] dark:bg-[#C25B2B]/20',
    Icon: AlertTriangle,
  },
  CRITICO: {
    label: 'Crítico',
    colorClass: 'text-[#B62C49] dark:text-[#F2728C] bg-[#FBE9ED] dark:bg-[#B62C49]/25',
    Icon: ShieldAlert,
  },
  ALTA: {
    label: 'Prioridad alta',
    colorClass: 'text-[#B62C49] dark:text-[#F2728C] bg-[#FBE9ED] dark:bg-[#B62C49]/25',
    Icon: ShieldAlert,
  },
  MEDIA: {
    label: 'Prioridad media',
    colorClass: 'text-[#A96A00] dark:text-[#F0B44C] bg-[#FDF4E2] dark:bg-[#A96A00]/20',
    Icon: AlertTriangle,
  },
  BAJA: {
    label: 'Prioridad baja',
    colorClass: 'text-[#178353] dark:text-[#4AD196] bg-[#E7F5EE] dark:bg-[#178353]/20',
    Icon: Info,
  },
  ALTERNATIVA_PROPUESTA: {
    label: 'Alternativa propuesta',
    colorClass: 'text-[#126A64] dark:text-[#75D5C4] bg-[#126A64]/12 dark:bg-[#75D5C4]/15',
    Icon: Info,
  },
  SUSPENDIDA_SIMULADA: {
    label: 'Suspensión sugerida',
    colorClass: 'text-[#B62C49] dark:text-[#F2728C] bg-[#FBE9ED] dark:bg-[#B62C49]/25',
    Icon: XCircle,
  },
  DATOS_INSUFICIENTES: {
    label: 'Datos insuficientes',
    colorClass: 'text-[#A96A00] dark:text-[#F0B44C] bg-[#FDF4E2] dark:bg-[#A96A00]/20',
    Icon: HelpCircle,
  },
  LEIDO: {
    label: 'Leído',
    colorClass: 'text-[#178353] dark:text-[#4AD196] bg-[#E7F5EE] dark:bg-[#178353]/20',
    Icon: CheckCircle2,
  },
  ENTREGADO: {
    label: 'Entregado',
    colorClass: 'text-[#126A64] dark:text-[#75D5C4] bg-[#126A64]/12 dark:bg-[#75D5C4]/15',
    Icon: Info,
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    colorClass: 'text-[var(--text-secondary)] bg-[var(--bg-surface-2)]',
    Icon: Info,
  };
  const { Icon } = cfg;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${cfg.colorClass}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
}

export function SourceBadge({
  type,
  label,
}: {
  type: SourceType;
  label?: string;
}) {
  const map: Record<SourceType, { text: string; tone: string }> = {
    OFICIAL: {
      text: label ?? 'Fuente documental oficial',
      tone: 'text-[#126A64] dark:text-[#75D5C4]',
    },
    HISTORICO: {
      text: label ?? 'Antecedente histórico UNT 2025',
      tone: 'text-[#80263C] dark:text-[#E36D88]',
    },
    SIMULADO: {
      text: label ?? 'Parámetro simulado',
      tone: 'text-[#A96A00] dark:text-[#F0B44C]',
    },
  };
  const cfg = map[type];

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${cfg.tone}`}>
      <span>{cfg.text}</span>
    </span>
  );
}

export function SimulationBadge({ label = 'Escenario simulado' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#80263C] dark:text-[#E36D88] whitespace-nowrap">
      <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function RiskIndicator({
  score,
  level,
  label,
}: {
  score: number;
  level: RiskLevel;
  label: string;
}) {
  const barColor: Record<RiskLevel, string> = {
    BAJO: 'bg-[#178353] dark:bg-[#4AD196]',
    MODERADO: 'bg-[#A96A00] dark:bg-[#F0B44C]',
    ALTO: 'bg-[#C25B2B] dark:bg-[#F28B5B]',
    CRITICO: 'bg-[#B62C49] dark:bg-[#F2728C]',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Atención operativa simulada
        </span>
        <StatusBadge status={level} />
      </div>
      <div
        className="w-full h-2 rounded-full bg-[var(--bg-surface-2)] overflow-hidden"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Atención operativa simulada: ${score} de 100, nivel ${label}`}
      >
        <div
          className={`h-full transition-all duration-300 ${barColor[level]}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
