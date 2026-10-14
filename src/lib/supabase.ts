import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Projeto Supabase do StockControl. A chave abaixo é a chave pública (publishable),
 * feita para ficar no navegador; a segurança dos dados vem das regras (RLS) do banco.
 * Para usar outro projeto, defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.
 * Para rodar sem banco (modo demonstração), defina VITE_SUPABASE_URL=demo.
 */
const DEFAULT_URL = "https://gvcerdwheqpcmdcfsowu.supabase.co";
const DEFAULT_KEY = "sb_publishable_3Q56ntyioLn8AEZuPdx1AA_RXKjXviW";

const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const url = envUrl === "demo" ? "" : envUrl || DEFAULT_URL;
const anonKey = envUrl === "demo" ? "" : import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || DEFAULT_KEY;

/** true quando há um projeto Supabase configurado */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export const PRODUCT_IMAGES_BUCKET = "product-images";
