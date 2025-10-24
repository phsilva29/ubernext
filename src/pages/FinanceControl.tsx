import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FinancialSummary } from "@/components/finance/FinancialSummary";
import { ExpenseCard } from "@/components/finance/ExpenseCard";
import { AddExpenseDialog } from "@/components/finance/AddExpenseDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { FinanceService, FinanceExpenseRecord, FinanceHistoryRecord } from "@/services/FinanceService";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";
import {
  ArrowLeft,
  ClipboardList,
  Coins,
  LayoutDashboard,
  PiggyBank,
  TrendingUp,
  CalendarDays,
  AlertTriangle,
  History,
  Filter,
  CalendarIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExpenseStatus, FinanceExpense, FinanceHistoryEntry, InstallmentPlan } from "@/types/finance";

type Expense = FinanceExpense;
type ExpenseHistoryEntry = FinanceHistoryEntry;

type NewExpensePayload = {
  title: string;
  amount: number;
  dueDate: Date;
  category?: string;
  subcategory?: string;
  description?: string;
  amountPaid?: number;
  installment?: InstallmentPlan;
};

type HistoryFilterOption = "ultimo-mes" | "ultimos-3-meses" | "ultimo-ano" | "personalizado" | "todos";

interface FinanceRuntimeState {
  monthlyBills: Expense[];
  dailyExpenses: Expense[];
  debts: Expense[];
  history: ExpenseHistoryEntry[];
  lastResetMonth: string;
  lastDailyReset: string;
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
  }).format(date);

const createExpenseId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
        const random = Math.floor(Math.random() * 16);
        const value = char === "x" ? random : (random & 0x3) | 0x8;
        return value.toString(16);
      });

const addMonths = (date: Date, count: number) => {
  const result = new Date(date.getTime());
  result.setMonth(result.getMonth() + count);
  return result;
};

const calculatePaidInstallments = (amountPaid: number, plan: InstallmentPlan, totalAmount: number) => {
  const epsilon = Math.max(plan.amount * 0.001, 0.01);
  if (amountPaid >= totalAmount - epsilon) {
    return plan.total;
  }

  return Math.min(plan.total, Math.floor((amountPaid + epsilon) / plan.amount));
};

const getDueDateForInstallment = (plan: InstallmentPlan) => {
  const offset = plan.paid >= plan.total ? Math.max(plan.total - 1, 0) : plan.paid;
  return addMonths(plan.startDate, offset);
};

const getExpenseStatus = (expense: { amount: number; amountPaid: number; dueDate: Date }): ExpenseStatus => {
  const remaining = Math.max(expense.amount - Math.min(expense.amountPaid, expense.amount), 0);
  if (remaining <= 0) {
    return "paid";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(expense.dueDate);
  due.setHours(0, 0, 0, 0);

  return due < today ? "overdue" : "pending";
};

const withStatus = (expense: Omit<Expense, "status">): Expense => ({
  ...expense,
  status: getExpenseStatus(expense),
});

const CARD_BASE_CLASS = "rounded-2xl border-2 border-border/40 bg-card/95 shadow-lg backdrop-blur-sm";
const CARD_INTERACTIVE_CLASS = `${CARD_BASE_CLASS} transition-all duration-200 hover:-translate-y-[2px] hover:shadow-xl hover:border-primary/40`;
const CARD_MUTED_CLASS = "rounded-2xl border-2 border-dashed border-border/40 bg-muted/20";

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getDayKey = (date: Date = new Date()) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().split("T")[0];
};

const getMonthKeyFromDate = (date: Date) => {
  const target = new Date(date.getTime());
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
};

const parseMonthKey = (key: string) => {
  const [yearString, monthString] = key.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  return { year, month };
};

const createMonthLabel = (key: string) => {
  const { year, month } = parseMonthKey(key);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

const startOfMonthFromKey = (key: string) => {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
};

const endOfMonthFromKey = (key: string) => {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 0, 23, 59, 59, 999);
};

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const rollDueDateToMonth = (date: Date, monthKey: string) => {
  const { year, month } = parseMonthKey(monthKey);
  const targetDay = Math.min(date.getDate(), daysInMonth(year, month));
  const result = new Date(year, month - 1, targetDay);
  result.setHours(0, 0, 0, 0);
  return result;
};

const cloneExpense = (expense: Expense): Expense => ({
  ...expense,
  dueDate: new Date(expense.dueDate),
  paidDate: expense.paidDate ? new Date(expense.paidDate) : undefined,
  archivedOn: expense.archivedOn ? new Date(expense.archivedOn) : undefined,
  subcategory: expense.subcategory,
  description: expense.description,
  installment: expense.installment
    ? {
        ...expense.installment,
        startDate: new Date(expense.installment.startDate),
      }
    : undefined,
});

const computeTotalsFromExpenses = (expenses: Expense[]) => {
  return expenses.reduce(
    (acc, expense) => {
      const paidAmount = Math.min(expense.amountPaid, expense.amount);
      const remaining = Math.max(expense.amount - paidAmount, 0);

      acc.total += expense.amount;
      acc.paid += paidAmount;

      if (remaining > 0) {
        if (expense.status === "overdue") {
          acc.overdue += remaining;
        } else {
          acc.pending += remaining;
        }
      }

      return acc;
    },
    { total: 0, paid: 0, pending: 0, overdue: 0 }
  );
};

const normalizeExpenseWithInstallment = (expense: Omit<Expense, "status">): Expense => {
  if (!expense.installment) {
    return withStatus(expense);
  }

  const paidInstallments = calculatePaidInstallments(expense.amountPaid, expense.installment, expense.amount);
  const fullyPaid = paidInstallments >= expense.installment.total;
  const alignedAmountPaid = fullyPaid
    ? expense.amount
    : paidInstallments * expense.installment.amount;

  const nextInstallment = {
    ...expense.installment,
    paid: paidInstallments,
  };

  return withStatus({
    ...expense,
    amountPaid: alignedAmountPaid,
    installment: nextInstallment,
    dueDate: getDueDateForInstallment(nextInstallment),
  });
};

type SnapshotInstallmentPayload = {
  total: number;
  paid: number;
  amount: number;
  startDate: string;
};

type SnapshotExpensePayload = {
  id: string;
  title: string;
  amount: number;
  amountPaid: number;
  dueDate: string;
  paidDate: string | null;
  status: ExpenseStatus;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  archivedOn?: string | null;
  installment: SnapshotInstallmentPayload | null;
};

const numberFrom = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const dateFrom = (value: string | null | undefined) => {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const mapRecordToExpense = (record: FinanceExpenseRecord): Expense => {
  const base: Omit<Expense, "status"> = {
    id: record.id,
    title: record.title,
    amount: numberFrom(record.amount),
    amountPaid: numberFrom(record.amount_paid),
    dueDate: new Date(record.due_date),
    paidDate: dateFrom(record.paid_date ?? undefined),
    category: record.category ?? undefined,
  subcategory: record.subcategory ?? undefined,
  description: record.description ?? undefined,
    archivedOn: dateFrom(record.archived_on ?? undefined),
    installment: record.installment_total
      ? {
          total: record.installment_total,
          paid: record.installment_paid ?? 0,
          amount: numberFrom(record.installment_amount),
          startDate: dateFrom(record.installment_start) ?? new Date(record.due_date),
        }
      : undefined,
  };

  return normalizeExpenseWithInstallment(base);
};

const mapSnapshotExpense = (raw: unknown): Expense | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const payload = raw as Partial<SnapshotExpensePayload>;
  if (!payload.id || !payload.title || !payload.dueDate) {
    return null;
  }

  const installmentPayload = payload.installment ?? undefined;
  const installment = installmentPayload
    ? {
        total: installmentPayload.total ?? 0,
        paid: installmentPayload.paid ?? 0,
        amount: numberFrom(installmentPayload.amount),
        startDate: dateFrom(installmentPayload.startDate) ?? new Date(payload.dueDate),
      }
    : undefined;

  const dueDate = new Date(payload.dueDate);

  return {
    id: payload.id,
    title: payload.title,
    amount: numberFrom(payload.amount),
    amountPaid: numberFrom(payload.amountPaid),
    dueDate,
    paidDate: payload.paidDate ? dateFrom(payload.paidDate) : undefined,
    status:
      payload.status ??
      getExpenseStatus({ amount: numberFrom(payload.amount), amountPaid: numberFrom(payload.amountPaid), dueDate }),
    category: payload.category ?? undefined,
  subcategory: payload.subcategory ?? undefined,
  description: payload.description ?? undefined,
    archivedOn: payload.archivedOn ? dateFrom(payload.archivedOn) : undefined,
    installment,
  };
};

const mapHistoryRecordToEntry = (record: FinanceHistoryRecord): ExpenseHistoryEntry => {
  const snapshot = (record.snapshot as Record<string, unknown>) ?? {};

  const parseSnapshotList = (value: unknown): Expense[] => {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map(mapSnapshotExpense)
      .filter((expense): expense is Expense => expense !== null);
  };

  return {
    id: record.id,
    periodKey: record.period_key,
    periodLabel: record.period_label,
    periodStart: record.period_start,
    periodEnd: record.period_end,
    totals: {
      total: numberFrom(record.totals_total),
      paid: numberFrom(record.totals_paid),
      pending: numberFrom(record.totals_pending),
      overdue: numberFrom(record.totals_overdue),
    },
    monthlyBills: parseSnapshotList(snapshot.monthlyBills),
    dailyExpenses: parseSnapshotList(snapshot.dailyExpenses),
    debts: parseSnapshotList(snapshot.debts),
    createdAt: record.created_at,
  };
};

const createHistoryEntry = (
  monthKey: string | null,
  monthlyBills: Expense[],
  dailyExpenses: Expense[],
  debts: Expense[]
): ExpenseHistoryEntry | undefined => {
  if (!monthKey) {
    return undefined;
  }

  const hasData = monthlyBills.length || dailyExpenses.length || debts.length;
  if (!hasData) {
    return undefined;
  }

  const clonedMonthly = monthlyBills.map(cloneExpense).map(normalizeExpenseWithInstallment);
  const clonedDaily = dailyExpenses.map(cloneExpense).map(normalizeExpenseWithInstallment);
  const clonedDebts = debts.map(cloneExpense).map(normalizeExpenseWithInstallment);
  const combined = [...clonedMonthly, ...clonedDaily, ...clonedDebts];

  return {
    id: createExpenseId(),
    periodKey: monthKey,
    periodLabel: createMonthLabel(monthKey),
    periodStart: startOfMonthFromKey(monthKey).toISOString(),
    periodEnd: endOfMonthFromKey(monthKey).toISOString(),
    totals: computeTotalsFromExpenses(combined),
    monthlyBills: clonedMonthly,
    dailyExpenses: clonedDaily,
    debts: clonedDebts,
    createdAt: new Date().toISOString(),
  };
};

const runMonthlyResetOnState = (state: FinanceRuntimeState, nextMonthKey: string): FinanceRuntimeState => {
  const previousMonthKey = state.lastResetMonth || nextMonthKey;
  const historyEntry = createHistoryEntry(previousMonthKey, state.monthlyBills, state.dailyExpenses, state.debts);

  const resetMonthlyBills = state.monthlyBills.map((expense) =>
    normalizeExpenseWithInstallment({
      ...expense,
      amountPaid: 0,
      paidDate: undefined,
      dueDate: rollDueDateToMonth(expense.dueDate, nextMonthKey),
    })
  );

  const normalizedDailyExpenses = state.dailyExpenses.map((expense) =>
    normalizeExpenseWithInstallment({
      ...expense,
    })
  );

  const normalizedDebts = state.debts.map((expense) => normalizeExpenseWithInstallment({ ...expense }));

  return {
    monthlyBills: resetMonthlyBills,
    dailyExpenses: normalizedDailyExpenses,
    debts: normalizedDebts,
    history: historyEntry ? [...state.history, historyEntry] : [...state.history],
    lastResetMonth: nextMonthKey,
    lastDailyReset: state.lastDailyReset,
  };
};

export default function FinanceControl() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [isLoading, user, navigate]);

  const [monthlyBills, setMonthlyBills] = useState<Expense[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Expense[]>([]);
  const [historyEntries, setHistoryEntries] = useState<ExpenseHistoryEntry[]>([]);
  const [lastResetMonth, setLastResetMonth] = useState<string>(getCurrentMonthKey());
  const [lastDailyReset, setLastDailyReset] = useState<string>(getDayKey());
  const [isHydrated, setIsHydrated] = useState(false);
  const [historyPeriod, setHistoryPeriod] = useState<HistoryFilterOption>("ultimo-ano");
  const [historyStartDate, setHistoryStartDate] = useState<Date | undefined>(undefined);
  const [historyEndDate, setHistoryEndDate] = useState<Date | undefined>(undefined);
  const [historyStartOpen, setHistoryStartOpen] = useState(false);
  const [historyEndOpen, setHistoryEndOpen] = useState(false);
  const [dailyManagerOpen, setDailyManagerOpen] = useState(false);
  const [dailyManagerDate, setDailyManagerDate] = useState<Date>(new Date());

  const executeMonthlyReset = useCallback(
    (targetMonthKey?: string) => {
      const nextMonthKey = targetMonthKey ?? getCurrentMonthKey();
      const runtimeState: FinanceRuntimeState = {
        monthlyBills,
        dailyExpenses,
        debts,
        history: historyEntries,
        lastResetMonth,
        lastDailyReset,
      };
      const resetState = runMonthlyResetOnState(runtimeState, nextMonthKey);
      setMonthlyBills(resetState.monthlyBills);
      setDailyExpenses(resetState.dailyExpenses);
      setDebts(resetState.debts);
      setHistoryEntries(resetState.history);
      setLastResetMonth(resetState.lastResetMonth);
      setLastDailyReset(resetState.lastDailyReset);
    },
    [monthlyBills, dailyExpenses, debts, historyEntries, lastResetMonth, lastDailyReset]
  );

  const ensureCurrentMonth = useCallback(() => {
    if (!isHydrated) {
      return;
    }

    const currentMonthKey = getCurrentMonthKey();
    if (currentMonthKey !== lastResetMonth) {
      executeMonthlyReset(currentMonthKey);
    }
  }, [executeMonthlyReset, isHydrated, lastResetMonth]);

  const ensureCurrentDay = useCallback(() => {
    if (!isHydrated) {
      return;
    }

    const todayKey = getDayKey();
    if (todayKey === lastDailyReset) {
      return;
    }

    const previousResetDate = new Date(lastDailyReset);
    previousResetDate.setHours(0, 0, 0, 0);

    setDailyExpenses((current) =>
      current.map((expense) => {
        if (expense.archivedOn) {
          return expense;
        }

        const { status: _status, ...rest } = expense;
        return normalizeExpenseWithInstallment({
          ...rest,
          archivedOn: new Date(previousResetDate),
        });
      })
    );

    setLastDailyReset(todayKey);
  }, [isHydrated, lastDailyReset]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      setMonthlyBills([]);
      setDailyExpenses([]);
      setDebts([]);
      setHistoryEntries([]);
      setLastResetMonth(getCurrentMonthKey());
      setIsHydrated(false);
      return;
    }

    let isActive = true;
    setIsHydrated(false);

    const hydrate = async () => {
      try {
        const [expenseResponse, historyResponse] = await Promise.all([
          FinanceService.loadExpenses(),
          FinanceService.loadHistory(),
        ]);

        if (!isActive) {
          return;
        }

        const nextMonthly: Expense[] = [];
        const nextDaily: Expense[] = [];
        const nextDebts: Expense[] = [];

        (expenseResponse.expenses ?? []).forEach((record) => {
          const expense = mapRecordToExpense(record);
          if (record.type === "monthly") {
            nextMonthly.push(expense);
            return;
          }
          if (record.type === "daily") {
            nextDaily.push(expense);
            return;
          }
          nextDebts.push(expense);
        });

        const nextHistory = historyResponse.map(mapHistoryRecordToEntry);

        let runtimeState: FinanceRuntimeState = {
          monthlyBills: nextMonthly,
          dailyExpenses: nextDaily,
          debts: nextDebts,
          history: nextHistory,
          lastResetMonth: expenseResponse.state?.last_reset_month ?? getCurrentMonthKey(),
          lastDailyReset: expenseResponse.state?.last_daily_reset ?? getDayKey(),
        };

        const currentMonthKey = getCurrentMonthKey();
        if (runtimeState.lastResetMonth !== currentMonthKey) {
          runtimeState = runMonthlyResetOnState(runtimeState, currentMonthKey);
        }

        if (!isActive) {
          return;
        }

        setMonthlyBills(runtimeState.monthlyBills);
        setDailyExpenses(runtimeState.dailyExpenses);
        setDebts(runtimeState.debts);
        setHistoryEntries(runtimeState.history);
        setLastResetMonth(runtimeState.lastResetMonth);
        setLastDailyReset(runtimeState.lastDailyReset);
      } catch (error) {
        console.error("Falha ao carregar dados financeiros do Supabase", error);
        if (!isActive) {
          return;
        }
        setMonthlyBills([]);
        setDailyExpenses([]);
        setDebts([]);
        setHistoryEntries([]);
        setLastResetMonth(getCurrentMonthKey());
        setLastDailyReset(getDayKey());
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    };

    void hydrate();

    return () => {
      isActive = false;
    };
  }, [isLoading, user]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const currentMonthKey = getCurrentMonthKey();
    if (currentMonthKey !== lastResetMonth) {
      executeMonthlyReset(currentMonthKey);
    }
  }, [executeMonthlyReset, isHydrated, lastResetMonth]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    ensureCurrentDay();
  }, [ensureCurrentDay, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !user) {
      return;
    }

    const persistExpenses = async () => {
      try {
  await FinanceService.replaceExpenses(monthlyBills, dailyExpenses, debts, lastResetMonth, lastDailyReset);
      } catch (error) {
        console.error("Falha ao sincronizar despesas com o Supabase", error);
      }
    };

    void persistExpenses();
  }, [debts, dailyExpenses, monthlyBills, lastResetMonth, lastDailyReset, isHydrated, user]);

  useEffect(() => {
    if (!isHydrated || !user) {
      return;
    }

    const persistHistory = async () => {
      try {
        await FinanceService.replaceHistory(historyEntries);
      } catch (error) {
        console.error("Falha ao sincronizar histórico financeiro com o Supabase", error);
      }
    };

    void persistHistory();
  }, [historyEntries, isHydrated, user]);

  const allExpenses = useMemo(
    () => [...monthlyBills, ...dailyExpenses, ...debts],
    [monthlyBills, dailyExpenses, debts]
  );

  const totals = useMemo(() => computeTotalsFromExpenses(allExpenses), [allExpenses]);

  const categoryData = useMemo(() => {
    const categories = allExpenses.reduce<Record<string, number>>((acc, expense) => {
      const category = expense.category ?? "Outros";
      acc[category] = (acc[category] ?? 0) + expense.amount;
      return acc;
    }, {});

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [allExpenses]);

  const statusData = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let overdue = 0;

    allExpenses.forEach((expense) => {
      if (expense.status === "paid") {
        paid += expense.amount;
        return;
      }

      const remaining = Math.max(expense.amount - Math.min(expense.amountPaid, expense.amount), 0);
      if (expense.status === "overdue") {
        overdue += remaining;
      } else {
        pending += remaining;
      }
    });

    return [
      { name: "Pagas", value: paid, color: "hsl(var(--success))" },
      { name: "Pendentes", value: pending, color: "hsl(var(--warning))" },
      { name: "Atrasadas", value: overdue, color: "hsl(var(--destructive))" },
    ];
  }, [allExpenses]);

  const typeData = useMemo(
    () => [
      { name: "Contas Mensais", value: monthlyBills.reduce((sum, expense) => sum + expense.amount, 0) },
      { name: "Gastos Diários", value: dailyExpenses.reduce((sum, expense) => sum + expense.amount, 0) },
      { name: "Dívidas", value: debts.reduce((sum, expense) => sum + expense.amount, 0) },
    ],
    [monthlyBills, dailyExpenses, debts]
  );

  const upcomingDues = useMemo(
    () =>
      allExpenses
        .filter((expense) => expense.status !== "paid" && expense.amountPaid < expense.amount)
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .slice(0, 5),
    [allExpenses]
  );

  const expenseDerivedHistory = useMemo(() => {
    if (!isHydrated) {
      return [] as ExpenseHistoryEntry[];
    }

    const buckets = new Map<
      string,
      { monthlyBills: Expense[]; dailyExpenses: Expense[]; debts: Expense[] }
    >();

    const registerExpense = (type: "monthlyBills" | "dailyExpenses" | "debts", expense: Expense) => {
      const monthKey = getMonthKeyFromDate(expense.dueDate);
      if (!buckets.has(monthKey)) {
        buckets.set(monthKey, { monthlyBills: [], dailyExpenses: [], debts: [] });
      }
      const bucket = buckets.get(monthKey)!;
      bucket[type].push(cloneExpense(expense));
    };

    monthlyBills.forEach((expense) => registerExpense("monthlyBills", expense));
    dailyExpenses.forEach((expense) => registerExpense("dailyExpenses", expense));
    debts.forEach((expense) => registerExpense("debts", expense));

    const currentMonthKey = getCurrentMonthKey();

    return Array.from(buckets.entries())
      .map(([monthKey, bucket]) => {
        const combined = [...bucket.monthlyBills, ...bucket.dailyExpenses, ...bucket.debts];
        if (!combined.length) {
          return null;
        }

        const totals = computeTotalsFromExpenses(combined);
        const isCurrentMonth = monthKey === currentMonthKey;

        return {
          id: `synthetic-${monthKey}`,
          periodKey: monthKey,
          periodLabel: isCurrentMonth
            ? `${createMonthLabel(monthKey)} (em andamento)`
            : createMonthLabel(monthKey),
          periodStart: startOfMonthFromKey(monthKey).toISOString(),
          periodEnd: endOfMonthFromKey(monthKey).toISOString(),
          totals,
          monthlyBills: bucket.monthlyBills,
          dailyExpenses: bucket.dailyExpenses,
          debts: bucket.debts,
          createdAt: new Date().toISOString(),
        } satisfies ExpenseHistoryEntry;
      })
      .filter((entry): entry is ExpenseHistoryEntry => entry !== null);
  }, [dailyExpenses, debts, isHydrated, monthlyBills]);

  const historyTimelineEntries = useMemo(() => {
    if (!expenseDerivedHistory.length) {
      return historyEntries;
    }

    const persistedByKey = new Map(historyEntries.map((entry) => [entry.periodKey, entry]));
    const merged = [...historyEntries];
    const currentMonthKey = getCurrentMonthKey();

    expenseDerivedHistory.forEach((entry) => {
      const existingIndex = merged.findIndex((item) => item.periodKey === entry.periodKey);
      if (existingIndex === -1) {
        merged.push(entry);
        return;
      }

      const existing = merged[existingIndex];
      const preferSynthetic =
        entry.periodKey === currentMonthKey ||
        new Date(entry.createdAt).getTime() >= new Date(existing.createdAt).getTime();

      if (preferSynthetic) {
        merged[existingIndex] = entry;
      }
    });

    return merged;
  }, [expenseDerivedHistory, historyEntries]);

  const filteredHistoryEntries = useMemo(() => {
    if (!historyTimelineEntries.length) {
      return [] as ExpenseHistoryEntry[];
    }

    const sorted = [...historyTimelineEntries].sort(
      (a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
    );

    if (historyPeriod === "todos") {
      return sorted;
    }

    let rangeStart: Date | undefined;
    let rangeEnd: Date | undefined = new Date();

    switch (historyPeriod) {
      case "ultimo-mes": {
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        rangeStart = start;
        break;
      }
      case "ultimos-3-meses": {
        const start = new Date();
        start.setMonth(start.getMonth() - 3);
        rangeStart = start;
        break;
      }
      case "ultimo-ano": {
        const start = new Date();
        start.setFullYear(start.getFullYear() - 1);
        rangeStart = start;
        break;
      }
      case "personalizado": {
        rangeStart = historyStartDate;
        rangeEnd = historyEndDate ?? rangeEnd;
        break;
      }
    }

    if (!rangeStart) {
      return sorted;
    }

    const normalizedStart = new Date(rangeStart);
    normalizedStart.setHours(0, 0, 0, 0);
    const normalizedEnd = new Date(rangeEnd ?? new Date());
    normalizedEnd.setHours(23, 59, 59, 999);

    return sorted.filter((entry) => {
      const entryDate = new Date(entry.periodEnd);
      return entryDate >= normalizedStart && entryDate <= normalizedEnd;
    });
  }, [historyTimelineEntries, historyPeriod, historyStartDate, historyEndDate]);

  const historyAggregateTotals = useMemo(
    () =>
      filteredHistoryEntries.reduce(
        (acc, entry) => ({
          total: acc.total + entry.totals.total,
          paid: acc.paid + entry.totals.paid,
          pending: acc.pending + entry.totals.pending,
          overdue: acc.overdue + entry.totals.overdue,
        }),
        { total: 0, paid: 0, pending: 0, overdue: 0 }
      ),
    [filteredHistoryEntries]
  );

  const historyAggregateCount = useMemo(
    () =>
      filteredHistoryEntries.reduce(
        (acc, entry) =>
          acc + entry.monthlyBills.length + entry.dailyExpenses.length + entry.debts.length,
        0
      ),
    [filteredHistoryEntries]
  );

  const historyCategoryBreakdown = useMemo(() => {
    const categoryMap = new Map<string, number>();

    filteredHistoryEntries.forEach((entry) => {
      const combined = [...entry.monthlyBills, ...entry.dailyExpenses, ...entry.debts];
      combined.forEach((expense) => {
        const category = expense.category ?? "Outros";
        categoryMap.set(category, (categoryMap.get(category) ?? 0) + expense.amount);
      });
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredHistoryEntries]);

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--success))",
    "hsl(var(--warning))",
    "hsl(var(--destructive))",
    "hsl(var(--accent))",
  ];

  const updateExpensePayment = (
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>,
    id: string,
    newAmountPaid: number
  ) => {
    if (!isHydrated) {
      return;
    }

    ensureCurrentMonth();
    if (setExpenses === setDailyExpenses) {
      ensureCurrentDay();
    }

    setExpenses((current) =>
      current.map((expense) => {
        if (expense.id !== id) {
          return expense;
        }

        let sanitized = Math.min(Math.max(newAmountPaid, 0), expense.amount);
        let nextInstallment = expense.installment;

        if (expense.installment) {
          const paidInstallments = calculatePaidInstallments(sanitized, expense.installment, expense.amount);
          const fullyPaid = paidInstallments >= expense.installment.total;
          const alignedAmountPaid = fullyPaid
            ? expense.amount
            : paidInstallments * expense.installment.amount;

          sanitized = alignedAmountPaid;
          nextInstallment = {
            ...expense.installment,
            paid: paidInstallments,
          };
        }

        const nextStatus = getExpenseStatus({ ...expense, amountPaid: sanitized });
        const isPaid = nextStatus === "paid";

        return {
          ...expense,
          amountPaid: sanitized,
          status: nextStatus,
          paidDate: isPaid ? expense.paidDate ?? new Date() : undefined,
          dueDate: nextInstallment ? getDueDateForInstallment(nextInstallment) : expense.dueDate,
          installment: nextInstallment,
        };
      })
    );
  };

  const addExpense = (setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>, newExpense: NewExpensePayload) => {
    if (!isHydrated) {
      return;
    }

    ensureCurrentMonth();

    let sanitizedAmountPaid = Math.min(Math.max(newExpense.amountPaid ?? 0, 0), newExpense.amount);
    let nextInstallment = newExpense.installment;

    if (nextInstallment) {
      const paidInstallments = calculatePaidInstallments(sanitizedAmountPaid, nextInstallment, newExpense.amount);
      const fullyPaid = paidInstallments >= nextInstallment.total;
      sanitizedAmountPaid = fullyPaid
        ? newExpense.amount
        : paidInstallments * nextInstallment.amount;

      nextInstallment = {
        ...nextInstallment,
        paid: paidInstallments,
      };
    }

    const baseExpense: Omit<Expense, "status"> = {
      id: createExpenseId(),
      title: newExpense.title,
      amount: newExpense.amount,
      amountPaid: sanitizedAmountPaid,
      dueDate: nextInstallment ? getDueDateForInstallment(nextInstallment) : newExpense.dueDate,
      paidDate: sanitizedAmountPaid >= newExpense.amount ? new Date() : undefined,
      category: newExpense.category,
      subcategory: newExpense.subcategory,
      description: newExpense.description,
      installment: nextInstallment,
    };

    const expense = withStatus(baseExpense);

    setExpenses((current) => [...current, expense]);
  };

  const removeExpense = (setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>, id: string) => {
    if (!isHydrated) {
      return;
    }

    ensureCurrentMonth();
    if (setExpenses === setDailyExpenses) {
      ensureCurrentDay();
    }
    setExpenses((current) => current.filter((expense) => expense.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">Carregando painel financeiro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-1 xs:p-2 sm:p-4 md:p-6">
      <Card className="w-full max-w-7xl rounded-3xl border-2 border-border/40 bg-card/95 p-2 xs:p-3 sm:p-6 md:p-8 lg:p-10 shadow-2xl">
        <CardHeader className="space-y-4 border-b border-border/30 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs xs:text-sm text-muted-foreground">
                <PiggyBank className="h-4 w-4 text-primary" />
                <span>Controle financeiro integrado</span>
              </div>
              <CardTitle className="text-2xl xs:text-3xl font-semibold text-foreground">
                FinanceControl
              </CardTitle>
              <p className="text-xs xs:text-sm text-muted-foreground">
                Análises financeiras, projeções e gestão de despesas para motoristas parceiro.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="gap-2 rounded-xl border-2 border-border/40 bg-background/60 px-4 py-2 text-xs xs:text-sm text-foreground transition-all hover:border-primary/40 hover:bg-primary/10"
                asChild
              >
                <Link to="/">
                  <ArrowLeft className="h-4 w-4" /> Painel principal
                </Link>
              </Button>
              <Button
                variant="secondary"
                className="gap-2 rounded-xl bg-primary/10 px-4 py-2 text-xs xs:text-sm text-primary"
                disabled
              >
                {user.email}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <Tabs defaultValue="overview" className="w-full space-y-8">
            <TabsList className="flex w-full gap-0.5 rounded-lg border border-border/30 bg-background/60 p-0.5 shadow-sm backdrop-blur">
              <TabsTrigger
                value="overview"
                className="flex flex-1 items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 rounded-md px-1 xs:px-2 sm:px-4 py-1.5 xs:py-2 text-xs xs:text-sm font-medium transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <LayoutDashboard className="h-3.5 w-3.5 xs:h-4 xs:w-4" /> Visão geral
              </TabsTrigger>
              <TabsTrigger
                value="expenses"
                className="flex flex-1 items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 rounded-md px-1 xs:px-2 sm:px-4 py-1.5 xs:py-2 text-xs xs:text-sm font-medium transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <ClipboardList className="h-3.5 w-3.5 xs:h-4 xs:w-4" /> Despesas
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="flex flex-1 items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 rounded-md px-1 xs:px-2 sm:px-4 py-1.5 xs:py-2 text-xs xs:text-sm font-medium transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <TrendingUp className="h-3.5 w-3.5 xs:h-4 xs:w-4" /> Tendências
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex flex-1 items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 rounded-md px-1 xs:px-2 sm:px-4 py-1.5 xs:py-2 text-xs xs:text-sm font-medium transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <History className="h-3.5 w-3.5 xs:h-4 xs:w-4" /> Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
            <FinancialSummary
              totalExpenses={totals.total}
              totalPaid={totals.paid}
              totalPending={totals.pending}
              totalOverdue={totals.overdue}
            />

            <div className="grid grid-cols-1 gap-4 xs:gap-6 lg:grid-cols-6">
              <Card className={cn("lg:col-span-3", CARD_INTERACTIVE_CLASS, "border-blue-400/40 bg-blue-500/10")}> 
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Coins className="h-5 w-5 text-primary" /> Distribuição por status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`status-${entry.name}-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className={cn("lg:col-span-3", CARD_INTERACTIVE_CLASS, "border-amber-400/40 bg-amber-500/10")}> 
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarDays className="h-5 w-5 text-primary" /> Próximos vencimentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingDues.length ? (
                      upcomingDues.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex flex-col gap-3 rounded-2xl border-2 border-border/40 bg-background/80 p-4 shadow-lg transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-xl xs:flex-row xs:items-center xs:justify-between"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">{expense.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {expense.category ?? "Sem categoria"}
                              {expense.installment ? (
                                <span className="ml-2 text-[11px] text-muted-foreground/80">
                                  Parcela {Math.min(expense.installment.paid + 1, expense.installment.total)}/{expense.installment.total}
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <div className="text-left xs:text-right">
                            <p className="font-semibold text-foreground">
                              {formatCurrency(Math.max(expense.amount - expense.amountPaid, 0))}
                            </p>
                            <p
                              className={
                                expense.status === "overdue"
                                  ? "text-xs text-destructive"
                                  : "text-xs text-muted-foreground"
                              }
                            >
                              {formatDate(expense.dueDate)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-border/40 bg-background/40 p-8 text-center text-sm text-muted-foreground">
                        Nenhum vencimento pendente.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

              <Card className={cn(CARD_INTERACTIVE_CLASS, "border-purple-400/40 bg-purple-500/10")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" /> Gastos por categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`category-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Minhas despesas</h2>
              <p className="text-sm text-muted-foreground">
                Organize contas recorrentes, gastos diários e obrigações financeiras em um só lugar.
              </p>
            </div>

            <Separator className="border-border/40" />

            <div className="space-y-6">
              <section className="space-y-4 rounded-3xl border-2 border-border/40 bg-background/60 p-4 xs:p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-foreground">Contas mensais</h3>
                  <AddExpenseDialog onAdd={(expense) => addExpense(setMonthlyBills, expense)} />
                </div>
                <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-2 xl:grid-cols-3">
                  {monthlyBills.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      {...expense}
                      onPaymentUpdate={(amountPaid) => updateExpensePayment(setMonthlyBills, expense.id, amountPaid)}
                      onDelete={() => removeExpense(setMonthlyBills, expense.id)}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-4 rounded-3xl border-2 border-border/40 bg-background/60 p-4 xs:p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-foreground">Gastos do dia a dia</h3>
                  <AddExpenseDialog onAdd={(expense) => addExpense(setDailyExpenses, expense)} />
                </div>
                <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-2 xl:grid-cols-3">
                  {dailyExpenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      {...expense}
                      onPaymentUpdate={(amountPaid) => updateExpensePayment(setDailyExpenses, expense.id, amountPaid)}
                      onDelete={() => removeExpense(setDailyExpenses, expense.id)}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-4 rounded-3xl border-2 border-border/40 bg-background/60 p-4 xs:p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-foreground">Dívidas e crédito</h3>
                  <AddExpenseDialog enableInstallments onAdd={(expense) => addExpense(setDebts, expense)} />
                </div>
                <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-2 xl:grid-cols-3">
                  {debts.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      {...expense}
                      onPaymentUpdate={(amountPaid) => updateExpensePayment(setDebts, expense.id, amountPaid)}
                      onDelete={() => removeExpense(setDebts, expense.id)}
                    />
                  ))}
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-8">
            <Card className={cn(CARD_INTERACTIVE_CLASS, "border-sky-400/40 bg-sky-500/10")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" /> Evolução dos gastos
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={typeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={cn(CARD_INTERACTIVE_CLASS, "border-red-400/40 bg-red-500/10")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-warning" /> Alertas e recomendações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>
                    • Você possui {formatCurrency(totals.pending + totals.overdue)} entre valores ainda não quitados.
                  </li>
                  <li>
                    • Considere antecipar o pagamento do cartão de crédito para evitar juros e manter o score saudável.
                  </li>
                  <li>
                    • Registre gastos diários assim que ocorrerem para manter projeções sempre atualizadas.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Histórico financeiro</h2>
              <p className="text-sm text-muted-foreground">
                Consulte meses anteriores que foram resetados automaticamente e filtre por período para acompanhar evolução de despesas, pagamentos e obrigações recorrentes.
              </p>
            </div>

            <Separator className="border-border/40" />

            <Card className={cn(CARD_INTERACTIVE_CLASS, "border-primary/30 bg-primary/5")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="h-5 w-5 text-primary" /> Filtros de período
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Período</Label>
                    <Select
                      value={historyPeriod}
                      onValueChange={(value) => {
                        const next = value as HistoryFilterOption;
                        setHistoryPeriod(next);
                        if (next !== "personalizado") {
                          setHistoryStartDate(undefined);
                          setHistoryEndDate(undefined);
                        }
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione um período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ultimo-mes">Último mês</SelectItem>
                        <SelectItem value="ultimos-3-meses">Últimos 3 meses</SelectItem>
                        <SelectItem value="ultimo-ano">Último ano</SelectItem>
                        <SelectItem value="todos">Todos os registros</SelectItem>
                        <SelectItem value="personalizado">Período personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {historyPeriod === "personalizado" ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Data inicial</Label>
                        <Popover open={historyStartOpen} onOpenChange={setHistoryStartOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-10 w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {historyStartDate
                                ? format(historyStartDate, "PPP", { locale: ptBR })
                                : "Selecionar data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={historyStartDate}
                              onSelect={(date) => {
                                setHistoryStartDate(date ?? undefined);
                                setHistoryStartOpen(false);
                              }}
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Data final</Label>
                        <Popover open={historyEndOpen} onOpenChange={setHistoryEndOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-10 w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {historyEndDate
                                ? format(historyEndDate, "PPP", { locale: ptBR })
                                : "Selecionar data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={historyEndDate}
                              onSelect={(date) => {
                                setHistoryEndDate(date ?? undefined);
                                setHistoryEndOpen(false);
                              }}
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  ) : null}

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setHistoryPeriod("ultimo-ano");
                        setHistoryStartDate(undefined);
                        setHistoryEndDate(undefined);
                      }}
                    >
                      Redefinir filtros
                    </Button>
                  </div>
                </div>

                <Separator className="border-dashed border-border/40" />

                <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border-2 border-blue-400/40 bg-blue-500/10 p-4">
                    <p className="text-xs text-muted-foreground">Despesa total no período</p>
                    <p className="text-xl font-semibold text-blue-600">
                      {formatCurrency(historyAggregateTotals.total)}
                    </p>
                  </div>
                  <div className="rounded-2xl border-2 border-emerald-400/40 bg-emerald-500/10 p-4">
                    <p className="text-xs text-muted-foreground">Valor liquidado</p>
                    <p className="text-xl font-semibold text-emerald-600">
                      {formatCurrency(historyAggregateTotals.paid)}
                    </p>
                  </div>
                  <div className="rounded-2xl border-2 border-amber-400/40 bg-amber-500/10 p-4">
                    <p className="text-xs text-muted-foreground">Pendências</p>
                    <p className="text-xl font-semibold text-amber-600">
                      {formatCurrency(historyAggregateTotals.pending)}
                    </p>
                  </div>
                  <div className="rounded-2xl border-2 border-red-400/40 bg-red-500/10 p-4">
                    <p className="text-xs text-muted-foreground">Atrasos</p>
                    <p className="text-xl font-semibold text-red-600">
                      {formatCurrency(historyAggregateTotals.overdue)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border/40 bg-muted/20 px-3 py-1 font-medium text-foreground">
                    {filteredHistoryEntries.length} {filteredHistoryEntries.length === 1 ? "mês registrado" : "meses registrados"}
                  </span>
                  <span className="rounded-full border border-border/40 bg-muted/20 px-3 py-1 font-medium text-foreground">
                    {historyAggregateCount} lançamentos totais
                  </span>
                </div>

                {historyCategoryBreakdown.length ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Principais categorias</p>
                    <div className="flex flex-wrap gap-2">
                      {historyCategoryBreakdown.slice(0, 6).map((category) => (
                        <span
                          key={category.name}
                          className="rounded-full border border-border/40 bg-background/80 px-3 py-1 text-xs font-medium text-foreground"
                        >
                          {category.name}: {formatCurrency(category.value)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {filteredHistoryEntries.length ? (
              <div className="space-y-6">
                {filteredHistoryEntries.map((entry) => {
                  const combinedExpenses = [
                    ...entry.monthlyBills,
                    ...entry.dailyExpenses,
                    ...entry.debts,
                  ];
                  const categoryTotals = combinedExpenses.reduce<Record<string, number>>((acc, expense) => {
                    const category = expense.category ?? "Outros";
                    acc[category] = (acc[category] ?? 0) + expense.amount;
                    return acc;
                  }, {});
                  const topCategories = Object.entries(categoryTotals)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4);

                  return (
                    <Card
                      key={entry.id}
                      className={cn(
                        CARD_INTERACTIVE_CLASS,
                        "border-primary/30 bg-background/90 shadow-2xl hover:shadow-3xl"
                      )}
                    >
                      <CardHeader>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                            <History className="h-5 w-5 text-primary" /> Histórico de {entry.periodLabel}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.periodStart), "dd/MM/yyyy", { locale: ptBR })} – {format(new Date(entry.periodEnd), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-4">
                          <div className="rounded-2xl border-2 border-blue-400/40 bg-blue-500/10 p-4">
                            <p className="text-xs text-muted-foreground">Despesas totais</p>
                            <p className="text-lg font-semibold text-blue-600">
                              {formatCurrency(entry.totals.total)}
                            </p>
                          </div>
                          <div className="rounded-2xl border-2 border-emerald-400/40 bg-emerald-500/10 p-4">
                            <p className="text-xs text-muted-foreground">Pagamentos efetuados</p>
                            <p className="text-lg font-semibold text-emerald-600">
                              {formatCurrency(entry.totals.paid)}
                            </p>
                          </div>
                          <div className="rounded-2xl border-2 border-amber-400/40 bg-amber-500/10 p-4">
                            <p className="text-xs text-muted-foreground">Restante</p>
                            <p className="text-lg font-semibold text-amber-600">
                              {formatCurrency(entry.totals.pending)}
                            </p>
                          </div>
                          <div className="rounded-2xl border-2 border-red-400/40 bg-red-500/10 p-4">
                            <p className="text-xs text-muted-foreground">Atrasado</p>
                            <p className="text-lg font-semibold text-red-600">
                              {formatCurrency(entry.totals.overdue)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div className="rounded-2xl border-2 border-primary/30 bg-primary/10 p-4">
                            <p className="text-xs text-muted-foreground">Contas mensais</p>
                            <p className="text-lg font-semibold text-foreground">
                              {entry.monthlyBills.length}
                            </p>
                          </div>
                          <div className="rounded-2xl border-2 border-secondary/30 bg-secondary/10 p-4">
                            <p className="text-xs text-muted-foreground">Gastos diários</p>
                            <p className="text-lg font-semibold text-foreground">
                              {entry.dailyExpenses.length}
                            </p>
                          </div>
                          <div className="rounded-2xl border-2 border-purple-400/40 bg-purple-500/10 p-4">
                            <p className="text-xs text-muted-foreground">Dívidas</p>
                            <p className="text-lg font-semibold text-foreground">
                              {entry.debts.length}
                            </p>
                          </div>
                        </div>

                        {topCategories.length ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Categorias com maior impacto
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {topCategories.map(([name, value]) => (
                                <div
                                  key={name}
                                  className="rounded-md border border-border/30 bg-muted/10 px-3 py-2 text-xs"
                                >
                                  <p className="font-medium text-foreground">{name}</p>
                                  <p className="text-muted-foreground">{formatCurrency(value)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {entry.debts.some((expense) => expense.installment) ? (
                          <div className="rounded-lg border border-dashed border-border/40 bg-muted/10 p-4 text-xs text-muted-foreground">
                            <p className="font-medium text-foreground">Parcelamentos ativos</p>
                            <ul className="mt-2 space-y-1">
                              {entry.debts
                                .filter((expense) => expense.installment)
                                .map((expense) => (
                                  <li key={expense.id}>
                                    {expense.title}: {expense.installment?.paid}/{expense.installment?.total} parcelas pagas
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card
                className={cn(CARD_MUTED_CLASS, "bg-background/60 py-16 text-center shadow-none")}
              >
                <CardContent className="space-y-3">
                  <History className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <h3 className="text-lg font-semibold text-foreground">Nenhum histórico disponível</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajuste os filtros de período ou aguarde o próximo reset mensal para visualizar registros aqui.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
