"use client";

import React from "react";
import { GREEN, AMBER, LINE, SURFACE, INK } from "../lib/theme";
import type { TransactionStatus } from "../types";

export function StatusPill({ status }: { status: TransactionStatus }) {
  const isDone = status === "pago" || status === "recebido";
  return (
    <span
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10.5,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: "3px 7px",
        borderRadius: 4,
        color: isDone ? GREEN : AMBER,
        background: isDone ? "rgba(47,111,78,0.1)" : "rgba(201,162,39,0.14)",
        border: `1px solid ${isDone ? "rgba(47,111,78,0.35)" : "rgba(201,162,39,0.4)"}`,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

export function IconButton({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: 8,
        border: `1px solid ${LINE}`,
        background: SURFACE,
        cursor: "pointer",
        color: INK,
      }}
    >
      {children}
    </button>
  );
}
