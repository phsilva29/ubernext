import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Check, Clock, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ExpenseStatus } from "@/types/finance";

interface ExpenseCardProps {
  title: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: ExpenseStatus;
  category?: string;
  amountPaid: number;
  onPaymentUpdate?: (amountPaid: number) => void;
  installment?: {
    total: number;
    paid: number;
    amount: number;
    startDate: Date;
  };
  onDelete?: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

export function ExpenseCard({
  title,
  amount,
  dueDate,
  paidDate,
  status,
  category,
  amountPaid,
  installment,
  onPaymentUpdate,
  onDelete,
}: ExpenseCardProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(() => amountPaid.toString().replace(".", ","));

  const parseCurrencyInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    const normalized = trimmed.includes(",")
      ? trimmed.replace(/\./g, "").replace(/,/g, ".")
      : trimmed;

    return Number(normalized);
  };

  const renderStatus = () => {
    switch (status) {
      case "paid":
        return (
          <Badge className="rounded-full border-2 border-success/40 bg-success/10 text-success">
            <Check className="mr-1 h-3 w-3" /> Pago
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="rounded-full border-2 border-destructive/40 bg-destructive/10 text-destructive">
            <XCircle className="mr-1 h-3 w-3" /> Atrasado
          </Badge>
        );
      default:
        return (
          <Badge className="rounded-full border-2 border-warning/40 bg-warning/10 text-warning">
            <Clock className="mr-1 h-3 w-3" /> Pendente
          </Badge>
        );
    }
  };

  const remaining = Math.max(amount - amountPaid, 0);
  const progress = amount === 0 ? 0 : Math.min((amountPaid / amount) * 100, 100);

  const handleDialogChange = (nextState: boolean) => {
    setOpen(nextState);
    setInputValue(amountPaid.toString().replace(".", ","));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!onPaymentUpdate) {
      setOpen(false);
      return;
    }

    let parsed = parseCurrencyInput(inputValue);

    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error("Informe um valor pago válido");
      return;
    }

    if (parsed > amount) {
      toast.error("O valor pago não pode ser maior do que o valor da despesa");
      return;
    }

    if (installment) {
      const epsilon = Math.max(installment.amount * 0.001, 0.01);
      if (parsed >= amount - epsilon) {
        parsed = amount;
      } else {
        const paidInstallments = Math.min(
          installment.total,
          Math.floor((parsed + epsilon) / installment.amount)
        );
        parsed = paidInstallments * installment.amount;
      }
    }

    onPaymentUpdate(parsed);
    setOpen(false);
  };

  const handleMarkInstallment = () => {
    if (!onPaymentUpdate || !installment) {
      return;
    }

    const epsilon = Math.max(installment.amount * 0.001, 0.01);
    const nextValue = Math.min(amount, amountPaid + installment.amount);
    const aligned = nextValue >= amount - epsilon ? amount : nextValue;
    onPaymentUpdate(aligned);
  };

  return (
    <Card
      className={cn(
        "flex h-full flex-col gap-4 rounded-3xl border-2 border-border/40 bg-background/70 p-4 xs:p-5 shadow-xl backdrop-blur-sm",
        "transition-transform duration-300 hover:-translate-y-[3px] hover:shadow-2xl",
        status === "paid" && "ring-2 ring-success/30",
        status === "overdue" && "ring-2 ring-destructive/40"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground xs:text-lg">{title}</h3>
          {category ? <p className="text-xs text-muted-foreground xs:text-sm">{category}</p> : null}
        </div>
        {renderStatus()}
      </div>

      <div className="space-y-3 text-xs text-muted-foreground xs:text-sm">
        <div className="flex items-center justify-between">
          <span>Valor</span>
          <span className="text-sm font-semibold text-foreground xs:text-base">{formatCurrency(amount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>{installment ? "Próxima parcela" : "Vencimento"}</span>
          <span className="text-foreground">{formatDate(dueDate)}</span>
        </div>
        {paidDate ? (
          <div className="flex items-center justify-between">
            <span>Pago em</span>
            <span className="text-success font-medium">{formatDate(paidDate)}</span>
          </div>
        ) : null}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] xs:text-xs">
            <span className="text-muted-foreground">Pago</span>
            <span className="font-medium text-success">{formatCurrency(Math.min(amountPaid, amount))}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] xs:text-xs">
            <span className="text-muted-foreground">Restante</span>
            <span
              className={cn(
                "font-medium",
                remaining > 0 ? (status === "overdue" ? "text-destructive" : "text-warning") : "text-success"
              )}
            >
              {formatCurrency(remaining)}
            </span>
          </div>
          <Progress value={progress} className="h-2 rounded-full bg-border/40" />
          {installment ? (
            <div className="mt-2 rounded-md border border-border/30 bg-muted/10 p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Parcelas pagas</span>
                <span className="font-medium text-foreground">
                  {installment.paid}/{installment.total}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor por parcela</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(installment.amount)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        {onDelete ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center rounded-xl border-2 border-destructive/30 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/15"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir despesa
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl border border-border/40 bg-card/95 shadow-xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir esta despesa?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é irreversível. A despesa será removida permanentemente do controle financeiro.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-lg bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
                  onClick={onDelete}
                >
                  Confirmar exclusão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl border-2 border-border/40 bg-secondary/40 text-foreground transition-colors hover:bg-secondary/60"
            >
              Atualizar pagamento
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-xl border border-border/40 bg-card/95 shadow-xl">
            <DialogHeader>
              <DialogTitle>Atualizar pagamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount-paid">Valor pago</Label>
                <Input
                  id="amount-paid"
                  type="text"
                  inputMode="decimal"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="0,00"
                />
                <p className="text-xs text-muted-foreground">
                  Valor total da despesa: {formatCurrency(amount)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => handleDialogChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-gradient-primary text-primary-foreground shadow-md hover:brightness-110">
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        {installment && installment.paid < installment.total && onPaymentUpdate ? (
          <Button
            size="sm"
            variant="secondary"
            className="w-full rounded-xl bg-secondary/60 text-foreground transition-colors hover:bg-secondary/70"
            onClick={handleMarkInstallment}
          >
            <Clock className="mr-2 h-4 w-4" /> Registrar parcela paga
          </Button>
        ) : null}
        {remaining > 0 && onPaymentUpdate ? (
          <Button
            size="sm"
            className="w-full rounded-xl bg-gradient-success text-success-foreground shadow-md hover:brightness-110"
            onClick={() => onPaymentUpdate(amount)}
          >
            <Check className="mr-2 h-4 w-4" /> Quitar total
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
