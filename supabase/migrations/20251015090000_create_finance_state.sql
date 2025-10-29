CREATE TABLE IF NOT EXISTS public.finance_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('monthly', 'daily', 'debt')),
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    paid_date DATE,
    category TEXT,
    archived_on DATE,
    installment_total INTEGER,
    installment_paid INTEGER,
    installment_amount NUMERIC(12, 2),
    installment_start DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_finance_expenses_user ON public.finance_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_type ON public.finance_expenses(user_id, type);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_due_date ON public.finance_expenses(user_id, due_date);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_finance_expenses_updated_at'
          AND tgrelid = 'public.finance_expenses'::regclass
    ) THEN
        CREATE TRIGGER update_finance_expenses_updated_at
        BEFORE UPDATE ON public.finance_expenses
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;

ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_expenses'
          AND policyname = 'Users can view their finance expenses'
    ) THEN
        CREATE POLICY "Users can view their finance expenses"
        ON public.finance_expenses
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_expenses'
          AND policyname = 'Users can insert their finance expenses'
    ) THEN
        CREATE POLICY "Users can insert their finance expenses"
        ON public.finance_expenses
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_expenses'
          AND policyname = 'Users can update their finance expenses'
    ) THEN
        CREATE POLICY "Users can update their finance expenses"
        ON public.finance_expenses
        FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_expenses'
          AND policyname = 'Users can delete their finance expenses'
    ) THEN
        CREATE POLICY "Users can delete their finance expenses"
        ON public.finance_expenses
        FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.finance_history_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_key TEXT NOT NULL,
    period_label TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    totals_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    totals_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    totals_pending NUMERIC(12, 2) NOT NULL DEFAULT 0,
    totals_overdue NUMERIC(12, 2) NOT NULL DEFAULT 0,
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_finance_history_user ON public.finance_history_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_history_period ON public.finance_history_entries(user_id, period_key);

ALTER TABLE public.finance_history_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_history_entries'
          AND policyname = 'Users can view their finance history'
    ) THEN
        CREATE POLICY "Users can view their finance history"
        ON public.finance_history_entries
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_history_entries'
          AND policyname = 'Users can insert their finance history'
    ) THEN
        CREATE POLICY "Users can insert their finance history"
        ON public.finance_history_entries
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_history_entries'
          AND policyname = 'Users can delete their finance history'
    ) THEN
        CREATE POLICY "Users can delete their finance history"
        ON public.finance_history_entries
        FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.finance_state (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_reset_month TEXT NOT NULL,
    last_daily_reset TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_finance_state_updated_at'
          AND tgrelid = 'public.finance_state'::regclass
    ) THEN
        CREATE TRIGGER update_finance_state_updated_at
        BEFORE UPDATE ON public.finance_state
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;

ALTER TABLE public.finance_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_state'
          AND policyname = 'Users can view their finance state'
    ) THEN
        CREATE POLICY "Users can view their finance state"
        ON public.finance_state
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_state'
          AND policyname = 'Users can upsert their finance state'
    ) THEN
        CREATE POLICY "Users can upsert their finance state"
        ON public.finance_state
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_state'
          AND policyname = 'Users can update their finance state'
    ) THEN
        CREATE POLICY "Users can update their finance state"
        ON public.finance_state
        FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;
END;
$$;
