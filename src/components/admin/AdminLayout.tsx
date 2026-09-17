import { ReactNode, useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { FooterDeveloperBadge, FloatingDeveloperBadge } from "@/components/DeveloperWatermark";
import { useMyStore } from "@/hooks/useStore";
import { applyThemeToDocument } from "@/lib/storeTheme";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { NotificationSettingsModal } from "@/components/admin/NotificationSettingsModal";
import { BottomNav } from "@/components/admin/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Tag,
  Settings,
  Eye,
  LogOut,
  Store,
  Menu,
  ClipboardList,
  Users,
  BellRing,
  Wheat,
  Truck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, badge: null as string | null },
  { title: "Pedidos", url: "/admin/orders", icon: ClipboardList, badge: null as string | null },
  { title: "Produtos", url: "/admin/products", icon: Package, badge: null as string | null },
  { title: "Categorias", url: "/admin/categories", icon: Tag, badge: null as string | null },
  { title: "Clientes", url: "/admin/customers", icon: Users, badge: null as string | null },
  { title: "Custos & Lucro", url: "/admin/ingredients", icon: Wheat, badge: null as string | null },
  { title: "Entregadores", url: "/admin/drivers", icon: Truck, badge: null as string | null },
  { title: "Configurações", url: "/admin/settings", icon: Settings, badge: null as string | null },
];

interface AdminSidebarProps {
  newOrderCount: number;
  onClearOrders: () => void;
}

function AdminSidebar({ newOrderCount, onClearOrders }: AdminSidebarProps) {
  const { signOut } = useAuth();
  const { data: store, isLoading } = useMyStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handlePreview = () => {
    if (store?.slug) {
      window.open(`/loja/${store.slug}`, "_blank");
    }
  };

  const handleNavClick = (url: string) => {
    if (url === "/admin/orders") onClearOrders();
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r hidden md:flex">
      <SidebarContent>
        <SidebarGroup>
          <div className="p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <h2 className="font-semibold text-foreground truncate text-sm sm:text-base">
                    {store?.name || "Minha Loja"}
                  </h2>
                )}
              </div>
            )}
          </div>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isOrders = item.url === "/admin/orders";
                const showBadge = isOrders && newOrderCount > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/admin"}
                        className="flex items-center gap-3 hover:bg-muted/50 rounded-lg px-3 py-2.5 text-sm relative"
                        activeClassName="bg-primary/10 text-primary font-medium"
                        onClick={() => handleNavClick(item.url)}
                      >
                        <div className="relative">
                          <item.icon className="h-4 w-4 shrink-0" />
                          {showBadge && collapsed && (
                            <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 animate-pulse">
                              {newOrderCount > 9 ? "9+" : newOrderCount}
                            </span>
                          )}
                        </div>
                        {!collapsed && (
                          <>
                            <span>{item.title}</span>
                            {showBadge && (
                              <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                                {newOrderCount > 9 ? "9+" : newOrderCount}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handlePreview}
                  className="flex items-center gap-3 hover:bg-muted/50 rounded-lg px-3 py-2.5 cursor-pointer text-sm"
                >
                  <Eye className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Ver Vitrine</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleSignOut}
                  className="flex items-center gap-3 hover:bg-destructive/10 text-destructive rounded-lg px-3 py-2.5 cursor-pointer text-sm"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAuth();
  const { data: store } = useMyStore();
  const isMobile = useIsMobile();

  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem("notif_sound");
    return stored !== null ? stored === "true" : true;
  });
  const [realtimeEnabled, setRealtimeEnabled] = useState(() => {
    const stored = localStorage.getItem("notif_realtime");
    return stored !== null ? stored === "true" : true;
  });
  const [notifModalOpen, setNotifModalOpen] = useState(false);

  const handleSoundToggle = useCallback((v: boolean) => {
    setSoundEnabled(v);
    localStorage.setItem("notif_sound", String(v));
  }, []);

  const handleRealtimeToggle = useCallback((v: boolean) => {
    setRealtimeEnabled(v);
    localStorage.setItem("notif_realtime", String(v));
  }, []);

  const { newOrderCount, clearNewOrderCount } = useOrderNotifications({
    storeId: store?.id,
    enabled: realtimeEnabled,
    soundEnabled,
  });

  usePushNotifications({ storeId: store?.id, userId: user?.id });

  const pushSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(
    pushSupported ? (Notification?.permission || "default") : "unsupported"
  );

  const handleEnablePush = useCallback(async () => {
    if (!pushSupported) return;
    const perm = await Notification.requestPermission();
    setPushPermission(perm);
  }, [pushSupported]);

  useEffect(() => {
    if (!store) return;
    return applyThemeToDocument({ themeColorField: store.theme_color });
  }, [store]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar newOrderCount={newOrderCount} onClearOrders={clearNewOrderCount} />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-12 sm:h-14 border-b flex items-center px-3 sm:px-4 gap-3 bg-card sticky top-0 z-10">
            {/* Sidebar trigger — desktop only */}
            <div className="hidden md:block">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
            </div>
            <span className="text-sm font-semibold text-foreground truncate">
              {(() => {
                const h = new Date().getHours();
                const greeting = h < 12 ? "Bom dia ☀️" : h < 18 ? "Boa tarde 🌤️" : "Boa noite 🌙";
                return greeting;
              })()}
            </span>
            <div className="ml-auto flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9"
                onClick={() => setNotifModalOpen(true)}
                title="Configurações de Notificação"
              >
                <BellRing className="h-4 w-4" />
                {pushPermission !== "granted" && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
                )}
              </Button>
            </div>
          </header>
          <div className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto pb-24 md:pb-0">
            {children}
          </div>
          <FooterDeveloperBadge />
        </main>
        <FloatingDeveloperBadge />

        {/* Bottom Navigation — CSS md:hidden handles visibility */}
        <BottomNav newOrderCount={newOrderCount} onClearOrders={clearNewOrderCount} />
      </div>

      <NotificationSettingsModal
        open={notifModalOpen}
        onOpenChange={setNotifModalOpen}
        pushSupported={pushSupported}
        pushPermission={pushPermission}
        onEnablePush={handleEnablePush}
        soundEnabled={soundEnabled}
        onSoundToggle={handleSoundToggle}
        realtimeEnabled={realtimeEnabled}
        onRealtimeToggle={handleRealtimeToggle}
      />
    </SidebarProvider>
  );
}
