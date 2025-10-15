export type ExpenseStatus = "pending" | "paid" | "overdue";

export interface InstallmentPlan {
  total: number;
  paid: number;
  amount: number;
  startDate: Date;
}

export interface FinanceExpense {
  id: string;
  title: string;
  amount: number;
  amountPaid: number;
  dueDate: Date;
  paidDate?: Date;
  status: ExpenseStatus;
  category?: string;
  installment?: InstallmentPlan;
}

export interface HistoryTotals {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
}

export interface FinanceHistoryEntry {
  id: string;
  periodKey: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  totals: HistoryTotals;
  monthlyBills: FinanceExpense[];
  dailyExpenses: FinanceExpense[];
  debts: FinanceExpense[];
  createdAt: string;
}
