import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface AddExpenseDialogProps {
  onAdd: (expense: {
    title: string;
    amount: number;
    dueDate: Date;
    category?: string;
    subcategory?: string;
    description?: string;
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
  categories?: string[];
  subcategories?: Record<string, string[]>;
}

const calculateInstallmentAmount = (total: number, installments: number) => {
  if (installments <= 0) {
    return total;
  }

  return total / installments;
};

const DEFAULT_CATEGORY_OPTION = "Outros";
const DEFAULT_SUBCATEGORY_OPTION = "Outro";

const DEFAULT_SUBCATEGORY_MAP: Record<string, string[]> = {
  Alimentação: ["Mercado", "Restaurante", "Lanches", "Delivery"],
  Combustível: ["Gasolina", "Etanol", "Diesel", "GNV"],
  Manutenção: ["Troca de óleo", "Pneus", "Oficina", "Limpeza"],
  Moradia: ["Água", "Luz", "Telefone", "Internet", "Aluguel", "Condomínio"],
  Educação: ["Cursos", "Livros", "Material didático"],
  Empréstimos: ["Parcelamento", "Financiamento", "Cartão de crédito"],
  Saúde: ["Medicamentos", "Consultas", "Exames", "Plano de saúde"],
  Serviços: ["Streaming", "Assinaturas", "Seguro", "Impostos"],
  Dívidas: ["Cheque especial", "Cartão", "Empréstimo pessoal"],
  "Gastos diários": ["Café", "Almoço", "Pedágio", "Estacionamento"],
  Outros: [DEFAULT_SUBCATEGORY_OPTION],
};

export function AddExpenseDialog({
  onAdd,
  category,
  enableInstallments = false,
  categories = [
    "Alimentação",
    "Combustível",
    "Manutenção",
    "Moradia",
    "Educação",
    "Empréstimos",
    "Saúde",
    "Serviços",
    DEFAULT_CATEGORY_OPTION,
  ],
  subcategories,
}: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const normalizedCategories = useMemo(() => {
    const unique = new Set(categories.length ? categories : [DEFAULT_CATEGORY_OPTION]);
    if (category) {
      unique.add(category);
    }
    if (!unique.has(DEFAULT_CATEGORY_OPTION)) {
      unique.add(DEFAULT_CATEGORY_OPTION);
    }
    return Array.from(unique);
  }, [categories, category]);

  const mergedSubcategoryMap = useMemo(() => {
    return normalizedCategories.reduce<Record<string, string[]>>((acc, item) => {
      const provided = subcategories?.[item];
      const defaults = DEFAULT_SUBCATEGORY_MAP[item];
      const options = provided ?? defaults ?? [DEFAULT_SUBCATEGORY_OPTION];
      acc[item] = options.length ? options : [DEFAULT_SUBCATEGORY_OPTION];
      return acc;
    }, {});
  }, [normalizedCategories, subcategories]);

  const initialCategory = category ?? normalizedCategories[0] ?? DEFAULT_CATEGORY_OPTION;
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const initialSubcategory = (mergedSubcategoryMap[initialCategory] ?? [DEFAULT_SUBCATEGORY_OPTION])[0];
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(initialSubcategory);
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
    setAmount("");
    setDueDate("");
    const baseCategory = category ?? normalizedCategories[0] ?? DEFAULT_CATEGORY_OPTION;
    setSelectedCategory(baseCategory);
    const baseSubcategory = (mergedSubcategoryMap[baseCategory] ?? [DEFAULT_SUBCATEGORY_OPTION])[0];
    setSelectedSubcategory(baseSubcategory);
    setAmountPaid("");
    setIsInstallment(false);
    setInstallmentsCount("2");
    setDescription("");
  };

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    } else {
      const baseCategory = category ?? normalizedCategories[0] ?? DEFAULT_CATEGORY_OPTION;
      setSelectedCategory(baseCategory);
      const baseSubcategory = (mergedSubcategoryMap[baseCategory] ?? [DEFAULT_SUBCATEGORY_OPTION])[0];
      setSelectedSubcategory(baseSubcategory);
      setDescription("");
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedSubcategory || !amount.trim() || !dueDate.trim()) {
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
        title: selectedSubcategory,
        amount: numericAmount,
        dueDate: startDate,
        category: selectedCategory === DEFAULT_CATEGORY_OPTION ? undefined : selectedCategory,
        subcategory: selectedSubcategory,
        description: description.trim() ? description.trim() : undefined,
        amountPaid: parsedAmountPaid,
        installment: installmentPayload,
      });

      toast.success("Despesa parcelada adicionada!");
      resetForm();
      setOpen(false);
      return;
    }

    onAdd({
      title: selectedSubcategory,
      amount: numericAmount,
      dueDate: new Date(dueDate),
      category: selectedCategory === DEFAULT_CATEGORY_OPTION ? undefined : selectedCategory,
      subcategory: selectedSubcategory,
      description: description.trim() ? description.trim() : undefined,
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
          {!category ? (
            <div className="space-y-2">
              <Label htmlFor="expense-category">Categoria *</Label>
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  setSelectedCategory(value);
                  const nextSubcategory = (mergedSubcategoryMap[value] ?? [DEFAULT_SUBCATEGORY_OPTION])[0];
                  setSelectedSubcategory(nextSubcategory);
                }}
              >
                <SelectTrigger id="expense-category" className="h-10">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {normalizedCategories.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="expense-subcategory">Subcategoria *</Label>
            <Select
              value={selectedSubcategory}
              onValueChange={(value) => setSelectedSubcategory(value)}
            >
              <SelectTrigger id="expense-subcategory" className="h-10">
                <SelectValue placeholder="Escolha uma subcategoria" />
              </SelectTrigger>
              <SelectContent>
                {(mergedSubcategoryMap[selectedCategory] ?? [DEFAULT_SUBCATEGORY_OPTION]).map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor="expense-description">Descrição</Label>
            <Textarea
              id="expense-description"
              placeholder="Observações adicionais"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
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
