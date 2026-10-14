/**
 * Camada de dados do StockControl.
 *
 * Com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY definidas, tudo é lido e gravado
 * no Supabase (Auth, Postgres e Storage). Sem elas, o app roda em modo
 * demonstração com dados em memória — útil para ver as telas sem backend.
 */
import { demoCommentsFor, demoMovementsFor, demoProducts } from "../data";
import type { Comment, Movement, MovementType, MovementWithProduct, Product, ProductInput, Profile, Role } from "../types";
import { PRODUCT_IMAGES_BUCKET, isSupabaseConfigured, supabase } from "./supabase";

export const isDemo = !isSupabaseConfigured;

export class ApiError extends Error {}

// ---------------------------------------------------------------------------
// Mapeamento de linhas do banco
// ---------------------------------------------------------------------------

type ProductRow = {
  id: string; code: string; name: string; category: string; description: string;
  price: number | string; stock: number; unit: string; active: boolean; image_url: string | null;
};
type MovementRow = {
  id: string; product_id: string; type: MovementType; quantity: number; note: string | null;
  balance: number; responsible_name: string; moved_at: string;
};
type CommentRow = {
  id: string; product_id: string; author_name: string; author_role: string; body: string; created_at: string;
};

const toProduct = (r: ProductRow): Product => ({
  id: r.id, code: r.code, name: r.name, category: r.category, description: r.description,
  price: Number(r.price), stock: r.stock, unit: r.unit, active: r.active, image: r.image_url ?? "",
});
const toMovement = (r: MovementRow): Movement => ({
  id: r.id, productId: r.product_id, type: r.type, quantity: r.quantity, note: r.note ?? "",
  balance: r.balance, responsible: r.responsible_name, movedAt: r.moved_at,
});
const toComment = (r: CommentRow): Comment => ({
  id: r.id, productId: r.product_id, author: r.author_name, role: r.author_role, text: r.body, createdAt: r.created_at,
});
const fromInput = (p: ProductInput) => ({
  name: p.name.trim(), category: p.category, description: p.description.trim(), price: p.price,
  stock: p.stock, unit: p.unit, active: p.active, image_url: p.image || null,
});

function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos. Verifique seus dados e tente novamente.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("user already registered")) return "Já existe uma conta com este e-mail.";
  if (m.includes("password should be at least")) return "A senha deve ter pelo menos 8 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  if (m.includes("estoque insuficiente")) return "Não há quantidade suficiente em estoque para realizar esta saída.";
  if (m.includes("permission") || m.includes("row-level security") || m.includes("apenas administradores"))
    return "Seu perfil não possui permissão para esta ação.";
  return message;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new ApiError(translate(res.error.message));
  return res.data;
}

const sb = () => {
  if (!supabase) throw new ApiError("Supabase não configurado.");
  return supabase;
};

// ---------------------------------------------------------------------------
// Estado do modo demonstração
// ---------------------------------------------------------------------------

const demo = {
  profile: null as Profile | null,
  products: demoProducts.map(p => ({ ...p })),
  movements: demoProducts.flatMap(demoMovementsFor),
  comments: demoProducts.flatMap(p => demoCommentsFor(p.id)),
  nextCode: 1049,
};
const wait = (ms = 350) => new Promise(r => setTimeout(r, ms));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------

async function loadProfile(userId: string, email: string): Promise<Profile> {
  const row = check(await sb().from("usuarios").select("id, name, role").eq("id", userId).maybeSingle()) as
    | { id: string; name: string; role: Role }
    | null;
  if (!row) throw new ApiError("Perfil não encontrado. Rode o arquivo supabase/script.sql no seu projeto.");
  return { id: row.id, name: row.name, role: row.role, email };
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (isDemo) return demo.profile;
  const { data } = await sb().auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  try {
    return await loadProfile(user.id, user.email ?? "");
  } catch {
    return null;
  }
}

export function onAuthChange(cb: (signedIn: boolean) => void): () => void {
  if (isDemo) return () => {};
  const { data } = sb().auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") cb(false);
    else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") cb(Boolean(session));
  });
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<Profile> {
  if (isDemo) {
    await wait(650);
    if (password === "erro") throw new ApiError("E-mail ou senha incorretos. Verifique seus dados e tente novamente.");
    demo.profile = { id: "demo-admin", name: "Roberto Almeida", email, role: "admin" };
    return demo.profile;
  }
  const { data, error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) throw new ApiError(translate(error?.message ?? "Não foi possível entrar."));
  return loadProfile(data.user.id, data.user.email ?? email);
}

/** Entrada direta no modo demonstração com perfil de usuário comum. */
export async function signInDemoUser(): Promise<Profile> {
  demo.profile = { id: "demo-user", name: "Marina Lima", email: "marina@empresa.com", role: "user" };
  return demo.profile;
}

/** Retorna true se a conta já está ativa, false se precisa confirmar o e-mail. */
export async function signUp(name: string, email: string, password: string): Promise<boolean> {
  if (isDemo) {
    await wait();
    return true;
  }
  const data = check(
    await sb().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
    }),
  );
  if (data.session) await sb().auth.signOut(); // volta para a tela de login, como no protótipo
  return Boolean(data.session);
}

export async function resetPassword(email: string): Promise<void> {
  if (isDemo) {
    await wait();
    return;
  }
  check(await sb().auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin }));
}

export async function signOut(): Promise<void> {
  if (isDemo) {
    demo.profile = null;
    return;
  }
  await sb().auth.signOut();
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export async function listProducts(): Promise<Product[]> {
  if (isDemo) {
    await wait(200);
    return demo.products.map(p => ({ ...p }));
  }
  const rows = check(await sb().from("produtos").select("*").order("created_at", { ascending: false }));
  return (rows as ProductRow[]).map(toProduct);
}

export async function uploadProductImage(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new ApiError("A imagem deve ter no máximo 5 MB.");
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new ApiError("Envie uma imagem JPG, PNG ou WEBP.");
  if (isDemo) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new ApiError("Não foi possível ler a imagem."));
      reader.readAsDataURL(file);
    });
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${new Date().getFullYear()}/${uid()}.${ext}`;
  check(await sb().storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, { contentType: file.type, upsert: false }));
  return sb().storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  if (isDemo) {
    await wait();
    const product: Product = { ...input, id: uid(), code: `SC-${demo.nextCode++}` };
    demo.products.unshift(product);
    if (product.stock > 0) {
      demo.movements.unshift({ id: uid(), productId: product.id, movedAt: new Date().toISOString(), type: "Entrada", quantity: product.stock, responsible: demo.profile?.name ?? "Sistema", note: "Estoque inicial", balance: product.stock });
    }
    return { ...product };
  }
  const row = check(await sb().from("produtos").insert(fromInput(input)).select("*").single());
  return toProduct(row as ProductRow);
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  if (isDemo) {
    await wait();
    const i = demo.products.findIndex(p => p.id === id);
    const before = demo.products[i]!;
    const product = { ...before, ...input };
    if (before.stock !== product.stock) {
      demo.movements.unshift({ id: uid(), productId: id, movedAt: new Date().toISOString(), type: "Ajuste", quantity: Math.abs(product.stock - before.stock), responsible: demo.profile?.name ?? "Sistema", note: "Ajuste manual na edição do produto", balance: product.stock });
    }
    demo.products[i] = product;
    return { ...product };
  }
  const row = check(await sb().from("produtos").update(fromInput(input)).eq("id", id).select("*").single());
  return toProduct(row as ProductRow);
}

export async function deleteProduct(id: string): Promise<void> {
  if (isDemo) {
    await wait(450);
    demo.products = demo.products.filter(p => p.id !== id);
    return;
  }
  check(await sb().from("produtos").delete().eq("id", id));
}

// ---------------------------------------------------------------------------
// Movimentações
// ---------------------------------------------------------------------------

export async function listMovements(productId: string): Promise<Movement[]> {
  if (isDemo) {
    await wait(200);
    return demo.movements.filter(m => m.productId === productId).sort((a, b) => b.movedAt.localeCompare(a.movedAt));
  }
  const rows = check(
    await sb().from("movimentacoes").select("*").eq("product_id", productId).order("moved_at", { ascending: false }),
  );
  return (rows as MovementRow[]).map(toMovement);
}

/** Últimas movimentações de todos os produtos (painel). */
export async function listRecentMovements(limit = 8): Promise<MovementWithProduct[]> {
  if (isDemo) {
    await wait(200);
    return [...demo.movements]
      .sort((a, b) => b.movedAt.localeCompare(a.movedAt))
      .slice(0, limit)
      .flatMap(m => {
        const p = demo.products.find(x => x.id === m.productId);
        return p ? [{ ...m, productName: p.name, productCode: p.code }] : [];
      });
  }
  const rows = check(
    await sb()
      .from("movimentacoes")
      .select("*, produtos(name, code)")
      .order("moved_at", { ascending: false })
      .limit(limit),
  ) as (MovementRow & { produtos: { name: string; code: string } | null })[];
  return rows.map(r => ({ ...toMovement(r), productName: r.produtos?.name ?? "Produto removido", productCode: r.produtos?.code ?? "" }));
}

/** Registra entrada/saída de forma atômica e devolve o novo saldo. */
export async function registerMovement(args: {
  productId: string; type: "Entrada" | "Saída"; quantity: number; note: string; movedAt: string;
}): Promise<number> {
  if (isDemo) {
    await wait();
    const p = demo.products.find(x => x.id === args.productId)!;
    const balance = args.type === "Entrada" ? p.stock + args.quantity : p.stock - args.quantity;
    if (balance < 0) throw new ApiError("Não há quantidade suficiente em estoque para realizar esta saída.");
    p.stock = balance;
    demo.movements.unshift({ id: uid(), productId: p.id, movedAt: args.movedAt, type: args.type, quantity: args.quantity, responsible: demo.profile?.name ?? "Sistema", note: args.note || "Movimentação registrada", balance });
    return balance;
  }
  const balance = check(
    await sb().rpc("register_movement", {
      p_product_id: args.productId,
      p_type: args.type,
      p_quantity: args.quantity,
      p_note: args.note || null,
      p_moved_at: args.movedAt,
    }),
  );
  return Number(balance);
}

// ---------------------------------------------------------------------------
// Comentários
// ---------------------------------------------------------------------------

export async function listComments(productId: string): Promise<Comment[]> {
  if (isDemo) {
    await wait(200);
    return demo.comments.filter(c => c.productId === productId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const rows = check(
    await sb().from("comentarios").select("*").eq("product_id", productId).order("created_at", { ascending: false }),
  );
  return (rows as CommentRow[]).map(toComment);
}

export async function addComment(productId: string, text: string, author: Profile): Promise<Comment> {
  if (isDemo) {
    await wait();
    const comment: Comment = { id: uid(), productId, author: author.name, role: author.role === "admin" ? "Administrador" : "Usuário", createdAt: new Date().toISOString(), text };
    demo.comments.unshift(comment);
    return comment;
  }
  // author_id, author_name e author_role são preenchidos pelo banco (trigger) a partir do usuário logado
  const row = check(await sb().from("comentarios").insert({ product_id: productId, body: text }).select("*").single());
  return toComment(row as CommentRow);
}
