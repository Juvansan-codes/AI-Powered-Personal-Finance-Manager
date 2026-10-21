-- ====================================================================
-- FinanceFlow — Supabase PostgreSQL Schema
-- ====================================================================
-- Run this script in the Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/hnodbblsmtjxdoqxyxpq/sql/new
-- ====================================================================

-- 1. Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    category TEXT NOT NULL UNIQUE,
    budget_limit NUMERIC(12, 2) NOT NULL CHECK (budget_limit > 0),
    period TEXT NOT NULL DEFAULT 'monthly'
);

-- 3. Create indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 5. Create permissive RLS policies for backend (service_role and anon keys)
CREATE POLICY "Allow full access to transactions" ON public.transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow full access to budgets" ON public.budgets
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. Insert initial default budget categories (optional baseline)
INSERT INTO public.budgets (category, budget_limit, period)
VALUES
    ('Food', 5000.00, 'monthly'),
    ('Transportation', 2000.00, 'monthly'),
    ('Shopping', 3000.00, 'monthly'),
    ('Entertainment', 1500.00, 'monthly'),
    ('Utilities', 2500.00, 'monthly'),
    ('Rent', 12000.00, 'monthly')
ON CONFLICT (category) DO NOTHING;
