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
      accent: "from-primary/40 to-primary/10",
    },
    {
      title: "Pagas",
      value: totalPaid,
      icon: TrendingUp,
      accent: "from-success/40 to-success/10",
    },
    {
      title: "Pendentes",
      value: totalPending,
      icon: Clock,
      accent: "from-warning/40 to-warning/10",
    },
    {
      title: "Atrasadas",
      value: totalOverdue,
      icon: AlertTriangle,
      accent: "from-destructive/40 to-destructive/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map(({ title, value, icon: Icon, accent }) => (
        <Card
          key={title}
          className={cn(
            "relative overflow-hidden rounded-xl border border-border/50 bg-card/90 shadow-lg backdrop-blur-sm",
            "transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-xl"
          )}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${accent} pointer-events-none`} />
          <div className="relative flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <span className="rounded-lg bg-background/40 p-2 text-primary">
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {formatCurrency(value)}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
