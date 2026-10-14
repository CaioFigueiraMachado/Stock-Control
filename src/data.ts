import type { Comment, Movement, Product } from "./types";

export const categories = ["Todos", "Periféricos", "Monitores", "Mobiliário", "Computadores", "Áudio"];
export const productCategories = categories.slice(1);
export const units = ["Unidade", "Caixa", "Kit"];

/** Quantidade igual ou abaixo deste valor é considerada estoque crítico. */
export const CRITICAL_STOCK = 5;

export const photos = {
  monitor: "https://images.unsplash.com/photo-1548611716-3000815a5803?auto=format&fit=crop&w=900&q=85",
  headset: "https://images.unsplash.com/photo-1629317443309-2f4d67092065?auto=format&fit=crop&w=900&q=85",
  keyboard: "https://images.unsplash.com/photo-1533379007656-3a10925da2e2?auto=format&fit=crop&w=900&q=85",
  chair: "https://images.unsplash.com/photo-1588358230342-b0db4bd555c4?auto=format&fit=crop&w=900&q=85",
  desk: "https://images.unsplash.com/photo-1755436612842-d239712f5967?auto=format&fit=crop&w=900&q=85",
  screens: "https://images.unsplash.com/photo-1745910020846-3d4d0088d24d?auto=format&fit=crop&w=900&q=85",
};

// ---------- Dados de demonstração (usados apenas sem Supabase configurado) ----------

export const demoProducts: Product[] = [
  { id: "p-1048", code: "SC-1048", name: "Monitor Vision 27”", category: "Monitores", description: "Monitor QHD com painel IPS e ajuste de altura.", price: 1899.9, stock: 18, unit: "Unidade", active: true, image: photos.monitor },
  { id: "p-1047", code: "SC-1047", name: "Headset Wave Pro", category: "Áudio", description: "Áudio imersivo, microfone removível e conexão USB.", price: 649.9, stock: 4, unit: "Unidade", active: true, image: photos.headset },
  { id: "p-1046", code: "SC-1046", name: "Teclado Key 75", category: "Periféricos", description: "Teclado mecânico compacto com conexão sem fio.", price: 489.9, stock: 27, unit: "Unidade", active: true, image: photos.keyboard },
  { id: "p-1045", code: "SC-1045", name: "Cadeira Axis Office", category: "Mobiliário", description: "Cadeira ergonômica com suporte lombar regulável.", price: 1299, stock: 2, unit: "Unidade", active: true, image: photos.chair },
  { id: "p-1044", code: "SC-1044", name: "Dock Station Connect", category: "Periféricos", description: "Hub profissional USB-C com 10 conexões.", price: 799.9, stock: 32, unit: "Unidade", active: true, image: photos.desk },
  { id: "p-1043", code: "SC-1043", name: "Workstation Core X", category: "Computadores", description: "Desktop de alto desempenho para uso profissional.", price: 7299, stock: 7, unit: "Unidade", active: true, image: photos.screens },
];

export function demoMovementsFor(product: Product): Movement[] {
  const s = product.stock;
  const rows: Omit<Movement, "id" | "productId">[] = [
    { movedAt: "2026-10-09T08:45:00", type: "Entrada", quantity: 20, responsible: "Roberto Almeida", note: "Reposição de estoque", balance: s },
    { movedAt: "2026-10-08T16:20:00", type: "Saída", quantity: 3, responsible: "Ana Costa", note: "Venda de produto", balance: s - 20 },
    { movedAt: "2026-10-08T11:05:00", type: "Saída", quantity: 2, responsible: "Roberto Almeida", note: "Produto separado para pedido", balance: s - 17 },
    { movedAt: "2026-10-07T14:32:00", type: "Entrada", quantity: 10, responsible: "Ana Costa", note: "Compra recebida", balance: s - 15 },
  ];
  return rows.filter(r => r.balance >= 0).map((r, i) => ({ ...r, id: `${product.id}-m${i}`, productId: product.id }));
}

export function demoCommentsFor(productId: string): Comment[] {
  const now = new Date();
  const at = (daysAgo: number, h: number, m: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  return [
    { id: `${productId}-c1`, productId, author: "Ana Costa", role: "Operadora", createdAt: at(0, 10, 42), text: "Produto conferido no recebimento. Embalagem e acessórios em perfeito estado." },
    { id: `${productId}-c2`, productId, author: "Roberto Almeida", role: "Administrador", createdAt: at(1, 16, 18), text: "O lote atual foi organizado no corredor B, prateleira 04." },
    { id: `${productId}-c3`, productId, author: "Marina Lima", role: "Compras", createdAt: at(6, 9, 30), text: "Fornecedor confirmou novo prazo de reposição para a próxima semana." },
  ];
}
