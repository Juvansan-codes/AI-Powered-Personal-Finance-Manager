-- ====================================================================
-- Oria — Supabase PostgreSQL Schema
-- ====================================================================
-- Run this script in the Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/hnodbblsmtjxdoqxyxpq/sql/new
-- ====================================================================

-- 1. Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_sample INTEGER NOT NULL DEFAULT 0
);

-- 2. Create budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    category TEXT NOT NULL,
    budget_limit NUMERIC(12, 2) NOT NULL CHECK (budget_limit > 0),
    period TEXT NOT NULL DEFAULT 'monthly',
    UNIQUE(user_id, category)
);

-- 3. Create indexes for high-performance querying
-- Migration for installations created before authentication was added. Legacy
-- rows remain unassigned (and therefore inaccessible) until you explicitly
-- assign them to an auth.users id.
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_category_key;
CREATE UNIQUE INDEX IF NOT EXISTS budgets_user_category_key ON public.budgets(user_id, category);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 5. Each authenticated person can only access rows assigned to their auth user.
DROP POLICY IF EXISTS "Allow full access to transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow full access to budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users manage their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users manage their own budgets" ON public.budgets;

CREATE POLICY "Users manage their own transactions" ON public.transactions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own budgets" ON public.budgets
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
