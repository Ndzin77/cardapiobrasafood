import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import PublicStorefront from "./pages/PublicStorefront";
import ExploreStores from "./pages/ExploreStores";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import Categories from "./pages/admin/Categories";
import Settings from "./pages/admin/Settings";
import Orders from "./pages/admin/Orders";
import Customers from "./pages/admin/Customers";
import Ingredients from "./pages/admin/Ingredients";
import AdminDrivers from "./pages/admin/Drivers";
import DriverArea from "./pages/DriverArea";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <AdminLayout>{children}</AdminLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      
      {/* Public */}
      <Route path="/explorar" element={<ExploreStores />} />
      <Route path="/loja/:slug" element={<PublicStorefront />} />
      <Route path="/entregador/:slug" element={<DriverArea />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/admin/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/admin/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/admin/ingredients" element={<ProtectedRoute><Ingredients /></ProtectedRoute>} />
      <Route path="/admin/drivers" element={<ProtectedRoute><AdminDrivers /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
