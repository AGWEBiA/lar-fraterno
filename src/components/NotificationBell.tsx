import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const kindIcon = (kind: string) => {
  if (kind === "batch_finished") return "✅";
  if (kind === "batch_failed") return "⚠️";
  if (kind === "batch_started") return "🎙️";
  return "🔔";
};

export const NotificationBell = () => {
  const { items, unreadCount, markAllRead } = useNotifications();
  return (
    <Popover onOpenChange={(o) => { if (!o && unreadCount > 0) markAllRead(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]">{unreadCount}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b border-border/50 flex items-center justify-between">
          <p className="font-medium text-sm">Notificações</p>
          {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-primary hover:underline">Marcar todas como lidas</button>}
        </div>
        <div className="max-h-96 overflow-auto">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
          ) : items.map((n) => (
            <div key={n.id} className={`p-3 border-b border-border/30 text-sm ${!n.read ? "bg-secondary/40" : ""}`}>
              <p className="font-medium flex items-center gap-1.5">
                <span>{kindIcon(n.kind)}</span>{n.title}
              </p>
              {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
