import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowUp, ChevronLeft, ChevronRight, Edit3, Eye, Filter, History, MessageSquare, MoreHorizontal, Package, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button, EmptyState, Loading, PageTitle, ProductImage, SelectInput, StatusBadge } from "../components/ui";
import { CRITICAL_STOCK, categories } from "../data";
import { formatCurrency } from "../lib/format";
import type { Product, Role } from "../types";

const PAGE_SIZE = 9;

type CardActions = {
  onEdit: () => void;
  onDelete: () => void;
  onComments: () => void;
  onMovement: () => void;
  onHistory: () => void;
};

function ProductCard({ product, role, ...a }: { product: Product; role: Role } & CardActions) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const run = (fn: () => void) => () => {
    setMenu(false);
    fn();
  };

  return (
    <article className="product-card">
      <div className="product-image">
        <ProductImage src={product.image} alt={product.name} />
        <span className="category-pill">{product.category}</span>
        {role === "admin" && (
          <div className="card-menu" ref={ref}>
            <button aria-label="Ações" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <MoreHorizontal />
            </button>
            {menu && (
              <div className="action-menu" role="menu">
                <button onClick={run(a.onEdit)}>
                  <Edit3 />
                  Editar produto
                </button>
                <button onClick={run(a.onMovement)}>
                  <SlidersHorizontal />
                  Movimentar estoque
                </button>
                <button onClick={run(a.onHistory)}>
                  <History />
                  Ver histórico
                </button>
                <button className="danger" onClick={run(a.onDelete)}>
                  <Trash2 />
                  Excluir produto
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="product-body">
        <div className="product-title">
          <div>
            <span className="product-id">{product.code}</span>
            <h3>{product.name}</h3>
          </div>
          <StatusBadge stock={product.stock} active={product.active} />
        </div>
        <p className="product-description">{product.description}</p>
        <div className="product-meta">
          <div>
            <span>Preço de venda</span>
            <strong>{formatCurrency(product.price)}</strong>
          </div>
          <div>
            <span>Disponível</span>
            <strong className={product.stock <= CRITICAL_STOCK ? "stock-low" : ""}>{product.stock} un.</strong>
          </div>
        </div>
        <div className="product-actions">
          <Button variant="secondary" icon={<MessageSquare size={16} />} onClick={a.onComments}>
            Comentários
          </Button>
          <div className="product-actions-right">
            {role === "admin" && (
              <Button variant="delete" icon={<Trash2 size={15} />} onClick={a.onDelete} aria-label={`Excluir ${product.name}`}>
                Excluir
              </Button>
            )}
            <Button variant="ghost" onClick={a.onHistory}>
              Detalhes <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

type Props = {
  role: Role;
  products: Product[];
  loading: boolean;
  category: string;
  setCategory: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  onNew: () => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onComments: (p: Product) => void;
  onMovement: (p: Product) => void;
  onHistory: (p: Product) => void;
};

export function ProductsPage({ role, products, loading, category, setCategory, search, setSearch, onNew, ...actions }: Props) {
  const [status, setStatus] = useState("Ativos");
  const [sort, setSort] = useState("Nome");
  const [page, setPage] = useState(1);

  const visibleStatus = role === "admin" ? status : "Ativos";
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter(p => (visibleStatus === "Inativos" ? !p.active : p.active))
      .filter(p => category === "Todos" || p.category === category)
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
      .sort((a, b) => (sort === "Preço" ? a.price - b.price : sort === "Quantidade" ? a.stock - b.stock : a.name.localeCompare(b.name, "pt-BR")));
  }, [products, category, search, visibleStatus, sort]);

  useEffect(() => setPage(1), [category, search, visibleStatus, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const active = products.filter(p => p.active);

  const action =
    role === "admin" ? (
      <Button icon={<Plus size={18} />} onClick={onNew}>
        Novo produto
      </Button>
    ) : (
      <span className="permission-chip">
        <Eye size={16} />
        Modo consulta
      </span>
    );

  return (
    <>
      <PageTitle
        title={visibleStatus === "Inativos" ? "Produtos Inativos" : "Produtos Ativos"}
        subtitle={role === "admin" ? "Gerencie os produtos cadastrados no estoque" : "Consulte os produtos disponíveis no estoque"}
        action={action}
      />
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-icon blue">
            <Package />
          </span>
          <div>
            <span>Total em estoque</span>
            <strong>{active.reduce((a, p) => a + p.stock, 0)}</strong>
            <small>unidades cadastradas</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon green">
            <ArrowUp />
          </span>
          <div>
            <span>Produtos ativos</span>
            <strong>{active.length}</strong>
            <small>itens no catálogo</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon red">
            <AlertCircle />
          </span>
          <div>
            <span>Estoque crítico</span>
            <strong>{active.filter(p => p.stock <= CRITICAL_STOCK).length}</strong>
            <small>requerem atenção</small>
          </div>
        </div>
      </div>
      <section className="filters-card">
        <div className="search-large">
          <Search size={18} />
          <input placeholder="Buscar por nome ou identificador..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-control">
          <Filter size={16} />
          <SelectInput value={category} onChange={e => setCategory(e.target.value)} aria-label="Categoria">
            {categories.map(c => (
              <option key={c}>{c}</option>
            ))}
          </SelectInput>
        </div>
        {role === "admin" && (
          <div className="filter-control">
            <SelectInput value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">
              <option>Ativos</option>
              <option>Inativos</option>
            </SelectInput>
          </div>
        )}
        <div className="filter-control">
          <span>Ordenar:</span>
          <SelectInput value={sort} onChange={e => setSort(e.target.value)} aria-label="Ordenar">
            <option>Nome</option>
            <option>Preço</option>
            <option>Quantidade</option>
          </SelectInput>
        </div>
      </section>
      <div className="list-meta">
        <p>
          Mostrando <strong>{pageItems.length}</strong> de <strong>{filtered.length}</strong> produtos
        </p>
        <span>{loading ? "Atualizando..." : "Atualizado agora"}</span>
      </div>
      {loading && !products.length ? (
        <Loading />
      ) : pageItems.length ? (
        <div className="product-grid">
          {pageItems.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              role={role}
              onEdit={() => actions.onEdit(p)}
              onDelete={() => actions.onDelete(p)}
              onComments={() => actions.onComments(p)}
              onMovement={() => actions.onMovement(p)}
              onHistory={() => actions.onHistory(p)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum produto encontrado"
          text={products.length ? "Tente ajustar os filtros ou buscar por outro termo." : role === "admin" ? "Cadastre o primeiro produto pelo botão Novo produto." : "Ainda não há produtos cadastrados."}
        />
      )}
      {pages > 1 && (
        <div className="pagination">
          <button disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Página anterior">
            <ChevronLeft />
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
            <button key={n} className={n === current ? "active" : ""} onClick={() => setPage(n)}>
              {n}
            </button>
          ))}
          <button disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Próxima página">
            <ChevronRight />
          </button>
        </div>
      )}
    </>
  );
}
