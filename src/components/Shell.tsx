import { useState, type ReactNode } from "react";
import { AlertCircle, Bell, Box, Boxes, CircleHelp, History, Info, LayoutDashboard, LayoutGrid, LogOut, Menu, Package, Plus, Search, X } from "lucide-react";
import { CRITICAL_STOCK, categories } from "../data";
import { initials, roleLabel } from "../lib/format";
import type { Product, Profile, Screen } from "../types";
import { Button, Logo } from "./ui";

type SidebarProps = {
  category: string;
  setCategory: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  products: Product[];
  open: boolean;
  close: () => void;
  go: (s: Screen) => void;
};

function Sidebar({ category, setCategory, search, setSearch, products, open, close, go, isAdmin }: SidebarProps & { isAdmin: boolean }) {
  const active = products.filter(p => p.active);
  const count = (c: string) => (c === "Todos" ? active.length : active.filter(p => p.category === c).length);
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-top">
        <Logo />
        <button className="sidebar-close" onClick={close} aria-label="Fechar menu">
          <X />
        </button>
      </div>
      <div className="sidebar-search">
        <Search size={17} />
        <input
          placeholder="Buscar produto..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            go("products");
          }}
        />
      </div>
      <div className="side-section side-mobile-nav">
        <span className="side-label">Navegação</span>
        <nav>
          {(
            [
              ["dashboard", "Painel", LayoutDashboard],
              ["products", "Inventário", Package],
              ["categories", "Categorias", LayoutGrid],
              ["history", "Relatórios", History],
              ...(isAdmin ? ([["new-product", "Novo produto", Plus]] as const) : []),
            ] as const
          ).map(([target, label, Icon]) => (
            <button
              key={target}
              onClick={() => {
                go(target);
                close();
              }}
            >
              <span>
                <Icon />
                {label}
              </span>
            </button>
          ))}
        </nav>
      </div>
      <div className="side-section">
        <span className="side-label">Categorias</span>
        <nav>
          {categories.map((c, i) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => {
                setCategory(c);
                go("products");
                close();
              }}
            >
              <span>
                {i === 0 ? <Boxes /> : <Box />}
                {c}
              </span>
              <b>{count(c)}</b>
            </button>
          ))}
        </nav>
      </div>
      <div className="quick-summary">
        <span>Resumo rápido</span>
        <div>
          <p>
            <Boxes size={17} />
            Itens ativos
          </p>
          <strong>{active.reduce((a, p) => a + p.stock, 0)} u.</strong>
        </div>
        <div>
          <p>
            <AlertCircle size={17} />
            Estoque crítico
          </p>
          <strong className="red">{active.filter(p => p.stock <= CRITICAL_STOCK).length} itens</strong>
        </div>
      </div>
      <div className="side-help">
        <CircleHelp size={18} />
        <div>
          <strong>Precisa de ajuda?</strong>
          <span>Acesse a central de suporte</span>
        </div>
      </div>
    </aside>
  );
}

function Header({ profile, screen, go, logout, openMenu, alerts }: { profile: Profile; screen: Screen; go: (s: Screen) => void; logout: () => void; openMenu: () => void; alerts: number }) {
  const inventory = !["history", "design-system", "dashboard", "categories"].includes(screen);
  return (
    <header className="topbar">
      <button className="menu-trigger" onClick={openMenu} aria-label="Abrir menu">
        <Menu />
      </button>
      <button className="topbar-logo" onClick={() => go("products")} aria-label="StockControl — ir para o inventário">
        <Logo />
      </button>
      <nav>
        <button className={screen === "dashboard" ? "active" : ""} onClick={() => go("dashboard")}>
          Painel
        </button>
        <button className={inventory ? "active" : ""} onClick={() => go("products")}>
          Inventário
        </button>
        <button className={screen === "categories" ? "active" : ""} onClick={() => go("categories")}>
          Categorias
        </button>
        <button className={screen === "history" ? "active" : ""} onClick={() => go("history")}>
          Relatórios
        </button>
        {profile.role === "admin" && (
          <button className={`nav-new ${screen === "new-product" ? "active" : ""}`} onClick={() => go("new-product")}>
            <Plus size={15} />
            Novo produto
          </button>
        )}
      </nav>
      <div className="header-right">
        <button className="icon-button" aria-label={`${alerts} alertas de estoque crítico`} title={`${alerts} produto(s) com estoque crítico`}>
          <Bell size={19} />
          {alerts > 0 && <span />}
        </button>
        <div className="profile">
          <div className="avatar">{initials(profile.name)}</div>
          <div>
            <strong>{profile.name}</strong>
            <span>{roleLabel(profile.role)}</span>
          </div>
        </div>
        <Button variant="ghost" className="logout-btn" icon={<LogOut size={17} />} onClick={logout} aria-label="Sair">
          <span className="logout-text">Sair</span>
        </Button>
      </div>
    </header>
  );
}

type ShellProps = Omit<SidebarProps, "open" | "close"> & {
  children: ReactNode;
  profile: Profile;
  screen: Screen;
  logout: () => void;
  demo: boolean;
};

export function Shell({ children, profile, screen, go, logout, demo, ...sidebar }: ShellProps) {
  const [menu, setMenu] = useState(false);
  const alerts = sidebar.products.filter(p => p.active && p.stock <= CRITICAL_STOCK).length;
  return (
    <div className="app-shell">
      <Sidebar {...sidebar} go={go} open={menu} close={() => setMenu(false)} isAdmin={profile.role === "admin"} />
      <div className="app-area">
        <Header profile={profile} screen={screen} go={go} openMenu={() => setMenu(true)} logout={logout} alerts={alerts} />
        {demo && (
          <div className="demo-banner">
            <Info size={14} />
            Modo demonstração: os dados ficam só na memória. Configure o Supabase no arquivo .env.local para salvar de verdade.
          </div>
        )}
        <main className={`content screen-${screen}`}>{children}</main>
      </div>
      {menu && <div className="mobile-overlay" onClick={() => setMenu(false)} />}
    </div>
  );
}
