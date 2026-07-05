import Dashboard from "../../components/Dashboard";
import { PAPER, INK } from "../../lib/theme";

export const metadata = {
  title: "Painel — Meu Orçamento",
};

export default function PainelPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: PAPER, minHeight: "100vh", color: INK, maxWidth: 480, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ padding: "18px 16px 2px" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 21, color: INK }}>Meu Orçamento</div>
        <div style={{ fontSize: 11.5, color: "#7C7A6E" }}>Controle manual · sem conexão bancária</div>
      </div>

      {/* onEdit ainda não conectado: será ligado ao TransactionModal na próxima etapa */}
      <Dashboard onEdit={(t) => console.log("Editar lançamento:", t)} />
    </div>
  );
}
