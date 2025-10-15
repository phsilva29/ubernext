import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { FinanceExpense, FinanceHistoryEntry } from "@/types/finance";

export type ExpenseType = "monthly" | "daily" | "debt";

export type FinanceExpenseRecord = Tables<"finance_expenses">;
export type FinanceHistoryRecord = Tables<"finance_history_entries">;
export type FinanceStateRecord = Tables<"finance_state">;

export interface PersistedFinanceSnapshot {
  expenses: FinanceExpenseRecord[];
  history: FinanceHistoryRecord[];
  state: FinanceStateRecord | null;
}

const serializeExpenseForSnapshot = (expense: FinanceExpense) => ({
  id: expense.id,
  title: expense.title,
  amount: expense.amount,
  amountPaid: expense.amountPaid,
  dueDate: expense.dueDate.toISOString(),
  paidDate: expense.paidDate ? expense.paidDate.toISOString() : null,
  status: expense.status,
  category: expense.category ?? null,
  installment: expense.installment
    ? {
        total: expense.installment.total,
        paid: expense.installment.paid,
        amount: expense.installment.amount,
        startDate: expense.installment.startDate.toISOString(),
      }
    : null,
});

const mapExpenseToRecord = (
  expense: FinanceExpense,
  type: ExpenseType,
  userId: string
): Omit<FinanceExpenseRecord, "id" | "created_at" | "updated_at"> => ({
  user_id: userId,
  type,
  title: expense.title,
  amount: expense.amount,
  amount_paid: expense.amountPaid,
  due_date: expense.dueDate.toISOString().split("T")[0],
  paid_date: expense.paidDate ? expense.paidDate.toISOString().split("T")[0] : null,
  category: expense.category ?? null,
  installment_total: expense.installment?.total ?? null,
  installment_paid: expense.installment?.paid ?? null,
  installment_amount: expense.installment?.amount ?? null,
  installment_start: expense.installment?.startDate
    ? expense.installment.startDate.toISOString().split("T")[0]
    : null,
});

export const FinanceService = {
  async loadExpenses() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return { expenses: [] as FinanceExpenseRecord[], lastResetMonth: null };

    const { data, error } = await supabase
      .from("finance_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    if (error) throw error;

    return {
      expenses: data ?? [],
      lastResetMonth: await this.loadLastResetMonth(user.id),
    };
  },

  async loadHistory() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return [];

    const { data, error } = await supabase
      .from("finance_history_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("period_start", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async loadLastResetMonth(userId: string) {
    const { data, error } = await supabase
      .from("finance_state")
      .select("last_reset_month")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data?.last_reset_month ?? null;
  },

  async persistExpenses(
    monthly: FinanceExpense[],
    daily: FinanceExpense[],
    debts: FinanceExpense[],
    lastResetMonth: string
  ) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuário não autenticado");

    await supabase.from("finance_expenses").delete().eq("user_id", user.id);

    const payload = [
      ...monthly.map((expense) => mapExpenseToRecord(expense, "monthly", user.id)),
      ...daily.map((expense) => mapExpenseToRecord(expense, "daily", user.id)),
      ...debts.map((expense) => mapExpenseToRecord(expense, "debt", user.id)),
    ];

    if (payload.length) {
      const { error } = await supabase.from("finance_expenses").insert(payload);
      if (error) throw error;
    }

    const { error: upsertError } = await supabase
      .from("finance_state")
      .upsert({ user_id: user.id, last_reset_month: lastResetMonth }, { onConflict: "user_id" });

    if (upsertError) throw upsertError;
  },

  async persistHistory(history: FinanceHistoryRecord[]) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuário não autenticado");

    if (!history.length) {
      return;
    }

    const historyPayload = history.map((entry) => ({
      ...entry,
      user_id: user.id,
      snapshot: entry.snapshot ?? {},
    }));

    const { error } = await supabase.from("finance_history_entries").insert(historyPayload);
    if (error) throw error;
  },

  async replaceHistory(entries: FinanceHistoryEntry[]) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuário não autenticado");

    await supabase.from("finance_history_entries").delete().eq("user_id", user.id);

    if (!entries.length) {
      return;
    }

    const payload = entries.map((entry) => ({
      user_id: user.id,
      period_key: entry.periodKey,
      period_label: entry.periodLabel,
      period_start: entry.periodStart,
      period_end: entry.periodEnd,
      totals_total: entry.totals.total,
      totals_paid: entry.totals.paid,
      totals_pending: entry.totals.pending,
      totals_overdue: entry.totals.overdue,
      snapshot: {
        monthlyBills: entry.monthlyBills.map(serializeExpenseForSnapshot),
        dailyExpenses: entry.dailyExpenses.map(serializeExpenseForSnapshot),
        debts: entry.debts.map(serializeExpenseForSnapshot),
      },
    }));

    const { error } = await supabase.from("finance_history_entries").insert(payload);
    if (error) throw error;
  },

  async replaceExpenses(
    monthly: FinanceExpense[],
    daily: FinanceExpense[],
    debts: FinanceExpense[],
    lastResetMonth: string
  ) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuário não autenticado");

    const payload = [
      ...monthly.map((expense) => mapExpenseToRecord(expense, "monthly", user.id)),
      ...daily.map((expense) => mapExpenseToRecord(expense, "daily", user.id)),
      ...debts.map((expense) => mapExpenseToRecord(expense, "debt", user.id)),
    ];

    await supabase.from("finance_expenses").delete().eq("user_id", user.id);

    if (payload.length) {
      const { error } = await supabase.from("finance_expenses").insert(payload);
      if (error) throw error;
    }

    const { error: upsertError } = await supabase
      .from("finance_state")
      .upsert({ user_id: user.id, last_reset_month: lastResetMonth }, { onConflict: "user_id" });

    if (upsertError) throw upsertError;
  },

  async upsertExpense(record: FinanceExpense, type: ExpenseType) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuário não autenticado");

    const payload = mapExpenseToRecord(record, type, user.id);
    const { data, error } = await supabase
      .from("finance_expenses")
      .upsert({
        ...payload,
        id: record.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as FinanceExpenseRecord;
  },

  async deleteExpense(id: string) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuário não autenticado");

    const { error } = await supabase
      .from("finance_expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  },
};
