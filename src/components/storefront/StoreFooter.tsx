import { StoreInfo } from "@/types/store";
import { MapPin, Phone, Instagram, CreditCard, ExternalLink, Heart } from "lucide-react";

interface StoreFooterProps {
  store: StoreInfo;
}

export function StoreFooter({ store }: StoreFooterProps) {
  return (
    <footer className="relative bg-gradient-to-b from-secondary/30 via-secondary/50 to-secondary/80 border-t border-border/50 mt-16 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container relative py-10 sm:py-12 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10">
          {/* Contact */}
          <div className="animate-fade-in">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-base font-display">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone className="w-4 h-4 text-primary" />
              </div>
              Contato
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="font-medium">{store.phone}</p>
              {store.instagram && (
                <a
                  href={`https://instagram.com/${store.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary transition-colors group"
                >
                  <Instagram className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">{store.instagram}</span>
                </a>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="animate-fade-in stagger-1">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-base font-display">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-accent" />
              </div>
              Localização
            </h3>
            <p className="text-sm text-muted-foreground mb-2">{store.address}</p>
            {store.googleMapsUrl && (
              <a
                href={store.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline group"
              >
                Ver no mapa
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            )}
          </div>

          {/* Payment Methods */}
          <div className="sm:col-span-2 md:col-span-1 animate-fade-in stagger-2">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-base font-display">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              Formas de Pagamento
            </h3>
            <div className="flex flex-wrap gap-2">
              {store.acceptedPayments.map((payment) => (
                <span
                  key={payment}
                  className="bg-card text-foreground text-xs px-3 py-1.5 rounded-full border border-border shadow-xs font-medium"
                >
                  {payment}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-border/50 text-center">
          <p className="text-sm text-muted-foreground font-medium">
            © {new Date().getFullYear()} {store.name}. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2 flex items-center justify-center gap-1">
            Feito com <Heart className="w-3 h-3 text-primary fill-primary animate-pulse" /> para você
          </p>
        </div>
      </div>
    </footer>
  );
}
