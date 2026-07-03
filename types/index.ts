export type TransactionType = "receita" | "despesa";
export type TransactionStatus = "pago" | "recebido" | "pendente";
export type CategoryKind = "receita" | "despesa";
export type EditScope = "only" | "future" | "all";
export type InstallmentMode = "unico" | "repetir" | "parcelar";
export type SplitMethod = "dividir" | "multiplicar";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  created_at?: string;
}

export interface Installment {
  groupId: string;
  index: number;
  total: number;
  recurring?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // formato ISO: YYYY-MM-DD
  description: string;
  status: TransactionStatus;
  categoryId: string;
  installment?: Installment;
}

// Formato "cru" como vem do banco (colunas em snake_case)
export interface TransactionRow {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  status: TransactionStatus;
  category_id: string;
  installment_group_id: string | null;
  installment_index: number | null;
  installment_total: number | null;
  is_recurring: boolean;
  created_at?: string;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  status: TransactionStatus;
  categoryId: string;
}
