const pad = (n: number) => String(n).padStart(2, "0");

export const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** 09/10/2026 */
export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** 08:45 */
export const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "Agora", "Hoje, 10:42", "Ontem, 16:18" ou "07 out, 09:30" */
export const formatRelative = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  if (now.getTime() - d.getTime() < 60_000) return "Agora";
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) return `Hoje, ${formatTime(iso)}`;
  if (days === 1) return `Ontem, ${formatTime(iso)}`;
  const month = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${pad(d.getDate())} ${month}, ${formatTime(iso)}`;
};

/** yyyy-mm-dd no fuso local (para <input type="date">) */
export const toDateInput = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]!.toUpperCase())
    .join("") || "?";

export const roleLabel = (role: "admin" | "user") => (role === "admin" ? "Administrador" : "Usuário comum");
