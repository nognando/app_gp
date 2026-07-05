export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const fmtBRL = (n: number | undefined | null) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDateShort = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const monthKey = (iso: string) => iso.slice(0, 7);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addMonths = (isoYYYYMM: string, delta: number) => {
  const [y, m] = isoYYYYMM.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const monthLabel = (isoYYYYMM: string) => {
  const [y, m] = isoYYYYMM.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} de ${y}`;
};
