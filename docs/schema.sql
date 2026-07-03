-- =====================================================================
-- Gestão de Orçamento Pessoal — Schema inicial (Supabase / PostgreSQL)
-- Execute este arquivo inteiro no SQL Editor do painel do Supabase.
-- =====================================================================

-- Extensão necessária para gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tabela: categories
-- ---------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('receita', 'despesa')),
  color text not null,
  created_at timestamptz not null default now()
);

comment on table categories is 'Categorias e subcategorias de receitas/despesas do usuário';

-- ---------------------------------------------------------------------
-- Tabela: transactions
-- ---------------------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('receita', 'despesa')),
  amount numeric(12,2) not null check (amount > 0),
  date date not null,
  description text not null,
  status text not null check (status in ('pago', 'recebido', 'pendente')),
  category_id uuid not null references categories(id) on delete restrict,
  installment_group_id uuid,
  installment_index int,
  installment_total int,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table transactions is 'Lançamentos de receitas e despesas, incluindo parcelas e recorrências';

-- Índices de performance para as consultas mais comuns (por mês, por categoria, por grupo de parcela)
create index if not exists idx_transactions_date on transactions (date);
create index if not exists idx_transactions_category on transactions (category_id);
create index if not exists idx_transactions_installment_group on transactions (installment_group_id);

-- ---------------------------------------------------------------------
-- Seed: categorias padrão (mesmas do protótipo)
-- ---------------------------------------------------------------------
insert into categories (name, kind, color) values
  ('Salário',       'receita', '#2F6F4E'),
  ('Alimentação',   'despesa', '#C1622E'),
  ('Moradia',       'despesa', '#4A6670'),
  ('Lazer',         'despesa', '#9C6B9E'),
  ('Transporte',    'despesa', '#7A8B4F'),
  ('Saúde',         'despesa', '#C9A227'),
  ('Assinaturas',   'despesa', '#5B7B9A'),
  ('Outros',        'despesa', '#8C8C7A')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Row Level Security (RLS)
-- MVP sem autenticação (PRD §6): liberamos leitura/escrita pela chave
-- pública "anon", mas com RLS LIGADA para que nada fique acessível por
-- engano além do que definimos aqui. Isso é o mínimo recomendado mesmo
-- para uso pessoal, já que a URL do Supabase é pública por padrão.
-- ---------------------------------------------------------------------
alter table categories enable row level security;
alter table transactions enable row level security;

create policy "categories: acesso total (anon)" on categories
  for all
  using (true)
  with check (true);

create policy "transactions: acesso total (anon)" on transactions
  for all
  using (true)
  with check (true);

-- =====================================================================
-- Observação para o futuro (fora do MVP):
-- Se um dia adicionar login, troque as políticas acima por regras que
-- filtrem por user_id, e adicione a coluna user_id nas duas tabelas.
-- =====================================================================
