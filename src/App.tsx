import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LayoutDashboard } from "lucide-react";
import { DeleteModal } from "./components/DeleteModal";
import { Shell } from "./components/Shell";
import { EmptyState, Toast, errorMessage, type ToastState } from "./components/ui";
import * as api from "./lib/api";
import { Login, Signup } from "./pages/Auth";
import { CategoriesPage } from "./pages/Categories";
import { CommentsPanel, NewComment } from "./pages/Comments";
import { DashboardPage } from "./pages/Dashboard";
import { DesignSystem } from "./pages/DesignSystem";
import { HistoryPage } from "./pages/History";
import { MovementPage } from "./pages/Movement";
import { ProductForm } from "./pages/ProductForm";
import { ProductsPage } from "./pages/Products";
import type { Product, ProductInput, Profile, Screen } from "./types";

export default function App() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined); // undefined = verificando sessão
  const [screen, setScreen] = useState<Screen>("login");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [commentsFor, setCommentsFor] = useState<Product | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [loginNotice, setLoginNotice] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const selected = products.find(p => p.id === selectedId) ?? products[0] ?? null;
  const isAdmin = profile?.role === "admin";

  const go = useCallback((next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const notify = useCallback((message: string, kind: "success" | "error" = "success") => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = window.setTimeout(() => setToast(null), 3800);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      setProducts(await api.listProducts());
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setLoadingProducts(false);
    }
  }, [notify]);

  const enter = useCallback(
    (p: Profile) => {
      setProfile(p);
      setLoginNotice("");
      setScreen(s => (s === "login" || s === "signup" ? "products" : s));
      void loadProducts();
    },
    [loadProducts],
  );

  // Restaura a sessão salva e acompanha login/logout (inclusive em outras abas)
  useEffect(() => {
    let alive = true;
    api.getCurrentProfile().then(p => {
      if (!alive) return;
      if (p) enter(p);
      else setProfile(null);
    });
    const unsubscribe = api.onAuthChange(signedIn => {
      if (!signedIn) {
        setProfile(null);
        setScreen("login");
      }
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [enter]);

  const logout = async () => {
    await api.signOut();
    setProfile(null);
    setProducts([]);
    setSelectedId(null);
    setCommentsFor(null);
    go("login");
  };

  const open = (target: Screen) => (p: Product) => {
    setSelectedId(p.id);
    go(target);
  };

  const saveProduct = async (input: ProductInput, mode: "new" | "edit") => {
    const saved = mode === "new" ? await api.createProduct(input) : await api.updateProduct(selected!.id, input);
    setProducts(prev => (mode === "new" ? [saved, ...prev] : prev.map(p => (p.id === saved.id ? saved : p))));
    setSelectedId(saved.id);
    go("products");
    notify(mode === "new" ? "Sucesso! Produto cadastrado com sucesso." : "Sucesso! Produto atualizado com sucesso.");
  };

  const registerMovement = async (args: { type: "Entrada" | "Saída"; quantity: number; note: string; movedAt: string }) => {
    const balance = await api.registerMovement({ productId: selected!.id, ...args });
    setProducts(prev => prev.map(p => (p.id === selected!.id ? { ...p, stock: balance } : p)));
    go("products");
    notify("Sucesso! Movimentação registrada com sucesso!");
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api.deleteProduct(deleting.id);
      setProducts(prev => prev.filter(p => p.id !== deleting.id));
      setDeleting(null);
      notify("Sucesso! Produto excluído com sucesso.");
    } catch (e) {
      notify(errorMessage(e), "error");
    }
  };

  const addComment = async (text: string) => {
    await api.addComment(selected!.id, text, profile!);
    go("products");
    setCommentsFor(selected);
    notify("Sucesso! Comentário cadastrado para o produto.");
  };

  const toastEl = toast && <Toast toast={toast} onClose={() => setToast(null)} />;

  if (profile === undefined) {
    return (
      <div className="loading-screen">
        <span className="spinner dark" />
      </div>
    );
  }

  if (!profile) {
    return (
      <>
        {screen === "signup" ? (
          <Signup
            go={go}
            onDone={message => {
              setLoginNotice(message);
              go("login");
            }}
          />
        ) : (
          <Login key={loginNotice} go={go} onSignedIn={enter} notice={loginNotice} />
        )}
        {toastEl}
      </>
    );
  }

  const backToList = () => go("products");
  const adminOnly = screen === "new-product" || screen === "edit-product" || screen === "movement";
  const needsProduct = screen === "edit-product" || screen === "movement" || screen === "history" || screen === "new-comment";

  let page: ReactNode;
  if (adminOnly && !isAdmin) {
    page = <EmptyState title="Acesso não autorizado" text="Seu perfil não possui permissão para acessar esta área." />;
  } else if (needsProduct && !selected) {
    page = <EmptyState title="Nenhum produto selecionado" text="Cadastre ou selecione um produto na listagem para continuar." />;
  } else if (screen === "new-product") {
    page = <ProductForm mode="new" back={backToList} save={input => saveProduct(input, "new")} />;
  } else if (screen === "edit-product") {
    page = <ProductForm key={selected!.id} mode="edit" current={selected!} back={backToList} save={input => saveProduct(input, "edit")} />;
  } else if (screen === "movement") {
    page = <MovementPage key={selected!.id} product={selected!} products={products} profile={profile} selectProduct={p => setSelectedId(p.id)} back={backToList} register={registerMovement} />;
  } else if (screen === "history") {
    page = <HistoryPage product={selected!} products={products} selectProduct={p => setSelectedId(p.id)} back={backToList} />;
  } else if (screen === "new-comment") {
    page = <NewComment product={selected!} back={backToList} submit={addComment} />;
  } else if (screen === "design-system") {
    page = <DesignSystem back={backToList} />;
  } else if (screen === "dashboard") {
    page = (
      <DashboardPage
        role={profile.role}
        products={products}
        onMovement={open("movement")}
        onHistory={open("history")}
        onCategory={c => {
          setCategory(c);
          go("products");
        }}
        onInventory={backToList}
      />
    );
  } else if (screen === "categories") {
    page = (
      <CategoriesPage
        products={products}
        onOpen={c => {
          setCategory(c);
          setSearch("");
          go("products");
        }}
      />
    );
  } else {
    page = (
      <ProductsPage
        role={profile.role}
        products={products}
        loading={loadingProducts}
        category={category}
        setCategory={setCategory}
        search={search}
        setSearch={setSearch}
        onNew={() => go("new-product")}
        onEdit={open("edit-product")}
        onMovement={open("movement")}
        onHistory={open("history")}
        onDelete={setDeleting}
        onComments={setCommentsFor}
      />
    );
  }

  return (
    <Shell
      profile={profile}
      screen={screen}
      go={go}
      logout={logout}
      demo={api.isDemo}
      products={products}
      category={category}
      setCategory={setCategory}
      search={search}
      setSearch={setSearch}
    >
      {page}
      {deleting && isAdmin && <DeleteModal product={deleting} close={() => setDeleting(null)} confirm={confirmDelete} />}
      {commentsFor && (
        <CommentsPanel
          product={commentsFor}
          close={() => setCommentsFor(null)}
          add={() => {
            setSelectedId(commentsFor.id);
            setCommentsFor(null);
            go("new-comment");
          }}
        />
      )}
      {toastEl}
      <button className="ds-shortcut" onClick={() => go("design-system")} title="Ver Design System" aria-label="Ver Design System">
        <LayoutDashboard size={18} />
      </button>
    </Shell>
  );
}
