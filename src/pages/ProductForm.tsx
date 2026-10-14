import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Check, ImagePlus, PackagePlus, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Button, Field, PageTitle, SelectInput, TextInput, errorMessage } from "../components/ui";
import { productCategories, units } from "../data";
import { uploadProductImage } from "../lib/api";
import type { Product, ProductInput } from "../types";

type Props = {
  mode: "new" | "edit";
  current?: Product;
  back: () => void;
  save: (input: ProductInput) => Promise<void>;
};

export function ProductForm({ mode, current, back, save }: Props) {
  const [form, setForm] = useState({
    name: current?.name ?? "",
    description: current?.description ?? "",
    category: current?.category ?? "",
    unit: current?.unit ?? "Unidade",
    stock: String(current?.stock ?? 0),
    price: current ? String(current.price) : "",
    active: current?.active ?? true,
  });
  const [image, setImage] = useState(current?.image ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // pré-visualização local do arquivo escolhido
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const shown = preview || image;

  // "Cadastrar" só fica habilitado com todos os campos obrigatórios preenchidos
  const missing = [
    !form.name.trim() && "nome",
    !form.description.trim() && "descrição",
    !form.category && "categoria",
    form.stock.trim() === "" && "quantidade",
    !(Number(form.price.replace(",", ".")) > 0) && "preço",
    !shown && "imagem",
  ].filter(Boolean) as string[];
  const complete = missing.length === 0;

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return setErrors(e => ({ ...e, image: "Envie uma imagem JPG, PNG ou WEBP." }));
    if (f.size > 5 * 1024 * 1024) return setErrors(e => ({ ...e, image: "A imagem deve ter no máximo 5 MB." }));
    setErrors(({ image: _omit, ...rest }) => rest);
    setFile(f);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const price = Number(form.price.replace(",", "."));
    const stock = Number(form.stock);
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Informe o nome do produto.";
    if (!form.description.trim()) next.description = "Informe uma descrição.";
    if (!form.category) next.category = "Selecione uma categoria.";
    if (!Number.isFinite(price) || price <= 0) next.price = "O preço deve ser maior que zero.";
    if (!Number.isInteger(stock) || stock < 0) next.stock = "Informe uma quantidade inteira, sem valores negativos.";
    if (!shown) next.image = "Adicione uma imagem do produto.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const imageUrl = file ? await uploadProductImage(file) : image;
      await save({
        name: form.name,
        description: form.description,
        category: form.category,
        unit: form.unit,
        stock,
        price: Math.round(price * 100) / 100,
        active: form.active,
        image: imageUrl,
      });
    } catch (err) {
      setErrors({ form: errorMessage(err) });
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle
        icon={<PackagePlus />}
        title={mode === "new" ? "Novo Produto" : "Editar Produto"}
        subtitle={mode === "new" ? "Preencha as informações para cadastrar um produto no estoque" : "Atualize as informações do produto abaixo"}
        back={back}
      />
      <form className="form-card" onSubmit={submit} noValidate>
        <div className="form-section-title">
          <div>
            <span>01</span>
            <div>
              <h3>Informações do produto</h3>
              <p>Dados principais para identificação e organização.</p>
            </div>
          </div>
          <span>Campos com * são obrigatórios</span>
        </div>
        {errors.form && (
          <div className="alert error" style={{ marginTop: 0, marginBottom: 18 }}>
            <AlertCircle size={18} />
            {errors.form}
          </div>
        )}
        <div className="product-form-layout">
          <div className="fields-area">
            <div className="two-col">
              <Field label="Nome do produto" required error={errors.name}>
                <TextInput placeholder="Ex.: Monitor Vision 27”" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Identificador" hint={mode === "new" ? "Gerado automaticamente ao salvar" : undefined}>
                <TextInput value={current?.code ?? "SC-····"} disabled />
              </Field>
            </div>
            <Field label="Descrição" required error={errors.description}>
              <textarea
                className="control textarea"
                placeholder="Descreva as principais características do produto..."
                maxLength={500}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
              <span className="counter">{form.description.length}/500</span>
            </Field>
            <div className="two-col">
              <Field label="Categoria" required error={errors.category}>
                <SelectInput value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="">Selecione uma categoria</option>
                  {productCategories.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Tamanho ou unidade" required>
                <SelectInput value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  {units.map(u => (
                    <option key={u}>{u}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <div className="three-col">
              <Field label={mode === "new" ? "Quantidade inicial" : "Quantidade atual"} required error={errors.stock}>
                <TextInput type="number" min="0" step="1" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
              </Field>
              <Field label="Preço de venda" required error={errors.price}>
                <div className="money-input">
                  <span>R$</span>
                  <TextInput type="number" min="0" step="0.01" placeholder="0,00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>
              </Field>
              <Field label="Status" required>
                <SelectInput value={form.active ? "Ativo" : "Inativo"} onChange={e => setForm({ ...form, active: e.target.value === "Ativo" })}>
                  <option>Ativo</option>
                  <option>Inativo</option>
                </SelectInput>
              </Field>
            </div>
            {mode === "edit" && (
              <div className="info-note">
                <AlertCircle size={18} />
                <span>
                  <strong>Atenção:</strong> Alterações no estoque serão registradas no histórico de movimentações.
                </span>
              </div>
            )}
          </div>
          <div className="image-area">
            <Field label="Imagem do produto" required error={errors.image}>
              <div className="image-preview">
                {shown ? (
                  <img src={shown} alt="Pré-visualização" />
                ) : (
                  <div className="image-placeholder">
                    <ImagePlus size={30} />
                    Nenhuma imagem selecionada
                  </div>
                )}
                {shown && (
                  <div className="image-overlay">
                    <Upload />
                    <span>Pré-visualização</span>
                  </div>
                )}
              </div>
            </Field>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
            <div className="image-actions">
              <Button type="button" variant="secondary" icon={<ImagePlus size={16} />} onClick={() => fileInput.current?.click()}>
                {shown ? "Trocar imagem" : "Adicionar imagem"}
              </Button>
              <Button type="button" variant="ghost" icon={<Trash2 size={16} />} disabled={!shown} onClick={() => { setFile(null); setImage(""); }}>
                Remover
              </Button>
            </div>
            <p>JPG, PNG ou WEBP. Tamanho máximo de 5 MB.</p>
          </div>
        </div>
        <div className="form-footer">
          {complete ? (
            <p>
              <ShieldCheck size={17} />
              As alterações ficam registradas para auditoria.
            </p>
          ) : (
            <p className="incomplete">
              <AlertCircle size={17} />
              Preencha {missing.join(", ")} para habilitar o botão.
            </p>
          )}
          <div>
            <Button type="button" variant="secondary" onClick={back}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !complete} title={complete ? undefined : "Preencha todos os campos obrigatórios"} icon={saving ? <span className="spinner" /> : <Check size={17} />}>
              {saving ? "Salvando..." : mode === "new" ? "Cadastrar produto" : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
