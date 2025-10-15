import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface AddExpenseDialogProps {
  onAdd: (expense: {
    title: string;
    amount: number;
    dueDate: Date;
    category?: string;
    amountPaid?: number;
    installment?: {
      total: number;
      paid: number;
      amount: number;
      startDate: Date;
    };
  }) => void;
  category?: string;
  enableInstallments?: boolean;
}

const calculateInstallmentAmount = (total: number, installments: number) => {
  if (installments <= 0) {
    return total;
  }

  return total / installments;
};

export function AddExpenseDialog({ onAdd, category, enableInstallments = false }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [categoryInput, setCategoryInput] = useState(category ?? "");
  const [amountPaid, setAmountPaid] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState("2");

  const parseCurrencyInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return NaN;
    }

    const normalized = trimmed.includes(",")
      ? trimmed.replace(/\./g, "").replace(/,/g, ".")
      : trimmed;

    return Number(normalized);
  };

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setDueDate("");
    setCategoryInput(category ?? "");
    setAmountPaid("");
    setIsInstallment(false);
    setInstallmentsCount("2");
  };

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    } else {
      setCategoryInput(category ?? "");
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim() || !amount.trim() || !dueDate.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const numericAmount = parseCurrencyInput(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    let parsedAmountPaid = 0;
    if (amountPaid.trim()) {
      parsedAmountPaid = parseCurrencyInput(amountPaid);
    }

    if (Number.isNaN(parsedAmountPaid) || parsedAmountPaid < 0) {
      toast.error("O valor pago precisa ser um número válido");
      return;
    }

    if (parsedAmountPaid > numericAmount) {
      toast.error("O valor pago não pode ser maior do que o valor da despesa");
      return;
    }

    let installmentPayload: {
      total: number;
      paid: number;
      amount: number;
      startDate: Date;
    } | undefined;

    if (enableInstallments && isInstallment) {
      const parsedInstallments = Number.parseInt(installmentsCount, 10);

      if (Number.isNaN(parsedInstallments) || parsedInstallments < 2) {
        toast.error("Informe um número de parcelas válido (mínimo 2)");
        return;
      }

      const installmentValue = calculateInstallmentAmount(numericAmount, parsedInstallments);
      const epsilon = Math.max(installmentValue * 0.001, 0.01);
      let paidInstallments = 0;

      if (parsedAmountPaid > 0) {
        if (parsedAmountPaid >= numericAmount - epsilon) {
          paidInstallments = parsedInstallments;
          parsedAmountPaid = numericAmount;
        } else {
          paidInstallments = Math.min(
            parsedInstallments,
            Math.floor((parsedAmountPaid + epsilon) / installmentValue)
          );
          parsedAmountPaid = paidInstallments * installmentValue;
        }
      }

      const startDate = new Date(dueDate);
      installmentPayload = {
        total: parsedInstallments,
        paid: paidInstallments,
        amount: installmentValue,
        startDate,
      };

      onAdd({
        title: title.trim(),
        amount: numericAmount,
        dueDate: startDate,
        category: categoryInput.trim() || undefined,
        amountPaid: parsedAmountPaid,
        installment: installmentPayload,
      });

      toast.success("Despesa parcelada adicionada!");
      resetForm();
      setOpen(false);
      return;
    }

    onAdd({
      title: title.trim(),
      amount: numericAmount,
      dueDate: new Date(dueDate),
      category: categoryInput.trim() || undefined,
      amountPaid: parsedAmountPaid,
    });

    toast.success("Despesa adicionada!");
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button className="rounded-lg bg-gradient-primary text-primary-foreground shadow-lg hover:brightness-110">
          <Plus className="mr-2 h-4 w-4" /> Nova despesa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-xl border border-border/40 bg-card/90 shadow-lg">
        <DialogHeader>
          <DialogTitle>Adicionar nova despesa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense-title">Descrição *</Label>
            <Input
              id="expense-title"
              placeholder="Ex: Conta de Luz"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Valor (R$) *</Label>
              <Input
                id="expense-amount"
                placeholder="0,00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-date">Vencimento *</Label>
              <Input
                id="expense-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-paid">Valor já pago (R$)</Label>
            <Input
              id="expense-paid"
              placeholder="0,00"
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
            />
          </div>

          {enableInstallments ? (
            <div className="space-y-3 rounded-lg border border-border/40 bg-muted/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="installment-switch" className="mb-1 block">
                    Possui parcelamento?
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ative para dividir o valor em parcelas mensais.
                  </p>
                </div>
                <Switch
                  id="installment-switch"
                  checked={isInstallment}
                  onCheckedChange={setIsInstallment}
                />
              </div>

              {isInstallment ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="installment-count">Número de parcelas</Label>
                    <Input
                      id="installment-count"
                      type="number"
                      min={2}
                      step={1}
                      value={installmentsCount}
                      onChange={(event) => setInstallmentsCount(event.target.value)}
                    />
                  </div>
                  {amount && Number(amount.replace(/,/g, ".")) > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Valor estimado por parcela: {
                        new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(
                          calculateInstallmentAmount(
                            Number(amount.replace(/,/g, ".")) || 0,
                            Number.parseInt(installmentsCount, 10) || 1
                          )
                        )
                      }
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {!category ? (
            <div className="space-y-2">
              <Label htmlFor="expense-category">Categoria (opcional)</Label>
              <Input
                id="expense-category"
                placeholder="Ex: Moradia, Alimentação"
                value={categoryInput}
                onChange={(event) => setCategoryInput(event.target.value)}
              />
            </div>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-lg border-border/40 bg-secondary/40 text-foreground transition-colors hover:bg-secondary/60"
              onClick={() => handleDialogChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-lg bg-gradient-primary text-primary-foreground shadow-md hover:brightness-110"
            >
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
