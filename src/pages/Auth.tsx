import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Store, Loader2, Eye, EyeOff, ShieldCheck, Sparkle } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/admin");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate inputs
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("Email ou senha incorretos");
      } else if (error.message.includes("Email not confirmed")) {
        setError("Por favor, confirme seu email antes de fazer login");
      } else {
        setError("Erro ao fazer login. Tente novamente.");
      }
    }
  };

  return (
    <div className="landing-theme min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Painel editorial */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[hsl(var(--cocoa))] text-[hsl(var(--cocoa-foreground))] p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-24 h-[26rem] w-[26rem] rounded-full bg-primary/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-16 h-[24rem] w-[24rem] rounded-full bg-accent/25 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Store className="h-5 w-5" />
          </span>
          <span className="font-[var(--font-display)] text-2xl tracking-tight">Vitrine</span>
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--cocoa-foreground)/0.2)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
            <Sparkle className="h-3 w-3" />
            Painel da confeiteira
          </span>
          <h2 className="mt-6 font-[var(--font-display)] text-[2.6rem] leading-[1.08]">
            Sua doceria inteira{" "}
            <em className="text-primary not-italic">em um lugar só.</em>
          </h2>
          <p className="mt-5 text-base leading-relaxed opacity-75">
            Pedidos, cardápio, estoque de insumos e entregas — organizados enquanto
            você faz o que ama: confeitar.
          </p>
        </div>

        <dl className="relative grid grid-cols-3 gap-6 border-t border-[hsl(var(--cocoa-foreground)/0.15)] pt-8">
          {[
            { k: "0%", v: "de taxa por pedido" },
            { k: "24h", v: "loja no ar" },
            { k: "1 min", v: "para começar" },
          ].map((s) => (
            <div key={s.k}>
              <dt className="font-[var(--font-display)] text-2xl">{s.k}</dt>
              <dd className="mt-1 text-xs uppercase tracking-wide opacity-65">{s.v}</dd>
            </div>
          ))}
        </dl>
      </aside>

      {/* Formulário */}
      <main className="relative flex items-center justify-center px-5 py-14 sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.08),transparent_70%)]"
        />
        <div className="relative w-full max-w-[27rem] animate-fade-in">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Store className="h-5 w-5" />
            </span>
            <span className="font-[var(--font-display)] text-2xl">Vitrine</span>
          </div>

          <h1 className="font-[var(--font-display)] text-[2.1rem] leading-tight">
            Bem-vinda de volta
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre para gerenciar sua loja e seus pedidos.
          </p>

          <div className="mt-8 rounded-[var(--radius)] border border-border bg-card p-7 shadow-[0_24px_60px_-30px_hsl(var(--cocoa)/0.35)] sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-2xl border border-input bg-secondary/60 px-4 py-3.5 text-[15px] text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-input bg-secondary/60 px-4 py-3.5 pr-12 text-[15px] text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive animate-slide-up">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground shadow-[0_14px_30px_-12px_hsl(var(--primary)/0.7)] transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar na minha loja"
                )}
              </button>
            </form>
          </div>

          <p className="mt-7 flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>Acesso restrito. Apenas usuários cadastrados pelo administrador podem entrar.</span>
          </p>
        </div>
      </main>
    </div>
  );
}
