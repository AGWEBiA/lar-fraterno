import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Calendar, Heart, ScrollText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImg from "@/assets/hero-evangelho.jpg";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Luz dourada sobre um livro aberto e copo de água — atmosfera contemplativa"
            className="w-full h-full object-cover"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
        </div>

        <div className="container relative py-20 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-soft text-primary text-xs font-medium mb-6">
              <Sparkles className="h-3 w-3" />
              Estudo semanal em família
            </div>
            <h1 className="font-serif text-5xl md:text-7xl font-semibold text-primary leading-[1.05] mb-6">
              Um momento de paz, todos os dias da semana.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl">
              Roteiro guiado, leitura em áudio do Evangelho Segundo o Espiritismo, agenda semanal e lembretes — tudo o que você precisa para realizar o Evangelho no Lar com serenidade.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="hero">
                <Link to="/reuniao">
                  Iniciar reunião <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to={user ? "/agenda" : "/auth"}>
                  <Calendar className="mr-1 h-4 w-4" />
                  Agendar dia da semana
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-serif text-4xl md:text-5xl font-semibold text-primary mb-3">
            Tudo o que sua reunião precisa
          </h2>
          <p className="text-muted-foreground">
            Fidelidade aos ensinos de Allan Kardec, com uma experiência simples, bonita e contemplativa.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: ScrollText,
              title: "Roteiro guiado",
              desc: "Prece inicial, leitura, comentários, vibrações e prece final. Cada passo no seu tempo.",
              to: "/reuniao",
            },
            {
              icon: BookOpen,
              title: "Evangelho em áudio",
              desc: "Capítulos selecionados com leitura por voz do navegador. Sem sair da página.",
              to: "/biblioteca",
            },
            {
              icon: Calendar,
              title: "Agenda & lembretes",
              desc: "Escolha o dia e horário fixos. Receba avisos por notificação, e-mail ou WhatsApp.",
              to: "/agenda",
            },
          ].map((f) => (
            <Link key={f.title} to={f.to}>
              <Card className="p-6 h-full transition-smooth hover:shadow-elegant hover:-translate-y-1 cursor-pointer group bg-card/80 border-border/50">
                <div className="h-12 w-12 rounded-full bg-gradient-gold flex items-center justify-center mb-4 shadow-soft group-hover:shadow-glow transition-smooth">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-serif text-2xl font-semibold text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Sobre */}
      <section className="bg-card/60 border-y border-border/50 py-16 md:py-24">
        <div className="container max-w-3xl text-center">
          <Heart className="h-10 w-10 text-accent mx-auto mb-4" />
          <h2 className="font-serif text-4xl md:text-5xl font-semibold text-primary mb-6">
            O Evangelho no Lar
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">
            É uma reunião familiar semanal de 15 a 30 minutos para estudar os ensinamentos de Jesus à luz da Doutrina Espírita. Visa harmonizar o ambiente doméstico, educar o espírito e fluidificar a água que será tomada como auxílio espiritual.
          </p>
          <p className="text-muted-foreground italic">
            "Bem-aventurados os puros de coração, porque verão a Deus."
          </p>
        </div>
      </section>
    </>
  );
};

export default Index;
