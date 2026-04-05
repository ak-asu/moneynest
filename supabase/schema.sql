 -- Enums
  create type persona_type as enum ('gig_worker', 'student', 'immigrant', 'retiree', 'single_parent', 'other');
  create type language_type as enum ('en', 'es');
  create type income_stream_type as enum ('steady', 'irregular');
  create type message_role as enum ('user', 'assistant');
  create type saved_item_type as enum ('game', 'simulation', 'document', 'learning', 'plan', 'audio');
  create type document_kind as enum ('insurance', 'lease', 'bill', 'payslip', 'other');
  create type entry_type as enum ('income', 'expense');
  create type entry_source as enum ('manual', 'plaid', 'csv');
  create type confidence_level as enum ('low', 'medium', 'high');
  create type suggestion_type as enum ('insight', 'simulation', 'learning', 'plan');
  create type severity_level as enum ('low', 'medium', 'high');

  -- Core identity
  create table public.users (
    id uuid primary key default gen_random_uuid(),
    auth_id text unique not null,
    email text not null,
    created_at timestamptz default now()
  );

  create table public.profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade unique,
    persona persona_type default 'other',
    language language_type default 'en',
    voice_id text,
    income_monthly numeric(12,2) default 0,
    income_type income_stream_type default 'steady',
    expenses jsonb default '{}',
    debts jsonb default '[]',
    goals jsonb default '[]',
    savings_balance numeric not null default 0,
    financial_health_score int default 0,
    onboarding_completed boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  -- Chat
  create table public.chat_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade,
    title text not null default 'New conversation',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  create table public.messages (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references public.chat_sessions(id) on delete cascade,
    role message_role not null,
    text text,
    components jsonb default '[]',
    created_at timestamptz default now()
  );

  -- Artifacts
  create table public.saved_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade,
    session_id uuid references public.chat_sessions(id) on delete set null,
    type saved_item_type not null,
    component_name text not null,
    component_props jsonb not null,
    profile_snapshot_hash text,
    title text not null,
    created_at timestamptz default now()
  );

  create table public.documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade,
    filename text not null,
    storage_path text not null,
    document_type document_kind default 'other',
    extracted_text text,
    ai_explanation jsonb,
    created_at timestamptz default now()
  );

  create table public.action_plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade,
    session_id uuid references public.chat_sessions(id) on delete set null,
    title text not null,
    steps jsonb default '[]',
    completed_steps int default 0,
    profile_snapshot_hash text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  -- Budget
  create table public.budget_entries (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade,
    category text not null,
    amount numeric(12,2) not null,
    entry_type entry_type not null,
    date date not null,
    source entry_source default 'manual',
    created_at timestamptz default now()
  );

  create table public.plaid_connections (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade unique,
    access_token text not null,
    item_id text not null,
    institution_name text,
    last_synced timestamptz
  );

  -- Intelligence
  create table public.learning_progress (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade,
    concept text not null,
    exposure_count int default 0,
    confidence_level confidence_level default 'low',
    last_seen timestamptz,
    updated_at timestamptz default now(),
    unique(user_id, concept)
  );

  create table public.suggestions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade,
    type suggestion_type not null,
    title text not null,
    reason text,
    severity severity_level default 'medium',
    chat_seed text,
    expires_at timestamptz,
    dismissed boolean default false,
    created_at timestamptz default now()
  );

  -- RLS
  alter table public.users enable row level security;
  alter table public.profiles enable row level security;
  alter table public.chat_sessions enable row level security;
  alter table public.messages enable row level security;
  alter table public.saved_items enable row level security;
  alter table public.documents enable row level security;
  alter table public.action_plans enable row level security;
  alter table public.budget_entries enable row level security;
  alter table public.plaid_connections enable row level security;
  alter table public.learning_progress enable row level security;
  alter table public.suggestions enable row level security;

  -- Helper function
  create or replace function public.get_user_id()
  returns uuid language sql security definer as $$
    select id from public.users where auth_id = auth.uid()::text
  $$;

  -- RLS policies (own data only)
  create policy "users_own" on public.users for all using (auth_id = auth.uid()::text);
  create policy "profiles_own" on public.profiles for all using (user_id = get_user_id());
  create policy "sessions_own" on public.chat_sessions for all using (user_id = get_user_id());
  create policy "messages_own" on public.messages for all using (
    session_id in (select id from public.chat_sessions where user_id = get_user_id())
  );
  create policy "saved_items_own" on public.saved_items for all using (user_id = get_user_id());
  create policy "documents_own" on public.documents for all using (user_id = get_user_id());
  create policy "action_plans_own" on public.action_plans for all using (user_id = get_user_id());
  create policy "budget_entries_own" on public.budget_entries for all using (user_id = get_user_id());
  create policy "plaid_own" on public.plaid_connections for all using (user_id = get_user_id());
  create policy "learning_own" on public.learning_progress for all using (user_id = get_user_id());
  create policy "suggestions_own" on public.suggestions for all using (user_id = get_user_id());

  -- Storage bucket
  insert into storage.buckets (id, name, public) values ('vela-files', 'vela-files', false);
  create policy "files_own" on storage.objects for all using (
    bucket_id = 'vela-files' and auth.uid()::text = (storage.foldername(name))[1]
  );