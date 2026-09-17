import { StoreInfo } from "@/types/store";
import { MapPin, Clock, Star, ChevronDown, CreditCard, ExternalLink, User, LogOut, Sparkles, Zap, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { OrderHistorySheet } from "./OrderHistorySheet";
import { CustomerAuthModal } from "./CustomerAuthModal";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

interface StoreHeaderProps {
  store: StoreInfo;
  storeId?: string;
}

export function StoreHeader({ store, storeId }: StoreHeaderProps) {
  const [showHours, setShowHours] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(false);
  const { customer, logout, isLoading: authLoading } = useCustomerAuth();

  return (
    <div className="relative overflow-hidden">
      {/* Hero Cover Image — compact on mobile */}
      <div className="relative h-36 sm:h-56 md:h-96 w-full overflow-hidden">
        <img
          src={store.coverImage}
          alt={store.name}
          className="w-full h-full object-cover"
          loading="eager"
        />
        
        {/* Cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-transparent to-accent/15" />
        
        {/* Animated blur orbs — desktop only, and static when the user asks for less motion */}
        <div className="hidden lg:block absolute -top-32 -right-32 w-96 h-96 bg-primary/25 rounded-full blur-3xl motion-safe:animate-pulse" />
        <div className="hidden lg:block absolute -bottom-32 -left-32 w-96 h-96 bg-accent/25 rounded-full blur-3xl motion-safe:animate-pulse" style={{ animationDelay: "1s" }} />

        
        {/* Trust badge — top left on mobile */}
        <div className="absolute top-3 left-3 sm:top-4 sm:right-4 sm:left-auto flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
          <span className="text-white text-xs font-medium">Verificada</span>
        </div>

        {/* Customer Account — compact icon on mobile, top right */}
        {!authLoading && (
          <div className="absolute top-3 right-3 sm:hidden">
            {customer ? (
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1.5 border border-white/20">
                <User className="w-3.5 h-3.5 text-white" />
                <span className="text-white text-xs font-medium max-w-[60px] truncate">{customer.name.split(' ')[0]}</span>
                {storeId && <OrderHistorySheet storeId={storeId} />}
                <button onClick={logout} className="text-white/70 p-0.5">
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20 text-white text-xs font-medium"
              >
                <User className="w-3.5 h-3.5" />
                Entrar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Store Info Card */}
      <div className="container relative -mt-14 sm:-mt-28 md:-mt-36 px-3 sm:px-4 z-10">
        <div className="glass rounded-2xl sm:rounded-3xl shadow-elevation p-3 sm:p-6 md:p-8 animate-slide-up border border-white/30">
          <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-6">
            
            {/* Logo + Name row on mobile */}
            <div className="flex items-center gap-3 md:flex-col">
              <div className="relative w-14 h-14 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-strong border-2 sm:border-4 border-white/80 shrink-0">
                {store.logo && store.logo !== "/placeholder.svg" ? (
                  <img src={store.logo} alt={store.name} className="w-full h-full object-cover" loading="eager" />
                ) : (
                  <span className="text-3xl sm:text-6xl">🍽️</span>
                )}
              </div>

              {/* Mobile: name + status inline */}
              <div className="md:hidden flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-foreground font-display tracking-tight leading-tight truncate">
                    {store.name}
                  </h1>
                  <Badge
                    className={`px-2 py-0.5 text-xs font-semibold shrink-0 ${
                      store.canOrderInstant !== false
                        ? "bg-accent text-accent-foreground" 
                        : store.canOrderPreorder
                          ? "bg-amber-500/15 text-amber-700"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                      store.canOrderInstant !== false ? "bg-white" : store.canOrderPreorder ? "bg-amber-500" : "bg-muted-foreground"
                    }`} />
                    {store.canOrderInstant !== false ? "Aberto" : store.canOrderPreorder ? "📦 Encomendas" : "Fechado"}
                  </Badge>
                </div>
                <button
                  onClick={() => setExpandedDesc(!expandedDesc)}
                  className="text-left w-full mt-0.5 group/desc"
                >
                  <p className={`text-muted-foreground text-xs transition-all duration-300 ${expandedDesc ? "" : "line-clamp-2"}`}>
                    {store.description}
                  </p>
                  {!expandedDesc && store.description && store.description.length > 60 && (
                    <span className="text-primary text-[10px] font-semibold inline-flex items-center gap-0.5 mt-0.5">
                      ver mais <ChevronRight className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Main Info — desktop */}
            <div className="flex-1 hidden md:block text-left">
              {/* Store Name & Status */}
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-2xl md:text-4xl font-bold text-foreground font-display tracking-tight leading-tight">
                  {store.name}
                </h1>
                <Badge
                  className={`px-3 py-1 text-sm font-semibold ${
                    store.canOrderInstant !== false
                      ? "bg-accent text-accent-foreground shadow-glow-accent animate-pulse-attention" 
                      : store.canOrderPreorder
                        ? "bg-amber-500/15 text-amber-700 border border-amber-500/30"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    store.canOrderInstant !== false ? "bg-white animate-ping" : store.canOrderPreorder ? "bg-amber-500" : "bg-muted-foreground"
                  }`} />
                  {store.canOrderInstant !== false ? "Aberto Agora" : store.canOrderPreorder ? "📦 Aceitando Encomendas" : "Fechado"}
                </Badge>
              </div>

              {/* Customer Account — desktop */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {!authLoading && (
                  <>
                    {customer ? (
                      <div className="flex items-center gap-2 bg-secondary/80 rounded-full px-4 py-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{customer.name}</span>
                        {storeId && <OrderHistorySheet storeId={storeId} />}
                        <button onClick={logout} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setShowAuthModal(true)}
                        variant="outline"
                        size="sm"
                        className="rounded-full px-5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Entrar / Cadastrar
                      </Button>
                    )}
                  </>
                )}
              </div>

              <p className="text-muted-foreground text-sm md:text-base mb-4 max-w-xl line-clamp-2 text-pretty">
                {store.description}
              </p>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-3">
                {(store.rating || store.reviewCount) && (
                  <div className="flex items-center gap-1.5 bg-warning/10 text-warning-foreground px-3 py-1.5 rounded-full">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    <span className="font-bold">{store.rating || "4.8"}</span>
                    <span className="text-muted-foreground text-sm">({store.reviewCount || 0})</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1.5 rounded-full">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium text-sm">{store.estimatedTime}</span>
                </div>
                {store.address && (
                  <div className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm truncate max-w-[150px]">{store.address.split("-")[0]}</span>
                    {store.googleMapsUrl && (
                      <a href={store.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:scale-110 transition-transform">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              {store.acceptedPayments.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <div className="flex flex-wrap gap-1.5">
                    {store.acceptedPayments.slice(0, 4).map((payment) => (
                      <span key={payment} className="text-xs bg-muted/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-muted-foreground font-medium">
                        {payment}
                      </span>
                    ))}
                    {store.acceptedPayments.length > 4 && (
                      <span className="text-xs text-muted-foreground">+{store.acceptedPayments.length - 4}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Opening Hours Toggle */}
              <button
                onClick={() => setShowHours(!showHours)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 text-primary font-semibold hover:from-primary/15 hover:to-accent/15 hover:border-primary/30 hover:shadow-soft transition-all duration-300 group"
              >
                <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-sm">Ver horários de funcionamento</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showHours ? "rotate-180" : ""}`} />
              </button>

              {showHours && store.openingHours.length > 0 && (
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-card via-card to-secondary/30 border border-border/50 shadow-soft animate-slide-up">
                 
                 {/*ndx
                 
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">



                    
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">Horários de Funcionamento</h3>
                  </div>
                    ndx*/}




                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {store.openingHours.map((schedule, idx) => {
                      const isToday = new Date().toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase().includes(schedule.day.toLowerCase().slice(0, 3));
                      return (
                        <div
                          key={schedule.day}
                          className={`relative p-3 rounded-xl transition-all duration-300 overflow-hidden ${
                            schedule.isOpen
                              ? isToday 
                                ? "bg-gradient-to-br from-accent/20 to-accent/10 border-2 border-accent/40 shadow-glow-accent"
                                : "bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20"
                              : "bg-muted/30 border border-border/50"
                          }`}
                        >
                          {isToday && schedule.isOpen && (
                            <div className="absolute top-1 right-1">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                              </span>
                            </div>
                          )}
                          <div className={`font-bold text-sm ${schedule.isOpen ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {schedule.day}
                            {isToday && <span className="ml-1 text-xs font-normal text-accent">(Hoje)</span>}
                          </div>
                          <div className={`mt-1 text-sm font-medium ${schedule.isOpen ? 'text-accent' : 'text-muted-foreground'}`}>
                            {schedule.isOpen ? (
                              schedule.hours.includes('/') ? (
                                <div className="flex flex-col gap-0.5">
                                  {schedule.hours.split('/').map((period, i) => (
                                    <span key={i} className="text-xs">{period.trim()}</span>
                                  ))}
                                </div>
                              ) : (schedule.hours || "Fechado")
                            ) : (
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></span>
                                Fechado
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Info Card - Desktop */}
            <div className="hidden md:block shrink-0">
              <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 rounded-2xl p-5 border border-primary/10 min-w-[180px]">



               



               {/*ndx
                {store.deliveryEnabled !== false && (
                  <div className="mb-4">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider"> ndxTaxa de entrega</div>
                    <div className="text-2xl font-bold text-foreground">
                      {store.deliveryFee === 0 ? (
                        <span className="text-accent flex items-center gap-1">
                          <Sparkles className="w-5 h-5" />
                           ndxGrátis
                        </span>
                      ) : (
                        `R$ ${store.deliveryFee.toFixed(2).replace(".", ",")}`
                      )}
                    </div>
                  </div>
                )} 
                  ndx*/}







                <div>
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Pedido mínimo</div>
                  <div className="text-lg font-bold text-foreground">
                    R$ {store.minOrder.toFixed(2).replace(".", ",")}
                  </div>
                </div>
              </div>
            </div>
          </div>








          {/* Mobile: Inline delivery info badges + stats */}
          <div className="md:hidden mt-3 space-y-2">
            {/* Inline stats row */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(store.rating || store.reviewCount) && (
                <div className="flex items-center gap-1 bg-warning/10 text-warning-foreground px-2 py-1 rounded-full">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span className="font-bold text-xs">{store.rating || "4.8"}</span>
                </div>
              )}
              <div className="flex items-center gap-1 bg-accent/10 text-accent px-2 py-1 rounded-full">
                <Zap className="w-3 h-3" />
                <span className="font-medium text-xs">{store.estimatedTime}</span>
              </div>


              {/*ndx delivery
              {store.deliveryEnabled !== false && (
                <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {store.deliveryFee === 0 ? (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span className="font-bold text-xs">Entrega Grátis</span> 
                    </>
                  ) : (
                    <span className="font-medium text-xs">Entrega R$ {store.deliveryFee.toFixed(2).replace(".", ",")}</span>
                  )}
                </div>
              )}

            ndx*/}


              <div className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-full text-muted-foreground">
                <span className="text-xs">Mín. R$ {store.minOrder.toFixed(2).replace(".", ",")}</span>
              </div>
            </div>













            {/* Opening hours + address compact */}
            <div className="flex items-center gap-2 flex-wrap">
              {store.address && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="text-xs truncate max-w-[180px]">{store.address.split("-")[0]}</span>
                  {store.googleMapsUrl && (
                    <a href={store.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowHours(!showHours)}
                className="flex items-center gap-1 text-primary text-xs font-medium"
              >
                <Clock className="w-3 h-3" />
                Horários
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showHours ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Mobile hours expansion */}
            {showHours && store.openingHours.length > 0 && (
              <div className="p-3 rounded-xl bg-card border border-border/50 animate-slide-up">
                <div className="grid grid-cols-2 gap-1.5">
                  {store.openingHours.map((schedule) => {
                    const isToday = new Date().toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase().includes(schedule.day.toLowerCase().slice(0, 3));
                    return (
                      <div key={schedule.day} className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs ${
                        isToday && schedule.isOpen ? "bg-accent/10 font-bold" : ""
                      }`}>
                        <span className={schedule.isOpen ? "text-foreground" : "text-muted-foreground"}>
                          {schedule.day}{isToday ? " •" : ""}
                        </span>
                        <span className={schedule.isOpen ? "text-accent font-medium" : "text-muted-foreground"}>
                          {schedule.isOpen ? (schedule.hours || "Fechado") : "Fechado"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment methods compact */}
            {store.acceptedPayments.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <CreditCard className="w-3 h-3 text-muted-foreground" />
                {store.acceptedPayments.slice(0, 3).map((p) => (
                  <span key={p} className="text-[10px] bg-muted/60 px-2 py-0.5 rounded-full text-muted-foreground font-medium">{p}</span>
                ))}
                {store.acceptedPayments.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{store.acceptedPayments.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Auth Modal */}
      {storeId && (
        <CustomerAuthModal
          open={showAuthModal}
          onOpenChange={setShowAuthModal}
          storeId={storeId}
        />
      )}
    </div>
  );
}
