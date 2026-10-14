import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Boxes, Check, ChevronDown, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Button, Field, PageTitle, ProductImage, SelectInput, TextInput, errorMessage } from "../components/ui";
import { toDateInput } from "../lib/format";
import type { Product, Profile } from "../types";

type Props = {
  product: Product;
  products: Product[];
  profile: Profile;
  selectProduct: (p: Product) => void;
  back: () => void;
  register: (args: { type: "Entrada" | "Saída"; quantity: number; note: string; movedAt: string }) => Promise<void>;
};

export function MovementPage({ product, products, profile, selectProduct, back, register }: Props) {
  const [type, setType] = useState<"Entrada" | "Saída">("Entrada");
  const [quantity, setQuantity] = useState("10");
  const [date, setDate] = useState(toDateInput());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const qty = Number(quantity) || 0;
  const projected = type === "Entrada" ? product.stock + qty : product.stock - qty;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!Number.isInteger(qty) || qty <= 0) return setError("A quantidade deve ser um número inteiro maior que zero.");
    if (type === "Saída" && qty > product.stock) return setError("Não há quantidade suficiente em estoque para realizar esta saída.");
    if (!date) return setError("Informe a data da movimentação.");
    // usa a data escolhida com o horário atual
    const now = new Date();
    const [y, m, d] = date.split("-").map(Number);
    const movedAt = new Date(y!, m! - 1, d!, now.getHours(), now.getMinutes()).toISOString();
    setSaving(true);
    try {
      await register({ type, quantity: qty, note: note.trim(), movedAt });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle icon={<SlidersHorizontal />} title="Registro de Entrada e Saída de Estoque" subtitle="Registre a movimentação de um produto e mantenha o controle da quantidade" back={back} />
      <form className="movement-card card" onSubmit={submit} noValidate>
        <div className="section-caption">
          <span>01</span>
          <div>
            <h3>Dados da movimentação</h3>
            <p>Informe o produto e o tipo de operação.</p>
          </div>
        </div>
        <div className="two-col">
          <Field label="Produto" required>
            <div className="product-select control">
              <ProductImage src={product.image} alt="" />
              <span>
                <strong>{product.name}</strong>
                <small>{product.code}</small>
              </span>
              <ChevronDown />
              <select
                aria-label="Selecionar produto"
                value={product.id}
                onChange={e => {
                  const p = products.find(x => x.id === e.target.value);
                  if (p) {
                    selectProduct(p);
                    setError("");
                  }
                }}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="Tipo de movimentação" required>
            <div className="movement-types">
              <button type="button" className={type === "Entrada" ? "selected entry" : ""} onClick={() => { setType("Entrada"); setError(""); }}>
                <ArrowUp />
                <span>
                  <strong>Entrada</strong>
                  <small>Adicionar ao estoque</small>
                </span>
              </button>
              <button type="button" className={type === "Saída" ? "selected output" : ""} onClick={() => { setType("Saída"); setError(""); }}>
                <ArrowDown />
                <span>
                  <strong>Saída</strong>
                  <small>Retirar do estoque</small>
                </span>
              </button>
            </div>
          </Field>
        </div>
        <div className="divider" />
        <div className="section-caption">
          <span>02</span>
          <div>
            <h3>Detalhes do registro</h3>
            <p>Defina quantidade, data e responsável.</p>
          </div>
        </div>
        <div className="three-col">
          <Field label="Quantidade" required error={error}>
            <TextInput type="number" min="1" step="1" value={quantity} onChange={e => { setQuantity(e.target.value); setError(""); }} />
          </Field>
          <Field label="Data da movimentação" required>
            <TextInput type="date" value={date} max={toDateInput()} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Responsável" required>
            <SelectInput value={profile.id} disabled>
              <option value={profile.id}>{profile.name} (você)</option>
            </SelectInput>
          </Field>
        </div>
        <div style={{ marginTop: 18 }}>
          <Field label="Observações">
            <textarea className="control textarea" maxLength={500} placeholder="Digite alguma observação sobre a movimentação..." value={note} onChange={e => setNote(e.target.value)} />
            <span className="counter">{note.length}/500</span>
          </Field>
        </div>
        <div className="stock-preview">
          <div>
            <span className="stat-icon blue">
              <Boxes />
            </span>
            <div>
              <strong>Quantidade atual no estoque</strong>
              <p>Após a movimentação, a quantidade será atualizada automaticamente.</p>
            </div>
          </div>
          <div className="stock-equation">
            <span>
              <small>Atual</small>
              <strong>{product.stock}</strong>
            </span>
            <b>{type === "Entrada" ? "+" : "−"}</b>
            <span>
              <small>{type}</small>
              <strong>{qty}</strong>
            </span>
            <b>=</b>
            <span className={projected < 0 ? "negative" : "result"}>
              <small>Novo estoque</small>
              <strong>{projected}</strong>
            </span>
          </div>
        </div>
        <div className="form-footer simple">
          <p>
            <ShieldCheck size={17} />
            Registro protegido contra duplicidade.
          </p>
          <div>
            <Button type="button" variant="secondary" onClick={back}>
              Fechar
            </Button>
            <Button type="submit" disabled={saving} icon={saving ? <span className="spinner" /> : <Check size={17} />}>
              {saving ? "Registrando..." : "Registrar Movimentação"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
