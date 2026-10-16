import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { AlertCircle, ArrowLeft, Check, ClipboardList, ImageOff, X } from "lucide-react";
import { LogoMark } from "./LogoMark";
import { CRITICAL_STOCK } from "../data";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "delete";
  icon?: ReactNode;
};

export function Button({ children, variant = "primary", icon, className = "", ...props }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
}

export function Field({ label, required, error, hint, children }: { label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <b> *</b>}
      </span>
      {children}
      {error && (
        <span className="field-error">
          <AlertCircle size={13} />
          {error}
        </span>
      )}
      {hint && !error && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="control" {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="control" {...props} />;
}

export function PageTitle({ icon, title, subtitle, back, action }: { icon?: ReactNode; title: string; subtitle: string; back?: () => void; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <div className="page-title-wrap">
        {icon && <span className="page-icon">{icon}</span>}
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="heading-actions">
        {back && (
          <Button variant="ghost" icon={<ArrowLeft size={17} />} onClick={back}>
            Voltar para a listagem
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}

export function StatusBadge({ stock, active = true }: { stock: number; active?: boolean }) {
  if (!active)
    return (
      <span className="status inactive">
        <span />
        Inativo
      </span>
    );
  const critical = stock <= CRITICAL_STOCK;
  return (
    <span className={`status ${critical ? "critical" : "normal"}`}>
      <span />
      {critical ? "Estoque crítico" : "Estoque normal"}
    </span>
  );
}

export type ToastState = { message: string; kind: "success" | "error" } | null;

export function Toast({ toast, onClose }: { toast: NonNullable<ToastState>; onClose: () => void }) {
  const error = toast.kind === "error";
  return (
    <div className={`toast ${error ? "error" : ""}`} role="status">
      <span className="toast-icon">{error ? <AlertCircle size={16} /> : <Check size={16} />}</span>
      <div>
        <strong>{error ? "Não foi possível concluir" : "Operação concluída"}</strong>
        <p>{toast.message}</p>
      </div>
      <button aria-label="Fechar mensagem" onClick={onClose}>
        <X size={17} />
      </button>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <span>
        <ClipboardList />
      </span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <span className="logo-mark">
        <LogoMark size={26} />
      </span>
      {!compact && (
        <span>
          Stock<span>Control</span>
        </span>
      )}
    </div>
  );
}

/** Imagem do produto com fallback quando não há URL ou ela falha. */
export function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src)
    return (
      <div className="image-placeholder">
        <ImageOff size={28} />
      </div>
    );
  return <img src={src} alt={alt} onError={() => setFailed(src)} />;
}

export function Loading() {
  return (
    <div className="loading-block">
      <span className="spinner dark" />
    </div>
  );
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Ocorreu um erro inesperado.");
