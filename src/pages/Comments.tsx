import { useEffect, useState, type FormEvent } from "react";
import { Clock3, FileText, MessageSquare, Plus, X } from "lucide-react";
import { Button, EmptyState, Field, Loading, PageTitle, ProductImage, StatusBadge, errorMessage } from "../components/ui";
import { listComments } from "../lib/api";
import { formatRelative, initials } from "../lib/format";
import type { Comment, Product } from "../types";

export function CommentsPanel({ product, close, add }: { product: Product; close: () => void; add: () => void }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    listComments(product.id)
      .then(c => alive && setComments(c))
      .catch(e => alive && setError(errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [product.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div className="drawer-backdrop" onMouseDown={close}>
      <aside className="comments-drawer" onMouseDown={e => e.stopPropagation()} role="dialog" aria-label="Comentários do produto">
        <div className="drawer-header">
          <div>
            <span className="page-icon">
              <MessageSquare />
            </span>
            <div>
              <h2>Comentários do produto</h2>
              <p>{product.name}</p>
            </div>
          </div>
          <button onClick={close} aria-label="Fechar">
            <X />
          </button>
        </div>
        <div className="drawer-product">
          <ProductImage src={product.image} alt="" />
          <div>
            <strong>{product.name}</strong>
            <span>
              {product.code} · {product.category}
            </span>
          </div>
          <StatusBadge stock={product.stock} active={product.active} />
        </div>
        <div className="comments-meta">
          <strong>{comments ? `${comments.length} comentário${comments.length === 1 ? "" : "s"}` : "Carregando..."}</strong>
          <span>Mais recentes primeiro</span>
        </div>
        <div className="comment-list">
          {error ? (
            <EmptyState title="Não foi possível carregar os comentários" text={error} />
          ) : !comments ? (
            <Loading />
          ) : comments.length ? (
            comments.map(c => (
              <article className="comment" key={c.id}>
                <div className="comment-avatar">{initials(c.author)}</div>
                <div>
                  <div className="comment-head">
                    <div>
                      <strong>{c.author}</strong>
                      <span>{c.role}</span>
                    </div>
                    <time dateTime={c.createdAt}>
                      <Clock3 size={13} />
                      {formatRelative(c.createdAt)}
                    </time>
                  </div>
                  <p>{c.text}</p>
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="Ainda não há comentários para este produto" text="Seja o primeiro a registrar uma observação." />
          )}
        </div>
        <div className="drawer-footer">
          <Button variant="secondary" onClick={close}>
            Fechar
          </Button>
          <Button icon={<Plus size={17} />} onClick={add}>
            Adicionar comentário
          </Button>
        </div>
      </aside>
    </div>
  );
}

export function NewComment({ product, back, submit }: { product: Product; back: () => void; submit: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return setError("Digite um comentário antes de cadastrar.");
    setSaving(true);
    try {
      await submit(text.trim());
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle icon={<MessageSquare />} title="Cadastro de Comentário" subtitle="Adicione uma observação ou comentário sobre o produto" back={back} />
      <form className="comment-form card" onSubmit={save} noValidate>
        <div className="selected-product-label">Produto selecionado</div>
        <div className="selected-product">
          <ProductImage src={product.image} alt="" />
          <div>
            <h3>{product.name}</h3>
            <span>{product.category}</span>
            <small>Identificador: {product.code}</small>
          </div>
          <span className={`status ${product.active ? "normal" : "inactive"}`}>
            <span />
            {product.active ? "Ativo" : "Inativo"}
          </span>
        </div>
        <div className="divider" />
        <Field label="Comentário" required error={error}>
          <textarea
            className="control comment-textarea"
            placeholder="Digite aqui sua observação sobre o produto..."
            maxLength={500}
            value={text}
            onChange={e => {
              setText(e.target.value);
              setError("");
            }}
          />
          <span className="counter">{text.length}/500</span>
        </Field>
        <div className="form-tip">
          <FileText size={17} />
          Inclua informações objetivas que possam ajudar outros membros da equipe.
        </div>
        <div className="form-footer simple">
          <span>Data e autor serão registrados automaticamente.</span>
          <div>
            <Button type="button" variant="secondary" onClick={back}>
              Fechar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner" />
                  Cadastrando...
                </>
              ) : (
                "Cadastrar"
              )}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
