import { AlertCircle, Box, ChevronRight } from "lucide-react";
import { PageTitle } from "../components/ui";
import { CRITICAL_STOCK, productCategories } from "../data";
import { formatCurrency } from "../lib/format";
import type { Product } from "../types";

export function CategoriesPage({ products, onOpen }: { products: Product[]; onOpen: (category: string) => void }) {
  const active = products.filter(p => p.active);
  const rows = productCategories.map(c => {
    const items = active.filter(p => p.category === c);
    return {
      name: c,
      count: items.length,
      units: items.reduce((a, p) => a + p.stock, 0),
      value: items.reduce((a, p) => a + p.stock * p.price, 0),
      critical: items.filter(p => p.stock <= CRITICAL_STOCK).length,
      sample: items.slice(0, 3).map(p => p.name),
    };
  });

  return (
    <>
      <PageTitle title="Categorias" subtitle="Resumo do estoque por categoria. Clique em uma categoria para ver os produtos." />
      <div className="category-grid">
        {rows.map(c => (
          <button key={c.name} className="category-card" onClick={() => onOpen(c.name)}>
            <div className="category-card-head">
              <span className="stat-icon blue">
                <Box />
              </span>
              <div>
                <h3>{c.name}</h3>
                <span>
                  {c.count} produto{c.count === 1 ? "" : "s"} ativo{c.count === 1 ? "" : "s"}
                </span>
              </div>
              {c.critical > 0 && (
                <span className="status critical">
                  <span />
                  {c.critical} crítico{c.critical === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="product-meta">
              <div>
                <span>Unidades</span>
                <strong>{c.units}</strong>
              </div>
              <div>
                <span>Valor em estoque</span>
                <strong>{formatCurrency(c.value)}</strong>
              </div>
            </div>
            <p className="category-sample">{c.sample.length ? c.sample.join(" · ") : "Nenhum produto nesta categoria ainda."}</p>
            <span className="category-link">
              {c.critical > 0 ? <AlertCircle size={14} /> : null}
              Ver produtos <ChevronRight size={15} />
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
