import { useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, Info, ShieldCheck, User, UserPlus } from "lucide-react";
import { LogoMark } from "../components/LogoMark";
import { Button, Field, Logo, TextInput, errorMessage } from "../components/ui";
import { isDemo, resetPassword, signIn, signInDemoUser, signUp } from "../lib/api";
import type { Profile, Screen } from "../types";

function AuthLayout({ children, mode }: { children: ReactNode; mode: "login" | "signup" }) {
  return (
    <main className="auth-layout">
      <section className="auth-brand">
        <div className="auth-brand-inner">
          <Logo />
          <div className="auth-copy">
            <span className="eyebrow">Gestão simples. Decisões melhores.</span>
            <h2>Seu estoque sob controle, todos os dias.</h2>
            <p>Centralize produtos, acompanhe movimentações e mantenha sua operação organizada em um único lugar.</p>
          </div>
          <div className="auth-stat-grid">
            <div>
              <strong>115</strong>
              <span>itens ativos</span>
            </div>
            <div>
              <strong>98,4%</strong>
              <span>acurácia</span>
            </div>
            <div>
              <strong>24h</strong>
              <span>monitoramento</span>
            </div>
          </div>
        </div>
        <div className="auth-decoration">
          <LogoMark size={220} />
        </div>
      </section>
      <section className="auth-panel">
        <div className={`auth-card ${mode === "signup" ? "wide" : ""}`}>{children}</div>
        <p className="auth-footer">© 2026 StockControl · Gestão inteligente de estoque</p>
      </section>
    </main>
  );
}

export function Login({ go, onSignedIn, notice }: { go: (s: Screen) => void; onSignedIn: (p: Profile) => void; notice?: string }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(notice ?? "");
  const [values, setValues] = useState({ email: "", password: "" });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setInfo("");
    if (!values.email || !values.password) return setError("Preencha o e-mail e a senha para continuar.");
    setError("");
    setLoading(true);
    try {
      onSignedIn(await signIn(values.email, values.password));
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  const forgot = async () => {
    setInfo("");
    if (!values.email.includes("@")) return setError("Digite seu e-mail no campo acima para recuperar a senha.");
    try {
      await resetPassword(values.email);
      setError("");
      setInfo("Se houver uma conta com este e-mail, enviamos um link para redefinir a senha.");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <AuthLayout mode="login">
      <div className="mobile-logo">
        <Logo />
      </div>
      <div className="auth-heading">
        <span className="eyebrow blue">Bem-vindo de volta</span>
        <h1>Entrar no StockControl</h1>
        <p>Acesse sua conta para gerenciar o estoque.</p>
      </div>
      {error && (
        <div className="alert error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {info && !error && (
        <div className="alert success">
          <Check size={18} />
          <span>{info}</span>
        </div>
      )}
      <form onSubmit={submit} className="auth-form" noValidate>
        <Field label="E-mail" required>
          <TextInput type="email" autoComplete="email" placeholder="seuemail@empresa.com" value={values.email} onChange={e => setValues({ ...values, email: e.target.value })} />
        </Field>
        <Field label="Senha" required>
          <div className="password-wrap">
            <TextInput type={show ? "text" : "password"} autoComplete="current-password" placeholder="Digite sua senha" value={values.password} onChange={e => setValues({ ...values, password: e.target.value })} />
            <button type="button" aria-label={show ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShow(!show)}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <div className="form-meta">
          <label>
            <input type="checkbox" defaultChecked /> Lembrar meu acesso
          </label>
          <button type="button" onClick={forgot}>
            Esqueci minha senha
          </button>
        </div>
        <Button className="full" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" />
              Autenticando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>
      <div className="auth-divider">
        <span>{isDemo ? "ou acesse a demonstração" : "ainda não tem acesso?"}</span>
      </div>
      <div className={`demo-actions ${isDemo ? "" : "single"}`}>
        {isDemo && (
          <Button variant="secondary" onClick={async () => onSignedIn(await signInDemoUser())} icon={<User size={17} />}>
            Como usuário
          </Button>
        )}
        <Button variant="secondary" onClick={() => go("signup")} icon={<UserPlus size={17} />}>
          Criar conta
        </Button>
      </div>
      {isDemo && (
        <div className="alert info">
          <Info size={18} />
          <span>Modo demonstração: entre com qualquer e-mail e senha para acessar como administrador.</span>
        </div>
      )}
      <div className="secure-note">
        <ShieldCheck size={16} /> Seus dados são protegidos e criptografados.
      </div>
    </AuthLayout>
  );
}

export function Signup({ go, onDone }: { go: (s: Screen) => void; onDone: (message: string) => void }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (Object.values(values).some(v => !v.trim())) return setError("Todos os campos são obrigatórios.");
    if (!/^\S+@\S+\.\S+$/.test(values.email)) return setError("Informe um endereço de e-mail válido.");
    if (values.password.length < 8) return setError("A senha deve ter pelo menos 8 caracteres.");
    if (values.password !== values.confirm) return setError("As senhas informadas não coincidem.");
    setError("");
    setLoading(true);
    try {
      const active = await signUp(values.name, values.email, values.password);
      onDone(
        active
          ? "Usuário cadastrado com sucesso. Você já pode entrar."
          : "Cadastro realizado! Confirme seu e-mail pelo link que enviamos e depois entre.",
      );
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthLayout mode="signup">
      <div className="mobile-logo">
        <Logo />
      </div>
      <button className="back-link" onClick={() => go("login")}>
        <ArrowLeft size={16} /> Voltar para o login
      </button>
      <div className="auth-heading">
        <span className="eyebrow blue">Novo acesso</span>
        <h1>Cadastro de usuário</h1>
        <p>Crie sua conta para acessar o catálogo de produtos.</p>
      </div>
      {error && (
        <div className="alert error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      <form className="auth-form form-grid" onSubmit={submit} noValidate>
        <Field label="Nome completo" required>
          <TextInput autoComplete="name" placeholder="Digite seu nome" value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} />
        </Field>
        <Field label="E-mail" required>
          <TextInput type="email" autoComplete="email" placeholder="seuemail@empresa.com" value={values.email} onChange={e => setValues({ ...values, email: e.target.value })} />
        </Field>
        <Field label="Senha" required>
          <div className="password-wrap">
            <TextInput type={show ? "text" : "password"} autoComplete="new-password" placeholder="Mínimo de 8 caracteres" value={values.password} onChange={e => setValues({ ...values, password: e.target.value })} />
            <button type="button" aria-label={show ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShow(!show)}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <Field label="Confirmar senha" required>
          <TextInput type="password" autoComplete="new-password" placeholder="Repita sua senha" value={values.confirm} onChange={e => setValues({ ...values, confirm: e.target.value })} />
        </Field>
        <div className="public-role-note">
          <ShieldCheck size={18} />
          <span>
            <strong>Perfil de usuário comum</strong>O perfil de administrador só pode ser concedido por um administrador autorizado.
          </span>
        </div>
        <div className="form-actions span-2">
          <Button type="button" variant="secondary" onClick={() => go("login")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                Cadastrando...
              </>
            ) : (
              "Cadastrar usuário"
            )}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
