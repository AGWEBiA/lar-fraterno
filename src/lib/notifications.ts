// Notificações do navegador (Web Notifications API) para avisar
// quando uma geração de áudio termina, mesmo se a aba estiver em segundo plano.
const isSupported = () =>
  typeof window !== "undefined" && "Notification" in window;

export const ensureNotificationPermission = async (): Promise<boolean> => {
  if (!isSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
};

export const notifyDesktop = (title: string, body: string) => {
  if (!isSupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/placeholder.svg",
      tag: "evangelho-no-lar",
    });
    // Foca a aba ao clicar
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // alguns navegadores móveis lançam erro fora de SW — ignorar silenciosamente.
  }
};
