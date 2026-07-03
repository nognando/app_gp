# Documento de Design de Software (SDD)
## Aplicativo de Gestão de Orçamento Pessoal

**Versão:** 1.0
**Status:** Pronto para início de desenvolvimento
**Documentos de origem:** `PRD.md`, `Briefing.md`, protótipo navegável (`orcamento-pessoal-prototipo.jsx`)

---

## 1. Introdução

### 1.1 Propósito
Este documento traduz os requisitos definidos no PRD e no Briefing em uma especificação técnica: arquitetura, modelo de dados, contratos de API, regras de negócio detalhadas e plano de implementação. Serve como referência única para iniciar o desenvolvimento sem ambiguidade sobre "como construir" o que já foi validado no protótipo.

### 1.2 Escopo
Cobre o MVP: Web App responsivo, sem autenticação, com CRUD de transações e categorias, compras parceladas/recorrentes, dashboard com saldo (mês e total) e gráficos por categoria, e persistência em nuvem.

Fora do escopo desta versão: autenticação/multiusuário, Open Finance, notificações push, apps nativos.

### 1.3 Público-alvo do documento
Desenvolvedor(es) responsável(is) pela implementação — pode ser o próprio autor do PRD atuando como dev, ou um time contratado.

### 1.4 Definições
| Termo | Significado |
|---|---|
| Lançamento | Registro de receita ou despesa |
| Parcela | Uma ocorrência de uma compra parcelada, vinculada a um `installment_group` |
| Recorrência | Lançamento que se repete automaticamente todo mês |
| Realocação | Mover transações de uma categoria para outra antes de excluir a origem |

---

## 2. Visão Arquitetural

### 2.1 Estilo arquitetural
**Jamstack simples de 2 camadas**, sem backend próprio: o frontend (Next.js) fala diretamente com o Supabase (Postgres + API REST/Realtime autogerada) via SDK cliente. Não há servidor Node intermediário — reduz custo, complexidade e superfície de manutenção, adequado para um app pessoal.

```
┌─────────────────────┐        HTTPS         ┌──────────────────────────┐
│   Next.js (Vercel)   │ ───────────────────► │   Supabase (Postgres)    │
│  React + Componentes │ ◄─────────────────── │  API REST/Realtime auto  │
│  do protótipo atual  │                       │  gerada + Auth (futuro)  │
└─────────────────────┘                        └──────────────────────────┘
```

### 2.2 Stack tecnológica

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | Next.js (React) | Reaproveita ~90% dos componentes já construídos no protótipo |
| Estilização | CSS-in-JS inline (como no protótipo) | Consistência com o que já foi validado; sem dependência extra |
| Gráficos | Recharts | Já usado no protótipo (donut de categorias) |
| Ícones | lucide-react | Já usado no protótipo |
| Banco de dados | PostgreSQL via Supabase | Modelo relacional se encaixa bem em transações/categorias/parcelas |
| Acesso a dados | `@supabase/supabase-js` (client-side) | Sem necessidade de backend próprio no MVP |
| Hospedagem frontend | Vercel (plano Free/Hobby) | Deploy automático via Git, HTTPS grátis |
| Hospedagem banco | Supabase (plano Free) | Inclui banco, API e painel administrativo |

### 2.3 Por que sem autenticação no MVP (conforme PRD §6)
O acesso direto sem login está mantido. Para não deixar o banco totalmente aberto na internet, a proteção recomendada é:
- Chave `anon` do Supabase restrita por **Row Level Security (RLS)** simples (ex.: liberar tudo, já que é uso pessoal e a URL não será divulgada), **ou**
- Uma variável de ambiente com uma senha simples de "portão" no Next.js (middleware básico), sem virar sistema de contas.

Essa decisão fica registrada aqui para não ser esquecida — é um ponto de atenção mesmo em uso pessoal, pois o Supabase Free é publicamente acessível pela URL do projeto se a RLS não for configurada.

---

## 3. Estrutura do Projeto (Frontend)

```
/app
  /painel            → página Dashboard
  /transacoes        → página Extrato
  /categorias         → página Categorias
  /layout.tsx         → shell com bottom nav + FAB
/components
  Dashboard.tsx
  Transacoes.tsx
  Categorias.tsx
  TransactionModal.tsx
  CategoryDetailModal.tsx
  ReallocateModal.tsx
  ui/ (StatusPill, IconButton, NavBtn...)
/lib
  supabaseClient.ts
  queries.ts          → funções de acesso a dados (get/insert/update/delete)
  installments.ts      → lógica de geração/edição em massa de parcelas
  format.ts            → fmtBRL, fmtDateShort, addMonths, etc. (já existem no protótipo)
/types
  index.ts             → Transaction, Category, InstallmentScope
```

> Observação: os arquivos em `/components` correspondem quase 1:1 aos componentes já escritos no protótipo (`Dashboard`, `Transacoes`, `Categorias`, `TransactionModal`, `CategoryDetailModal`, `ReallocateModal`). O trabalho principal é trocar `useState` local por chamadas ao Supabase.

---

## 4. Modelo de Dados

### 4.1 Diagrama Entidade-Relacionamento (textual)

```
categories                         transactions
──────────                         ─────────────
id (PK)                            id (PK)
name                                type            (receita | despesa)
kind            (receita|despesa)   amount          (numeric)
color                                date            (date)
created_at                          description
                                     status          (pago|recebido|pendente)
                                     category_id (FK) → categories.id
                                     installment_group_id (nullable, uuid)
                                     installment_index    (nullable, int)
                                     installment_total    (nullable, int)
                                     is_recurring          (bool, default false)
                                     created_at
```

Relacionamento: `transactions.category_id` → `categories.id` (N:1). Parcelas de uma mesma compra compartilham `installment_group_id`.

### 4.2 DDL de referência (PostgreSQL / Supabase)

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('receita', 'despesa')),
  color text not null,
  created_at timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('receita', 'despesa')),
  amount numeric(12,2) not null check (amount > 0),
  date date not null,
  description text not null,
  status text not null check (status in ('pago', 'recebido', 'pendente')),
  category_id uuid references categories(id) on delete restrict,
  installment_group_id uuid,
  installment_index int,
  installment_total int,
  is_recurring boolean default false,
  created_at timestamptz default now()
);

create index idx_transactions_date on transactions (date);
create index idx_transactions_category on transactions (category_id);
create index idx_transactions_installment_group on transactions (installment_group_id);
```

**Nota de integridade:** `on delete restrict` em `category_id` impede exclusão direta de categoria com transações vinculadas no nível do banco — reforça a regra de negócio do PRD §4.1 (realocação obrigatória), que também é validada na camada de aplicação antes de chegar ao banco.

### 4.3 Categorias padrão (seed)
Replicar as 8 categorias já usadas no protótipo (Salário, Alimentação, Moradia, Lazer, Transporte, Saúde, Assinaturas, Outros) como registro inicial via script de seed ou migration.

---

## 5. Regras de Negócio (detalhamento para implementação)

### 5.1 Cadastro inteligente (PRD §4.2)
Ao criar uma despesa, três modos:
- **Único:** insere 1 linha em `transactions`.
- **Repetir:** gera N lançamentos mensais (horizonte sugerido: 12 meses, conforme protótipo), todos com o mesmo `installment_group_id` e `is_recurring = true`. Apenas a primeira ocorrência herda o status informado; as demais nascem `pendente`.
- **Parcelar:** gera N lançamentos com `installment_group_id` compartilhado, `installment_index` de 1 a N e `installment_total = N`. Dois submodos de cálculo do valor:
  - *Dividir valor total:* `amount_parcela = valor_informado / N`
  - *Multiplicar parcela:* `amount_parcela = valor_informado` (cada parcela recebe o valor cheio)

### 5.2 Edição em massa (PRD §4.2)
Ao editar um lançamento que possui `installment_group_id`, perguntar o escopo:
- **Somente esta parcela:** `UPDATE` apenas na linha editada.
- **Esta e as futuras:** `UPDATE` em todas as linhas do grupo com `installment_index >= index_atual`.
- **Todas as parcelas:** `UPDATE` em todas as linhas do grupo.

Campos propagados na edição em massa: descrição, categoria e valor. O **status** nunca é propagado — cada parcela mantém seu próprio status de pagamento.

### 5.3 Exclusão em massa
Mesma lógica de escopo do item 5.2, mas com `DELETE` em vez de `UPDATE`.

### 5.4 Exclusão de categoria com transações (PRD §4.1)
1. Verificar se existe ao menos uma transação com `category_id` = categoria alvo.
2. Se sim, bloquear a exclusão direta e abrir o fluxo de realocação: usuário escolhe categoria destino (mesmo `kind`).
3. `UPDATE transactions SET category_id = :destino WHERE category_id = :origem`.
4. Só então `DELETE FROM categories WHERE id = :origem`.
Isso deve ser executado como uma transação de banco (`BEGIN...COMMIT`) para evitar estado inconsistente.

### 5.5 Saldo do mês vs. saldo total (novo requisito incorporado ao protótipo)
| Modo | Saldo atual | Saldo projetado |
|---|---|---|
| **Mês** | Soma de `pago`/`recebido` **somente** do mês selecionado | Receitas do mês − despesas do mês (independente do status) |
| **Total** | Soma acumulada de `pago`/`recebido` de todos os lançamentos até a data de hoje | Soma acumulada (receita − despesa) de tudo até o fim do mês selecionado |

### 5.6 Filtros da tela de Transações
Filtros combináveis, aplicados sobre o conjunto já restrito ao mês selecionado:
- **Status:** Todos / Pago-recebido / Pendente
- **Tipo:** Todos / Receita / Despesa

### 5.7 Detalhamento por categoria (drill-down)
Ao tocar em uma categoria no gráfico do Dashboard, listar as transações do tipo `despesa` daquela categoria **restritas ao mês selecionado**, com total e possibilidade de editar cada item.

---

## 6. Camada de Acesso a Dados (equivalente a "API")

Como não há backend próprio, as "rotas" são funções TypeScript que encapsulam chamadas ao Supabase client. Isso mantém os componentes React desacoplados dos detalhes do banco.

```ts
// lib/queries.ts (assinaturas de referência)
getCategories(): Promise<Category[]>
createCategory(name: string, kind: 'receita' | 'despesa'): Promise<Category>
renameCategory(id: string, name: string): Promise<void>
deleteCategoryWithReallocation(fromId: string, toId: string): Promise<void>

getTransactionsByMonth(month: string): Promise<Transaction[]>
createTransaction(base: TransactionInput, mode: 'unico'|'repetir'|'parcelar', opts): Promise<void>
updateTransaction(id: string, base: TransactionInput, scope: 'only'|'future'|'all'): Promise<void>
deleteTransaction(id: string, scope: 'only'|'future'|'all'): Promise<void>
```

Todas as funções acima já têm sua lógica de negócio equivalente implementada no protótipo em memória (`handleSave`, `handleDelete`, `requestDeleteCategory`, `confirmReallocate`) — a tarefa de desenvolvimento é portar essa lógica para operações Supabase (`insert`, `update`, `delete`, `.match()`) em vez de `setState`.

---

## 7. Requisitos Não Funcionais

| Requisito | Como é atendido |
|---|---|
| Responsivo (mobile/tablet/desktop) | Layout já construído mobile-first no protótipo, `max-width: 480px` centralizado — expandir breakpoints ao portar |
| HTTPS/SSL | Automático via Vercel e Supabase |
| Tempo real entre dispositivos | Supabase Realtime (opcional, pode ficar para fase 2) ou simplesmente refetch ao focar a aba |
| Disponibilidade | SLA dos planos free do Vercel/Supabase (adequado para uso pessoal, sem garantia formal) |
| Sem dependência de app store | Web App puro |

---

## 8. Plano de Implementação (fases sugeridas)

**Fase 1 — Fundação**
- Criar projeto Supabase, rodar o DDL da seção 4.2, popular seed de categorias.
- Criar projeto Next.js, configurar `supabaseClient.ts`, variáveis de ambiente.
- Deploy inicial "hello world" no Vercel conectado ao Git.

**Fase 2 — Portar o protótipo**
- Migrar componentes de UI (Dashboard, Transações, Categorias, modais) quase sem alteração visual.
- Substituir estado local por chamadas às funções de `lib/queries.ts`.

**Fase 3 — Regras de negócio críticas**
- Parcelamento e recorrência (5.1)
- Edição/exclusão em massa (5.2/5.3)
- Realocação de categoria (5.4)

**Fase 4 — Polimento**
- Autocompletar de descrição baseado em histórico (PRD §5)
- Estados de carregamento/erro
- Testes manuais dos fluxos críticos (checklist na seção 9)

**Fase 5 — Deploy final**
- Configurar RLS básica no Supabase
- Apontar domínio (opcional) e validar em produção

---

## 9. Checklist de Testes Manuais (aceite do MVP)

- [ ] Criar receita e despesa simples e ver refletido no saldo do mês
- [ ] Criar despesa parcelada em 6x (dividir total) e conferir soma das parcelas = total
- [ ] Criar despesa parcelada com "multiplicar parcela" e conferir total = valor × N
- [ ] Editar "esta e futuras" parcelas e confirmar que parcelas passadas não mudam
- [ ] Excluir "todas as parcelas" e confirmar remoção completa do grupo
- [ ] Excluir categoria com transações → forçar realocação → confirmar categoria antiga sumiu e transações migraram
- [ ] Alternar toggle "Mês"/"Total" no Dashboard e validar os números
- [ ] Aplicar filtros de status e tipo na tela de Transações
- [ ] Clicar em categoria no gráfico e ver lançamentos corretos do mês
- [ ] Testar em viewport mobile, tablet e desktop

---

## 10. Referências
- `PRD.md` — requisitos funcionais e não funcionais completos
- `Briefing.md` — visão de produto e público-alvo
- `orcamento-pessoal-prototipo.jsx` — protótipo navegável de referência de UI/UX e lógica de estado
