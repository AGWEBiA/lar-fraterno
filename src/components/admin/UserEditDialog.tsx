import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { KeyRound, LogOut, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: { id: string; full_name: string | null; email: string | null; phone?: string | null } | null;
  onChanged: () => void;
}

export const UserEditDialog = ({ open, onOpenChange, user, onChanged }: Props) => {
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // sync quando abrir
  useState(() => {
    setFullName(user?.full_name ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? "");
  });

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action, userId: user.id, ...extra },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message || "Concluído");
      onChanged();
      if (action === "delete") onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">E-mail (exibido no perfil)</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            <p className="text-[10px] text-muted-foreground mt-1">Atualiza apenas o e-mail mostrado no perfil. O e-mail de login no auth permanece o mesmo.</p>
          </div>
          <div>
            <Label className="text-xs">Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-9999" />
          </div>

          <div className="border-t pt-3 space-y-2">
            <Button variant="outline" className="w-full justify-start" disabled={busy}
              onClick={() => call("reset_password")}>
              <KeyRound className="h-4 w-4 mr-2" />Enviar e-mail de reset de senha
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled={busy}
              onClick={() => call("revoke_sessions")}>
              <LogOut className="h-4 w-4 mr-2" />Forçar logout (revogar sessões)
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start" disabled={busy}>
                  <Trash2 className="h-4 w-4 mr-2" />Excluir usuário definitivamente
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é <strong>irreversível</strong>. Apaga o usuário do auth e todos os dados associados (perfil, papéis, vínculos a grupos).
                    Para confirmar, digite o e-mail <code className="bg-muted px-1">{user.email}</code> abaixo:
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={user.email ?? ""} />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleteConfirm !== user.email}
                    onClick={() => call("delete")}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir definitivamente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Fechar</Button>
          <Button variant="hero" disabled={busy}
            onClick={() => call("update_profile", { fullName, email, phone })}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar perfil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
