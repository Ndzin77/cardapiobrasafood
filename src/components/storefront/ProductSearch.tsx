import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Product } from "@/types/store";

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  products?: Product[];
  onProductClick?: (productId: string, categoryId: string) => void;
}

export function ProductSearch({ 
  value, 
  onChange, 
  placeholder = "O que você procura?",
  products = [],
  onProductClick,
}: ProductSearchProps) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Live search results
  const searchResults = useMemo(() => {
    if (!value.trim() || products.length === 0) return [];
    const q = value.toLowerCase().trim();
    return products
      .filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
      .slice(0, 6);
  }, [value, products]);

  const showResults = isFocused && value.trim().length > 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className={`relative transition-all duration-300 ${isFocused ? "scale-[1.01]" : ""}`}>
      {/* Glow effect when focused */}
      {isFocused && (
        <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl -z-10 animate-pulse" />
      )}
      
      <div className="relative">
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${isFocused ? "text-primary" : "text-muted-foreground"}`}>
          {isFocused ? (
            <Sparkles className="w-5 h-5" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className={`pl-12 pr-12 h-14 rounded-2xl text-base font-medium transition-all duration-300 shadow-soft ${
            isFocused 
              ? "bg-card border-primary/30 shadow-glow ring-2 ring-primary/10" 
              : "bg-secondary/70 border-transparent hover:bg-secondary"
          }`}
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Live search dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/50 rounded-2xl shadow-elevation z-50 overflow-hidden animate-slide-up">
          {searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((product, idx) => (
                <button
                  key={product.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onProductClick?.(product.id, product.category);
                    setIsFocused(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-12 h-12 rounded-xl object-cover shadow-soft shrink-0"
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{product.description}</p>
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">
                    R$ {product.price.toFixed(2).replace(".", ",")}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center animate-fade-in">
              <span className="text-2xl mb-2 block">🔍</span>
              <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
