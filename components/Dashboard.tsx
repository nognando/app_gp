"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { getAllTransactions, getCategories } from "../lib/queries";
import { fmtBRL, fmtDateShort, monthKey, monthLabel, todayISO, addMonths } from "../lib/format";
import { INK, PAPER, SURFACE, LINE, GREEN, RED, AMBER, MUTED } from "../lib/theme";
import { StatusPill } from "./ui";
import type { Category, Transaction } from "../types";

interface DashboardProps {
  /** Chamado quando o usuário toca em um lançamento no drill-down por categoria.
   *  Deve abrir o TransactionModal (a ser portado na próxima etapa). */
  onEdit?: (t: Transaction) => void;
}

export default function Dashboard({ onEdit }: DashboardProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [viewMode, setViewMode] = useState<"mes" | "total">("mes");
  const [selectedCat, setSelectedCat] = useState<{ catId: string; name: string; color: string; value: number } | null>(null);

  async function loadData() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [cats, txs] = await Promise.all([getCategories(), getAllTransactions()]);
      setCategories(cats);
      setTransactions(txs);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Erro ao carregar dados do Supabase.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthTx = transactions.filter((t) => monthKey(t.date) === month);
  const label = monthLabel(month);

  const receitasMes = monthTx.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0);
  const despesasMes = monthTx.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0);

  const saldoTotalAtual = transactions
    .filter((t) => (t.status === "pago" || t.status === "recebido") && t.date <= todayISO())
    .reduce((s, t) => s + (t.type === "receita" ? t.amount : -t.amount), 0);
  const saldoTotalProjetado = transactions
    .filter((t) => monthKey(t.date) <= month)
    .reduce((s, t) => s + (t.type === "receita" ? t.amount : -t.amount), 0);

  const saldoMesAtual = monthTx
    .filter((t) => t.status === "pago" || t.status === "recebido")
    .reduce((s, t) => s + (t.type === "receita" ? t.amount : -t.amount), 0);
  const saldoMesProjetado = receitasMes - despesasMes;

  const saldoAtual = viewMode === "mes" ? saldoMesAtual : saldoTotalAtual;
  const saldoProjetado = viewMode === "mes" ? saldoMesProjetado : saldoTotalProjetado;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthTx.filter((t) => t.type === "despesa").forEach((t) => {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([catId, value]) => {
        const cat = categories.find((c) => c.id === catId);
        return { catId, value, name: cat?.name || "Outros", color: cat?.color || MUTED };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTx, categories]);

  if (loading) {
    return <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 13.5 }}>Carregando painel…</div>;
  }
  if (errorMsg) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ color: RED, fontSize: 13.5, marginBottom: 10 }}>{errorMsg}</div>
        <button onClick={loadData} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${LINE}`, background: SURFACE, cursor: "pointer" }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 96 }}>
      {/* Ledger header */}
      <div style={{ background: SURFACE, margin: "14px 16px 0", borderRadius: 14, border: `1px solid ${LINE}`, padding: "18px 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button onClick={() => setMonth(addMonths(month, -1))} aria-label="Mês anterior" style={iconBtnStyle}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: MUTED }}>
            {label}
          </span>
          <button onClick={() => setMonth(addMonths(month, 1))} aria-label="Próximo mês" style={iconBtnStyle}>
            <ChevronRight size={18} />
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 4 }}>
          {[{ id: "mes", label: "Somente este mês" }, { id: "total", label: "Saldo total (todos os meses)" }].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setViewMode(opt.id as "mes" | "total")}
              style={{
                padding: "5px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                border: `1px solid ${viewMode === opt.id ? GREEN : LINE}`,
                background: viewMode === opt.id ? "rgba(47,111,78,0.1)" : "transparent",
                color: viewMode === opt.id ? GREEN : MUTED,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center", padding: "6px 0 14px" }}>
          <div style={{ fontSize: 12, color: MUTED, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>
            {viewMode === "mes" ? "Saldo do mês" : "Saldo total"}
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 40, fontWeight: 600, color: saldoAtual >= 0 ? INK : RED, lineHeight: 1 }}>
            {fmtBRL(saldoAtual)}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: `1px dashed ${LINE}`, paddingTop: 12, gap: 8 }}>
          <div>
            <div style={miniLabelStyle}>Receitas</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14.5, color: GREEN, marginTop: 2 }}>{fmtBRL(receitasMes)}</div>
          </div>
          <div>
            <div style={miniLabelStyle}>Despesas</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14.5, color: RED, marginTop: 2 }}>{fmtBRL(despesasMes)}</div>
          </div>
          <div>
            <div style={miniLabelStyle}>{viewMode === "mes" ? "Saldo do mês" : "Saldo projetado"}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14.5, color: INK, marginTop: 2 }}>{fmtBRL(saldoProjetado)}</div>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div style={{ margin: "14px 16px 0", background: SURFACE, border: `1px solid ${LINE}`, borderRadius: 14, padding: 18 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, marginBottom: 12, color: INK }}>Gastos por categoria</div>

        {byCategory.length === 0 ? (
          <div style={{ color: MUTED, fontSize: 13.5, padding: "18px 0", textAlign: "center" }}>
            Nenhuma despesa lançada neste mês ainda.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 128, height: 128, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2} stroke="none">
                      {byCategory.map((c) => <Cell key={c.catId} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total do mês</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: INK }}>{fmtBRL(despesasMes)}</div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {byCategory.map((c) => {
                const pct = despesasMes ? (c.value / despesasMes) * 100 : 0;
                return (
                  <button
                    key={c.catId}
                    onClick={() => setSelectedCat(c)}
                    style={{ display: "block", width: "100%", background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, color: INK }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, display: "inline-block" }} />
                        {c.name}
                      </span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>
                        {fmtBRL(c.value)} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: PAPER, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: c.color, borderRadius: 3 }} />
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ textAlign: "center", fontSize: 11, color: MUTED, marginTop: 12 }}>
              Toque em uma categoria para ver os lançamentos do mês
            </div>
          </>
        )}
      </div>

      {selectedCat && (
        <CategoryDetailModal
          category={selectedCat}
          transactions={monthTx.filter((t) => t.categoryId === selectedCat.catId)}
          monthLabelText={label}
          onClose={() => setSelectedCat(null)}
          onEdit={(t) => {
            setSelectedCat(null);
            onEdit?.(t);
          }}
        />
      )}
    </div>
  );
}

function CategoryDetailModal({
  category,
  transactions,
  monthLabelText,
  onClose,
  onEdit,
}: {
  category: { name: string; color: string };
  transactions: Transaction[];
  monthLabelText: string;
  onClose: () => void;
  onEdit: (t: Transaction) => void;
}) {
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(27,43,34,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: PAPER, width: "100%", maxWidth: 480, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: "82vh", overflowY: "auto", padding: "16px 18px 22px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: category.color }} />
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 19, color: INK }}>{category.name}</span>
            </div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{monthLabelText}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: MUTED }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${LINE}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total no mês</span>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: INK }}>{fmtBRL(total)}</span>
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden" }}>
          {sorted.length === 0 && (
            <div style={{ padding: "18px 12px", textAlign: "center", color: MUTED, fontSize: 12.5 }}>
              Nenhum lançamento nesta categoria no mês.
            </div>
          )}
          {sorted.map((t, idx) => (
            <button
              key={t.id}
              onClick={() => onEdit(t)}
              style={{
                width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                padding: "11px 12px", background: "transparent", border: "none", cursor: "pointer",
                borderTop: idx === 0 ? "none" : `1px solid ${LINE}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{fmtDateShort(t.date)}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: RED }}>{fmtBRL(t.amount)}</div>
                <div style={{ marginTop: 3 }}><StatusPill status={t.status} /></div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34,
  borderRadius: 8, border: `1px solid ${LINE}`, background: SURFACE, cursor: "pointer", color: INK,
};
const miniLabelStyle: React.CSSProperties = {
  fontSize: 10.5, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em",
};
