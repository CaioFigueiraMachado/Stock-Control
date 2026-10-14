import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Filter, History, SlidersHorizontal } from "lucide-react";
import { Button, EmptyState, Field, Loading, PageTitle, ProductImage, SelectInput, StatusBadge, TextInput, errorMessage } from "../components/ui";
import { listMovements } from "../lib/api";
import { formatDate, formatTime, initials, toDateInput } from "../lib/format";
import type { Movement, Product } from "../types";

const PAGE_SIZE = 10;

export function HistoryPage({ product, products, selectProduct, back }: { product: Product; products: Product[]; selectProduct: (p: Product) => void; back: () => void }) {
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ from: "", to: "", type: "Todos" });
  const [applied, setApplied] = useState(draft);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;
    setMovements(null);
    setError("");
    listMovements(product.id)
      .then(m => alive && setMovements(m))
      .catch(e => alive && setError(errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [product.id, product.stock]);

  const visible = useMemo(
    () =>
      (movements ?? []).filter(m => {
        const day = toDateInput(new Date(m.movedAt));
        return (applied.type === "Todos" || m.type === applied.type) && (!applied.from || day >= applied.from) && (!applied.to || day <= applied.to);
      }),
    [movements, applied],
  );

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const first = visible.length ? (current - 1) * PAGE_SIZE + 1 : 0;

  const apply = (next = draft) => {
    setApplied(next);
    setPage(1);
  };
  const clear = () => {
    const empty = { from: "", to: "", type: "Todos" };
    setDraft(empty);
    apply(empty);
  };

  return (
    <>
      <PageTitle icon={<History />} title="Histórico de Movimentações" subtitle="Acompanhe todas as entradas e saídas registradas para este produto" back={back} />
      <section className="history-product card">
        <ProductImage src={product.image} alt="" />
        <div>
          <span>Produto selecionado</span>
          <h3>{product.name}</h3>
          <p>
            {product.code} · {product.category}
          </p>
        </div>
        {products.length > 1 && (
          <SelectInput
            aria-label="Trocar produto"
            style={{ maxWidth: 220 }}
            value={product.id}
            onChange={e => {
              const p = products.find(x => x.id === e.target.value);
              if (p) selectProduct(p);
            }}
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectInput>
        )}
        <div className="history-stock">
          <span>Quantidade atual</span>
          <strong>
            {product.stock} <small>un.</small>
          </strong>
          <StatusBadge stock={product.stock} active={product.active} />
        </div>
      </section>
      <section className="history-main card">
        <div className="filter-title">
          <div>
            <Filter />
            <div>
              <h3>Filtros do histórico</h3>
              <p>Refine os resultados por período e tipo.</p>
            </div>
          </div>
          <button onClick={clear}>Limpar filtros</button>
        </div>
        <div className="history-filters">
          <Field label="Data inicial">
            <TextInput type="date" value={draft.from} max={draft.to || undefined} onChange={e => setDraft({ ...draft, from: e.target.value })} />
          </Field>
          <Field label="Data final">
            <TextInput type="date" value={draft.to} min={draft.from || undefined} onChange={e => setDraft({ ...draft, to: e.target.value })} />
          </Field>
          <Field label="Tipo de movimentação">
            <SelectInput
              value={draft.type}
              onChange={e => {
                const next = { ...draft, type: e.target.value };
                setDraft(next);
                apply(next);
              }}
            >
              <option>Todos</option>
              <option>Entrada</option>
              <option>Saída</option>
              <option>Ajuste</option>
            </SelectInput>
          </Field>
          <Button icon={<Filter size={16} />} onClick={() => apply()}>
            Filtrar
          </Button>
        </div>
        <div className="table-meta">
          <div>
            <strong>Registros de movimentação</strong>
            <span>
              {visible.length} registro{visible.length === 1 ? "" : "s"} encontrado{visible.length === 1 ? "" : "s"}
            </span>
          </div>
          <span>Ordenado por mais recente</span>
        </div>
        {error ? (
          <EmptyState title="Não foi possível carregar o histórico" text={error} />
        ) : !movements ? (
          <Loading />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data e hora</th>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Responsável</th>
                    <th>Observações</th>
                    <th>Estoque após</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(m => {
                    const positive = m.type === "Entrada";
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="td-date">
                            <strong>{formatDate(m.movedAt)}</strong>
                            <span>{formatTime(m.movedAt)}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`movement-badge ${m.type.toLowerCase()}`}>
                            {m.type === "Entrada" ? <ArrowUp /> : m.type === "Saída" ? <ArrowDown /> : <SlidersHorizontal />}
                            {m.type}
                          </span>
                        </td>
                        <td className={positive ? "qty-in" : m.type === "Saída" ? "qty-out" : ""}>
                          {positive ? "+" : m.type === "Saída" ? "−" : "±"}
                          {m.quantity} un.
                        </td>
                        <td>
                          <div className="table-user">
                            <span>{initials(m.responsible)}</span>
                            {m.responsible}
                          </div>
                        </td>
                        <td>{m.note || "—"}</td>
                        <td>
                          <strong>{m.balance} un.</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!visible.length && <EmptyState title="Nenhuma movimentação encontrada" text="Não há registros para os filtros selecionados." />}
          </>
        )}
        <div className="table-footer">
          <span>
            Mostrando {first}–{first ? first + rows.length - 1 : 0} de {visible.length} registros
          </span>
          <div className="pagination small">
            <button disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Página anterior">
              <ChevronLeft />
            </button>
            <button className="active">{current}</button>
            <button disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Próxima página">
              <ChevronRight />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
