# Setup — Fase 1 (Fundação)

Passo a passo para colocar a base do projeto no ar.

## 1. Criar o projeto no Supabase - ok
1. Acesse [supabase.com](https://supabase.com) → **New project** (plano Free).
2. Anote a **Project URL** e a **anon public key** (Settings → API).
3. Vá em **SQL Editor** → cole todo o conteúdo de `schema.sql` → **Run**.
4. Confira em **Table Editor** se `categories` já veio com as 8 categorias padrão.
5. F@lxmen3077

## 2. Criar o projeto Next.js
```bash
npx create-next-app@latest orcamento-pessoal --typescript --app
cd orcamento-pessoal
npm install @supabase/supabase-js recharts lucide-react
```

## 3. Copiar os arquivos gerados
Copie para o projeto recém-criado:
- `lib/supabaseClient.ts` → `orcamento-pessoal/lib/supabaseClient.ts`
- `lib/queries.ts` → `orcamento-pessoal/lib/queries.ts`
- `types/index.ts` → `orcamento-pessoal/types/index.ts`

## 4. Variáveis de ambiente
Crie `orcamento-pessoal/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY_AQUI
```
> Nunca commite este arquivo. Adicione `.env.local` ao `.gitignore` (o `create-next-app` já faz isso por padrão).

## 5. Testar a conexão
Crie uma página temporária de teste (`app/teste/page.tsx`):
```tsx
import { getCategories } from "@/lib/queries";

export default async function TestePage() {
  const categorias = await getCategories();
  return <pre>{JSON.stringify(categorias, null, 2)}</pre>;
}
```
Rode `npm run dev` e acesse `/teste` — se aparecer a lista de 8 categorias, a Fase 1 está concluída.

## 6. Deploy inicial no Vercel
1. Suba o projeto para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New Project** → importe o repositório.
3. Configure as mesmas variáveis de ambiente do `.env.local` na Vercel (Settings → Environment Variables).
4. Deploy. Você terá uma URL pública `https://seu-projeto.vercel.app` já rodando.

---

Próximo passo (Fase 2): portar os componentes do protótipo (`Dashboard`, `Transacoes`, `Categorias`, modais) para dentro de `app/`, trocando `useState` local pelas funções de `lib/queries.ts`.
