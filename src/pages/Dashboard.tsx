import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, ChevronRight, Coins, LayoutGrid, Package, SlidersHorizontal } from "lucide-react";
import { Button, EmptyState, Loading, PageTitle, ProductImage, errorMessage } from "../components/ui";
import { CRITICAL_STOCK, productCategories } from "../data";
import { listRecentMovements } from "../lib/api";
import { formatCurrency, formatDate, formatTime } from "../lib/format";
import type { MovementWithProduct, Product, Role } from "../types";

type Props = {
  role: Role;
  products: Product[];
  onMovement: (p: Product) => void;
  onHistory: (p: Product) => void;
  onCategory: (c: string) => void;
  onInventory: () => void;
};

export function DashboardPage({ role, products, onMovement, onHistory, onCategory, onInventory }: Props) {
  const [recent, setRecent] = useState<MovementWithProduct[] | null>(null);
  const [error, setError] = useState("");
  const stockKey = products.map(p => `${p.id}:${p.stock}`).join("|");

  useEffect(() => {
    let alive = true;
    listRecentMovements(8)
      .then(m => alive && setRecent(m))
      .catch(e => alive && setError(errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [stockKey]);

  const active = products.filter(p => p.active);
  const critical = active.filter(p => p.stock <= CRITICAL_STOCK).sort((a, b) => a.stock - b.stock);
  const units = active.reduce((a, p) => a + p.stock, 0);
  const value = active.reduce((a, p) => a + p.stock * p.price, 0);

  const byCategory = useMemo(() => {
    const rows = productCategories.map(c => {
      const items = active.filter(p => p.category === c);
      return { name: c, units: items.reduce((a, p) => a + p.stock, 0), value: items.reduce((a, p) => a + p.stock * p.price, 0) };
    });
    const max = Math.max(1, ...rows.map(r => r.value));
    return rows.map(r => ({ ...r, pct: (r.value / max) * 100 }));
  }, [active]);

  return (
    <>
      <PageTitle
        title="Painel"
        subtitle="Visão geral do estoque e das últimas movimentações"
        action={
          <Button variant="secondary" icon={<Package size={17} />} onClick={onInventory}>
            Ir para o inventário
          </Button>
        }
      />
      <div className="stats-row four">
        <div className="stat-card">
          <span className="stat-icon blue">
            <Package />
          </span>
          <div>
            <span>Unidades em estoque</span>
            <strong>{units}</strong>
            <small>soma dos produtos ativos</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon green">
            <Coins />
          </span>
          <div>
            <span>Valor em estoque</span>
            <strong className="money">{formatCurrency(value)}</strong>
            <small>pelo preço de venda</small>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon blue">
            <LayoutGrid />
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
            <strong>{critical.length}</strong>
            <small>até {CRITICAL_STOCK} unidades</small>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <section className="card dash-panel">
          <div className="dash-panel-head">
            <div>
              <h3>Precisam de reposição</h3>
              <p>Produtos ativos com {CRITICAL_STOCK} unidades ou menos.</p>
            </div>
          </div>
          {critical.length ? (
            <ul className="critical-list">
              {critical.map(p => (
                <li key={p.id}>
                  <ProductImage src={p.image} alt="" />
                  <div>
                    <strong>{p.name}</strong>
                    <span>
                      {p.code} · {p.category}
                    </span>
                  </div>
                  <b>{p.stock} un.</b>
                  {role === "admin" ? (
                    <Button variant="secondary" icon={<SlidersHorizontal size={15} />} onClick={() => onMovement(p)}>
                      Repor
                    </Button>
                  ) : (
                    <Button variant="ghost" onClick={() => onHistory(p)}>
                      Histórico <ChevronRight size={15} />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nenhum produto em estoque crítico" text="Todos os produtos ativos estão acima do limite." />
          )}
        </section>

        <section className="card dash-panel">
          <div className="dash-panel-head">
            <div>
              <h3>Valor por categoria</h3>
              <p>Quantidade em estoque × preço de venda.</p>
            </div>
          </div>
          <ul className="category-bars">
            {byCategory.map(c => (
              <li key={c.name}>
                <button onClick={() => onCategory(c.name)}>
                  <span className="bar-label">
                    <strong>{c.name}</strong>
                    <span>{c.units} un.</span>
                  </span>
                  <span className="bar-track">
                    <span className="bar-fill" style={{ width: `${Math.max(c.pct, c.value ? 3 : 0)}%` }} />
                  </span>
                  <span className="bar-value">{formatCurrency(c.value)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card history-main">
        <div className="table-meta">
          <div>
            <strong>Últimas movimentações</strong>
            <span>Entradas, saídas e ajustes de todos os produtos</span>
          </div>
        </div>
        {error ? (
          <EmptyState title="Não foi possível carregar as movimentações" text={error} />
        ) : !recent ? (
          <Loading />
        ) : recent.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data e hora</th>
                  <th>Produto</th>
                  <th>Tipo</th>
                  <th>Quantidade</th>
                  <th>Responsável</th>
                  <th>Estoque após</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(m => {
                  const product = products.find(p => p.id === m.productId);
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="td-date">
                          <strong>{formatDate(m.movedAt)}</strong>
                          <span>{formatTime(m.movedAt)}</span>
                        </div>
                      </td>
                      <td>
                        {product ? (
                          <button className="link-cell" onClick={() => onHistory(product)}>
                            {m.productName}
                          </button>
                        ) : (
                          m.productName
                        )}
                      </td>
                      <td>
                        <span className={`movement-badge ${m.type.toLowerCase()}`}>
                          {m.type === "Entrada" ? <ArrowUp /> : m.type === "Saída" ? <ArrowDown /> : <SlidersHorizontal />}
                          {m.type}
                        </span>
                      </td>
                      <td className={m.type === "Entrada" ? "qty-in" : m.type === "Saída" ? "qty-out" : ""}>
                        {m.type === "Entrada" ? "+" : m.type === "Saída" ? "−" : "±"}
                        {m.quantity} un.
                      </td>
                      <td>{m.responsible}</td>
                      <td>
                        <strong>{m.balance} un.</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nenhuma movimentação registrada" text="As entradas e saídas aparecem aqui assim que forem registradas." />
        )}
      </section>
    </>
  );
}
