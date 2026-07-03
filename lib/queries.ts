import { supabase } from "./supabaseClient";
import type {
  Category,
  CategoryKind,
  EditScope,
  InstallmentMode,
  SplitMethod,
  Transaction,
  TransactionInput,
  TransactionRow,
} from "../types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function rowToTransaction(r: TransactionRow): Transaction {
  return {
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    date: r.date,
    description: r.description,
    status: r.status,
    categoryId: r.category_id,
    installment: r.installment_group_id
      ? {
          groupId: r.installment_group_id,
          index: r.installment_index ?? 1,
          total: r.installment_total ?? 1,
          recurring: r.is_recurring,
        }
      : undefined,
  };
}

function shiftDateByMonths(iso: string, delta: number): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDate();
  d.setMonth(d.getMonth() + delta);
  if (d.getDate() !== day) d.setDate(0); // corrige overflow (ex.: 31 -> fev)
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Categorias                                                          */
/* ------------------------------------------------------------------ */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("created_at");
  if (error) throw error;
  return data as Category[];
}

export async function createCategory(name: string, kind: CategoryKind, color: string): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, kind, color })
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("categories").update({ name }).eq("id", id);
  if (error) throw error;
}

/** Exclui uma categoria; se houver transações vinculadas, é obrigatório informar targetId (realocação). */
export async function deleteCategory(id: string, targetId?: string): Promise<void> {
  const { count, error: countError } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (countError) throw countError;

  if (count && count > 0) {
    if (!targetId) {
      throw new Error("Categoria possui lançamentos. É necessário informar uma categoria de destino para realocação.");
    }
    const { error: reallocError } = await supabase
      .from("transactions")
      .update({ category_id: targetId })
      .eq("category_id", id);
    if (reallocError) throw reallocError;
  }

  const { error: deleteError } = await supabase.from("categories").delete().eq("id", id);
  if (deleteError) throw deleteError;
}

/* ------------------------------------------------------------------ */
/* Transações                                                          */
/* ------------------------------------------------------------------ */
export async function getTransactionsByMonth(month: string): Promise<Transaction[]> {
  const start = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const endDate = new Date(y, m, 0).getDate(); // último dia do mês
  const end = `${month}-${String(endDate).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data as TransactionRow[]).map(rowToTransaction);
}

/** Para os cálculos de "saldo total" no Dashboard, que precisam olhar todos os meses. */
export async function getAllTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data as TransactionRow[]).map(rowToTransaction);
}

interface CreateOptions {
  mode: InstallmentMode;
  installTotal?: number;
  splitMethod?: SplitMethod;
}

export async function createTransaction(base: TransactionInput, opts: CreateOptions): Promise<void> {
  const { mode, installTotal = 1, splitMethod = "dividir" } = opts;

  if (base.type === "despesa" && mode === "parcelar" && installTotal > 1) {
    const groupId = crypto.randomUUID();
    const perInstallment = splitMethod === "dividir" ? +(base.amount / installTotal).toFixed(2) : base.amount;

    const rows = Array.from({ length: installTotal }, (_, i) => ({
      type: base.type,
      amount: perInstallment,
      date: shiftDateByMonths(base.date, i),
      description: base.description,
      status: i === 0 ? base.status : "pendente",
      category_id: base.categoryId,
      installment_group_id: groupId,
      installment_index: i + 1,
      installment_total: installTotal,
      is_recurring: false,
    }));
    const { error } = await supabase.from("transactions").insert(rows);
    if (error) throw error;
    return;
  }

  if (base.type === "despesa" && mode === "repetir") {
    const groupId = crypto.randomUUID();
    const HORIZON_MONTHS = 12; // mesmo horizonte usado no protótipo
    const rows = Array.from({ length: HORIZON_MONTHS }, (_, i) => ({
      type: base.type,
      amount: base.amount,
      date: shiftDateByMonths(base.date, i),
      description: base.description,
      status: i === 0 ? base.status : "pendente",
      category_id: base.categoryId,
      installment_group_id: groupId,
      installment_index: i + 1,
      installment_total: HORIZON_MONTHS,
      is_recurring: true,
    }));
    const { error } = await supabase.from("transactions").insert(rows);
    if (error) throw error;
    return;
  }

  // Lançamento único
  const { error } = await supabase.from("transactions").insert({
    type: base.type,
    amount: base.amount,
    date: base.date,
    description: base.description,
    status: base.status,
    category_id: base.categoryId,
  });
  if (error) throw error;
}

export async function updateTransaction(transaction: Transaction, base: TransactionInput, scope: EditScope): Promise<void> {
  const patch = {
    type: base.type,
    amount: base.amount,
    date: base.date,
    description: base.description,
    status: base.status,
    category_id: base.categoryId,
  };

  if (!transaction.installment || scope === "only") {
    const { error } = await supabase.from("transactions").update(patch).eq("id", transaction.id);
    if (error) throw error;
    return;
  }

  // Edição em massa: descrição/categoria/valor propagam; status NUNCA propaga (regra 5.2 do SDD)
  const { groupId, index: editIndex } = transaction.installment;
  const massPatch = { description: base.description, category_id: base.categoryId, amount: base.amount };

  let query = supabase.from("transactions").update(massPatch).eq("installment_group_id", groupId);
  if (scope === "future") query = query.gte("installment_index", editIndex);
  const { error } = await query;
  if (error) throw error;

  // O status só é atualizado na própria transação editada
  const { error: statusError } = await supabase
    .from("transactions")
    .update({ status: base.status })
    .eq("id", transaction.id);
  if (statusError) throw statusError;
}

export async function deleteTransaction(transaction: Transaction, scope: EditScope): Promise<void> {
  if (!transaction.installment || scope === "only") {
    const { error } = await supabase.from("transactions").delete().eq("id", transaction.id);
    if (error) throw error;
    return;
  }

  const { groupId, index: editIndex } = transaction.installment;
  if (scope === "all") {
    const { error } = await supabase.from("transactions").delete().eq("installment_group_id", groupId);
    if (error) throw error;
    return;
  }
  // scope === "future"
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("installment_group_id", groupId)
    .gte("installment_index", editIndex);
  if (error) throw error;
}
