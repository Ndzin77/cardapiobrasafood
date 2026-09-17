import { useState } from "react";
import { Star, Clock, MapPin, ShoppingBag, Plus, Minus, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Dados fictícios da loja demo
const demoStore = {
  name: "Doce Sabor Confeitaria",
  description: "Doces artesanais feitos com amor e ingredientes selecionados",
  logo: "🧁",
  rating: 4.9,
  reviewCount: 847,
  deliveryTime: "30-45 min",
  isOpen: true,
};

const demoCategories = [
  { id: "featured", name: "Destaques", icon: "⭐" },
  { id: "bolos", name: "Bolos", icon: "🎂" },
  { id: "doces", name: "Doces", icon: "🍬" },
  { id: "tortas", name: "Tortas", icon: "🥧" },
  { id: "bebidas", name: "Bebidas", icon: "🧋" },
];

const demoProducts = [
  {
    id: "1",
    name: "Bolo de Chocolate Belga",
    description: "Camadas de chocolate 70% cacau com ganache cremoso",
    price: 89.90,
    originalPrice: 119.90,
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop",
    category: "bolos",
    featured: true,
    badge: "Mais Vendido",
  },
  {
    id: "2",
    name: "Red Velvet Premium",
    description: "Massa aveludada com cream cheese artesanal",
    price: 95.00,
    image: "https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=400&h=300&fit=crop",
    category: "bolos",
    featured: true,
  },
  {
    id: "3",
    name: "Brigadeiros Gourmet (12un)",
    description: "Mix de sabores: tradicional, pistache, maracujá e café",
    price: 36.00,
    image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop",
    category: "doces",
    featured: true,
    badge: "Novidade",
  },
  {
    id: "4",
    name: "Cheesecake de Frutas Vermelhas",
    description: "Base crocante com cobertura de frutas frescas",
    price: 78.00,
    originalPrice: 95.00,
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop",
    category: "tortas",
    featured: true,
  },
  {
    id: "5",
    name: "Milkshake Artesanal",
    description: "Ovomaltine, Oreo ou Nutella - escolha seu favorito",
    price: 22.00,
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop",
    category: "bebidas",
    featured: true,
  },
  {
    id: "6",
    name: "Torta de Limão Siciliano",
    description: "Massa amanteigada com creme de limão e merengue maçaricado",
    price: 68.00,
    image: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=400&h=300&fit=crop",
    category: "tortas",
    featured: true,
  },
];

export function DemoStorefront() {
  const [activeCategory, setActiveCategory] = useState("featured");
  const [cart, setCart] = useState<Record<string, number>>({});

  const filteredProducts = activeCategory === "featured"
    ? demoProducts.filter(p => p.featured)
    : demoProducts.filter(p => p.category === activeCategory);

  const cartTotal = Object.entries(cart).reduce((acc, [id, qty]) => {
    const product = demoProducts.find(p => p.id === id);
    return acc + (product?.price || 0) * qty;
  }, 0);

  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const addToCart = (productId: string) => {
    setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[productId] > 1) {
        newCart[productId]--;
      } else {
        delete newCart[productId];
      }
      return newCart;
    });
  };

  return (
    <div className="bg-card rounded-3xl shadow-2xl overflow-hidden border border-border/50 max-w-md mx-auto">
      {/* Store Header */}
      <div className="relative h-32 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5">
        <div className="absolute -bottom-8 left-4">
          <div className="w-20 h-20 rounded-2xl bg-card shadow-lg flex items-center justify-center text-4xl border-4 border-background">
            {demoStore.logo}
          </div>
        </div>
      </div>
      
      {/* Store Info */}
      <div className="pt-12 px-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">{demoStore.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">{demoStore.description}</p>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0 shrink-0">
            {demoStore.isOpen ? "Aberto" : "Fechado"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-foreground">{demoStore.rating}</span>
            <span className="text-muted-foreground">({demoStore.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{demoStore.deliveryTime}</span>
          </div>
        </div>
      </div>
      
      {/* Categories */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {demoCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Products Grid */}
      <div className="px-4 pb-4 space-y-3 max-h-80 overflow-y-auto">
        {filteredProducts.map(product => (
          <div
            key={product.id}
            className="flex gap-3 bg-muted/30 rounded-xl p-2 hover:bg-muted/50 transition-colors"
          >
            <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.badge && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded">
                  {product.badge}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm line-clamp-1">{product.name}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-primary text-sm">
                    R$ {product.price.toFixed(2).replace(".", ",")}
                  </span>
                  {product.originalPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      R$ {product.originalPrice.toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </div>
                
                {cart[product.id] ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold w-5 text-center">{cart[product.id]}</span>
                    <button
                      onClick={() => addToCart(product.id)}
                      className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(product.id)}
                    className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Cart Footer */}
      {cartItemCount > 0 && (
        <div className="sticky bottom-0 p-4 bg-card border-t border-border">
          <Button className="w-full gap-2 h-12 text-base font-semibold" size="lg">
            <ShoppingBag className="w-5 h-5" />
            Ver Carrinho ({cartItemCount})
            <span className="ml-auto">R$ {cartTotal.toFixed(2).replace(".", ",")}</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {/* Decorative Elements */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}