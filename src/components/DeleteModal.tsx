import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import type { Product } from "../types";
import { Button, ProductImage } from "./ui";

export function DeleteModal({ product, close, confirm }: { product: Product; close: () => void; confirm: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !loading && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, loading]);

  const run = async () => {
    setLoading(true);
    try {
      await confirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={() => !loading && close()}>
      <div className="modal-card" onMouseDown={e => e.stopPropagation()} role="alertdialog" aria-labelledby="delete-title">
        <button className="modal-close" onClick={close} aria-label="Fechar" disabled={loading}>
          <X />
        </button>
        <span className="danger-icon">
          <Trash2 />
        </span>
        <h2 id="delete-title">Excluir produto?</h2>
        <p>Atenção! Tem certeza que deseja excluir o produto? Essa ação não poderá ser desfeita.</p>
        <div className="delete-product">
          <ProductImage src={product.image} alt="" />
          <div>
            <span>Produto selecionado</span>
            <strong>{product.name}</strong>
            <small>
              {product.code} · {product.category}
            </small>
          </div>
        </div>
        <div className="modal-actions">
          <Button variant="secondary" onClick={close} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                Excluindo...
              </>
            ) : (
              "Excluir produto"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
