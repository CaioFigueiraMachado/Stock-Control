import { ArrowDown, ArrowUp, LayoutDashboard } from "lucide-react";
import { Button, Field, PageTitle, SelectInput, StatusBadge, TextInput } from "../components/ui";

export function DesignSystem({ back }: { back: () => void }) {
  return (
    <>
      <PageTitle icon={<LayoutDashboard />} title="Design System" subtitle="Componentes, tokens e padrões visuais do StockControl" back={back} />
      <div className="ds-grid">
        <section className="card">
          <h3>Cores principais</h3>
          <div className="swatches">
            {["navy", "navy2", "blue", "light", "green", "red", "yellow"].map(c => (
              <div key={c}>
                <span className={c} />
                <small>{c}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <h3>Botões</h3>
          <div className="component-row">
            <Button>Primário</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="danger">Perigo</Button>
            <Button disabled>Desabilitado</Button>
          </div>
        </section>
        <section className="card">
          <h3>Estados e etiquetas</h3>
          <div className="component-row">
            <StatusBadge stock={20} />
            <StatusBadge stock={2} />
            <span className="movement-badge entrada">
              <ArrowUp />
              Entrada
            </span>
            <span className="movement-badge saída">
              <ArrowDown />
              Saída
            </span>
          </div>
        </section>
        <section className="card">
          <h3>Campos de formulário</h3>
          <div className="two-col">
            <Field label="Campo padrão">
              <TextInput placeholder="Digite uma informação" />
            </Field>
            <Field label="Seleção">
              <SelectInput>
                <option>Selecione uma opção</option>
              </SelectInput>
            </Field>
          </div>
        </section>
      </div>
    </>
  );
}
