import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Perfil = () => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setName(data.full_name ?? "");
        setPhone(data.phone ?? "");
      }
      setLoading(false);
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado!");
  };

  if (loading) return <div className="container py-12 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="container py-8 md:py-12 max-w-xl">
      <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary mb-2">Perfil</h1>
      <p className="text-muted-foreground mb-8">{user?.email}</p>

      <Card className="p-6 shadow-soft border-border/50 bg-card/90 space-y-4">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="phone">Telefone (WhatsApp)</Label>
          <Input id="phone" placeholder="+55 11 90000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Button onClick={save} variant="hero" className="w-full">Salvar alterações</Button>
      </Card>
    </div>
  );
};

export default Perfil;
