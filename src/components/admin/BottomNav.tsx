import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, ClipboardList, Package, MoreHorizontal, Tag, Users, DollarSign, Truck, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface BottomNavProps {
  newOrderCount: number;
  onClearOrders: () => void;
}

const mainItems = [
  { title: "Início", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Pedidos", url: "/admin/orders", icon: ClipboardList, end: false },
  { title: "Produtos", url: "/admin/products", icon: Package, end: false },
];

const moreItems = [
  { title: "Categorias", url: "/admin/categories", icon: Tag },
  { title: "Clientes", url: "/admin/customers", icon: Users },
  { title: "Custos & Lucro", url: "/admin/ingredients", icon: DollarSign },
  { title: "Entregadores", url: "/admin/drivers", icon: Truck },
  { title: "Configurações", url: "/admin/settings", icon: Settings },
];

export function BottomNav({ newOrderCount, onClearOrders }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreItems.some((item) => location.pathname.startsWith(item.url));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 md:hidden" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}>
        <div className="flex items-center justify-evenly px-1 py-1">
          {mainItems.map((item) => {
            const isActive = item.end
              ? location.pathname === item.url
              : location.pathname.startsWith(item.url);
            const isOrders = item.url === "/admin/orders";
            const showBadge = isOrders && newOrderCount > 0;

            return (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.end}
                onClick={() => {
                  if (isOrders) onClearOrders();
                }}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] relative ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground"
                }`}
                activeClassName=""
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-primary nav-indicator-bar" />
                )}
                <div className="relative">
                  <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 animate-bounce-subtle">
                      {newOrderCount > 9 ? "9+" : newOrderCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-primary font-semibold" : ""}`}>
                  {item.title}
                </span>
              </NavLink>
            );
          })}

          {/* More button with Sheet */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] min-h-[48px] relative ${
              isMoreActive
                ? "text-primary bg-primary/10"
                : "text-muted-foreground"
            }`}
          >
            {isMoreActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-primary nav-indicator-bar" />
            )}
            <MoreHorizontal className={`w-5 h-5 ${isMoreActive ? "text-primary" : ""}`} />
            <span className={`text-[10px] font-medium ${isMoreActive ? "text-primary font-semibold" : ""}`}>
              Mais
            </span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)" }}>
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base font-semibold">Menu</SheetTitle>
          </SheetHeader>
          <div className="grid gap-1">
            {moreItems.map((item) => {
              const isActive = location.pathname.startsWith(item.url);
              return (
                <button
                  key={item.url}
                  onClick={() => {
                    navigate(item.url);
                    setMoreOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors h-12 ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.title}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
