import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Transylvania Chronicles" }] }),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        toast.success("Conta criada. Aguarde o mestre associar você a um personagem.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center font-display uppercase tracking-[0.3em] text-blood text-sm mb-8">Transylvania Chronicles</Link>
        <div className="border border-border/60 bg-card/60 p-8 rounded-sm">
          <h1 className="font-display uppercase tracking-widest text-xl text-bone text-center mb-1">
            {mode === "signin" ? "Retornar" : "Ingressar"}
          </h1>
          <hr className="blood-rule mb-6" />
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nome</label>
                <Input value={name} onChange={(e)=>setName(e.target.value)} maxLength={60} />
              </div>
            )}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Email</label>
              <Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Senha</label>
              <Input type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full font-display uppercase tracking-widest">
              {loading ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <button type="button" onClick={()=>setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full mt-4 text-xs text-muted-foreground hover:text-blood transition-colors">
            {mode === "signin" ? "Ainda não tem conta? Crie uma." : "Já tem conta? Entre."}
          </button>
        </div>
      </div>
    </div>
  );
}
