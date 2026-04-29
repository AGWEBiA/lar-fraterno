import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Apple,
  ArrowLeft,
  CheckCircle2,
  Download,
  Home,
  MoreVertical,
  Share,
  Smartphone,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const detectPlatform = (): "ios" | "android" | "desktop" => {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
};

const Install = () => {
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    // Detecta se já está rodando como app instalado
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS legacy
      (window.navigator as any).standalone === true;
    setInstalled(!!isStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      toast.success("App instalado com sucesso!");
    });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const triggerInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      toast.success("Instalando o app…");
      setInstallEvent(null);
    }
  };

  const defaultTab = platform === "ios" ? "ios" : platform === "android" ? "android" : "desktop";

  return (
    <div className="container py-6 md:py-12 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-smooth mb-4">
        <ArrowLeft className="h-4 w-4" /> Início
      </Link>

      <div className="text-center mb-8">
        <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-gold flex items-center justify-center shadow-glow mb-4">
          <Smartphone className="h-10 w-10 text-primary" />
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary">
          Instale o app no seu celular
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Tenha o Evangelho no Lar como um app no seu celular: ícone na tela inicial, abertura em
          tela cheia e acesso rápido às reuniões.
        </p>
      </div>

      {installed && (
        <Card className="p-4 mb-6 bg-emerald-500/10 border-emerald-500/30 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-medium text-emerald-700 dark:text-emerald-300">App já instalado</p>
            <p className="text-xs text-muted-foreground">
              Você está vendo isto pelo app instalado. Tudo pronto!
            </p>
          </div>
        </Card>
      )}

      {installEvent && !installed && (
        <Card className="p-5 mb-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-serif text-lg text-primary">Instalação em 1 clique disponível</p>
              <p className="text-xs text-muted-foreground">
                Seu navegador suporta a instalação automática.
              </p>
            </div>
            <Button onClick={triggerInstall} variant="hero" size="lg">
              <Download className="h-4 w-4" /> Instalar agora
            </Button>
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <Card className="p-4 text-center bg-card/80">
          <Home className="h-6 w-6 mx-auto text-primary mb-1" />
          <p className="text-xs font-medium">Ícone na tela inicial</p>
        </Card>
        <Card className="p-4 text-center bg-card/80">
          <Sparkles className="h-6 w-6 mx-auto text-primary mb-1" />
          <p className="text-xs font-medium">Tela cheia, sem barra do navegador</p>
        </Card>
        <Card className="p-4 text-center bg-card/80">
          <WifiOff className="h-6 w-6 mx-auto text-primary mb-1" />
          <p className="text-xs font-medium">Abre rápido, mesmo offline*</p>
        </Card>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="ios" className="gap-1">
            <Apple className="h-4 w-4" /> iPhone / iPad
          </TabsTrigger>
          <TabsTrigger value="android" className="gap-1">
            <Smartphone className="h-4 w-4" /> Android
          </TabsTrigger>
          <TabsTrigger value="desktop">Computador</TabsTrigger>
        </TabsList>

        {/* iOS */}
        <TabsContent value="ios" className="mt-4">
          <Card className="p-5 bg-card/90">
            {platform === "ios" && (
              <Badge variant="outline" className="border-accent/40 mb-3">Você está no iPhone/iPad</Badge>
            )}
            <h2 className="font-serif text-xl text-primary mb-3">Como instalar no iPhone/iPad</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Abra este site no <strong>Safari</strong> (não funciona em outros navegadores no iOS).
            </p>
            <ol className="space-y-4">
              <Step
                n={1}
                title="Toque no botão Compartilhar"
                desc="É o ícone de quadrado com seta para cima, na barra inferior do Safari."
                icon={<Share className="h-5 w-5" />}
              />
              <Step
                n={2}
                title='Escolha "Adicionar à Tela de Início"'
                desc="Role o menu para baixo até encontrar essa opção."
                icon={<Home className="h-5 w-5" />}
              />
              <Step
                n={3}
                title='Toque em "Adicionar"'
                desc="O ícone do Evangelho no Lar aparecerá na tela inicial do seu iPhone, como qualquer outro app."
                icon={<CheckCircle2 className="h-5 w-5" />}
              />
            </ol>
          </Card>
        </TabsContent>

        {/* Android */}
        <TabsContent value="android" className="mt-4">
          <Card className="p-5 bg-card/90">
            {platform === "android" && (
              <Badge variant="outline" className="border-accent/40 mb-3">Você está no Android</Badge>
            )}
            <h2 className="font-serif text-xl text-primary mb-3">Como instalar no Android</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Use o <strong>Google Chrome</strong> ou outro navegador moderno.
            </p>
            {installEvent ? (
              <div className="mb-4 p-3 rounded-md bg-accent-soft/50 border border-accent/30">
                <p className="text-sm text-primary font-medium mb-2">
                  ✨ Toque no botão para instalar com 1 clique:
                </p>
                <Button onClick={triggerInstall} variant="hero" className="w-full">
                  <Download className="h-4 w-4" /> Instalar Evangelho no Lar
                </Button>
              </div>
            ) : null}
            <ol className="space-y-4">
              <Step
                n={1}
                title="Toque nos três pontinhos"
                desc="No canto superior direito do Chrome."
                icon={<MoreVertical className="h-5 w-5" />}
              />
              <Step
                n={2}
                title='Escolha "Instalar app" ou "Adicionar à tela inicial"'
                desc="O nome pode variar conforme o navegador."
                icon={<Download className="h-5 w-5" />}
              />
              <Step
                n={3}
                title="Confirme a instalação"
                desc="O app aparecerá na sua gaveta de aplicativos e na tela inicial."
                icon={<CheckCircle2 className="h-5 w-5" />}
              />
            </ol>
          </Card>
        </TabsContent>

        {/* Desktop */}
        <TabsContent value="desktop" className="mt-4">
          <Card className="p-5 bg-card/90">
            <h2 className="font-serif text-xl text-primary mb-3">Como instalar no computador</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Funciona no Chrome, Edge e Brave (no Mac, também no Safari 17+).
            </p>
            <ol className="space-y-4">
              <Step
                n={1}
                title="Procure o ícone de instalação na barra de endereço"
                desc='Geralmente é um ícone de monitor com seta, ao lado direito do endereço. Pode aparecer também como "Instalar".'
                icon={<Download className="h-5 w-5" />}
              />
              <Step
                n={2}
                title='Clique em "Instalar"'
                desc="O app abrirá em uma janela própria, sem barras do navegador."
                icon={<Sparkles className="h-5 w-5" />}
              />
            </ol>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-[11px] text-muted-foreground text-center mt-6 max-w-md mx-auto">
        * Algumas funções (como geração de áudio) precisam de internet.
        O conteúdo do Evangelho fica disponível para leitura mesmo sem conexão após a primeira visita.
      </p>
    </div>
  );
};

const Step = ({
  n,
  title,
  desc,
  icon,
}: {
  n: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) => (
  <li className="flex gap-3 items-start">
    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif font-semibold">
      {n}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-primary text-sm flex items-center gap-2">
        {icon}
        {title}
      </p>
      <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
    </div>
  </li>
);

export default Install;
