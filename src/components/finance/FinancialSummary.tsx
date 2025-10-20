import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DollarSign, TrendingUp, Clock, AlertTriangle } from "lucide-react";

interface FinancialSummaryProps {
  totalExpenses: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function FinancialSummary({
  totalExpenses,
  totalPaid,
  totalPending,
  totalOverdue,
}: FinancialSummaryProps) {
  const summaryCards = [
    {
      title: "Total de Despesas",
      value: totalExpenses,
      icon: DollarSign,
      bg: "bg-blue-500/10",
      border: "border-blue-400/40",
      valueClass: "text-blue-600",
      iconClass: "text-blue-600",
    },
    {
      title: "Pagas",
      value: totalPaid,
      icon: TrendingUp,
      bg: "bg-emerald-500/10",
      border: "border-emerald-400/40",
      valueClass: "text-emerald-600",
      iconClass: "text-emerald-600",
    },
    {
      title: "Pendentes",
      value: totalPending,
      icon: Clock,
      bg: "bg-amber-500/10",
      border: "border-amber-400/40",
      valueClass: "text-amber-600",
      iconClass: "text-amber-600",
    },
    {
      title: "Atrasadas",
      value: totalOverdue,
      icon: AlertTriangle,
      bg: "bg-red-500/10",
      border: "border-red-400/40",
      valueClass: "text-red-600",
      iconClass: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 xs:gap-4 sm:gap-6 xl:grid-cols-4">
      {summaryCards.map(({ title, value, icon: Icon, bg, border, valueClass, iconClass }) => (
        <Card
          key={title}
          className={cn(
            "relative overflow-hidden rounded-2xl border-2 p-4 xs:p-5 shadow-lg transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-xl",
            bg,
            border
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs xs:text-sm font-medium text-muted-foreground">{title}</p>
            <span className={cn("rounded-lg bg-background/70 p-2", iconClass)}>
              <Icon className="h-4 w-4 xs:h-5 xs:w-5" />
            </span>
          </div>
          <p className={cn("mt-3 text-xl xs:text-2xl font-bold tracking-tight", valueClass)}>
            {formatCurrency(value)}
          </p>
        </Card>
      ))}
    </div>
  );
}
