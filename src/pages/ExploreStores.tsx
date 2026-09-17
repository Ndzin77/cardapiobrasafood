import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Search, MapPin, Clock, Star, Store, ArrowLeft, Filter, X, ChevronRight,
  TrendingUp, SlidersHorizontal, ArrowUpDown, Sparkles, Navigation,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────
interface PublicStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  address: string | null;
  is_open: boolean | null;
  rating: number | null;
  review_count: number | null;
  estimated_time: string | null;
  delivery_fee: number | null;
  min_order: number | null;
}

type SortOption = "relevance" | "rating" | "delivery_fee" | "name";

const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Relevância",
  rating: "Melhor avaliação",
  delivery_fee: "Menor entrega",
  name: "A–Z",
};

// ─── Address parsing ─────────────────────────────────────
function parseCity(address: string | null): string {
  if (!address) return "";
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length >= 3) return parts[parts.length - 1].split("-")[0].trim();
  return parts[parts.length - 1];
}

function parseNeighborhood(address: string | null): string {
  if (!address) return "";
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length >= 3) return parts[parts.length - 2];
  return "";
}

// ─── Skeleton ────────────────────────────────────────────
function StoreCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Store Card ──────────────────────────────────────────
function StoreCard({ store, index, featured = false }: { store: PublicStore; index: number; featured?: boolean }) {
  const isOpen = store.is_open !== false;
  const neighborhood = parseNeighborhood(store.address);
  const city = parseCity(store.address);
  const freeDelivery = store.delivery_fee != null && Number(store.delivery_fee) === 0;

  return (
    <Link
      to={`/loja/${store.slug}`}
      className={`group block rounded-2xl border bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        featured
          ? "border-primary/30 shadow-md ring-1 ring-primary/10"
          : "border-border hover:border-primary/20"
      }`}
      style={{
        animation: `fadeSlideUp 0.45s cubic-bezier(.16,1,.3,1) ${index * 50}ms both`,
      }}
    >
      {/* Cover */}
      <div className={`relative overflow-hidden ${featured ? "h-44" : "h-36"} bg-muted`}>
        {store.cover_image_url ? (
          <img
            src={store.cover_image_url}
            alt={store.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/8 to-accent/8">
            <Store className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <Badge
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border-0 shadow-md backdrop-blur-sm ${
              isOpen
                ? "bg-accent/90 text-accent-foreground"
                : "bg-background/80 text-muted-foreground"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${
                isOpen ? "bg-accent-foreground animate-pulse" : "bg-muted-foreground"
              }`}
            />
            {isOpen ? "Aberto" : "Fechado"}
          </Badge>
        </div>

        {/* Free delivery tag */}
        {freeDelivery && (
          <div className="absolute top-3 left-3">
            <Badge className="text-[10px] font-bold px-2 py-1 border-0 bg-accent/90 text-accent-foreground shadow-md backdrop-blur-sm">
              Entrega grátis
            </Badge>
          </div>
        )}

        {/* Logo overlapping bottom */}
        <div className="absolute -bottom-5 left-4 w-14 h-14 rounded-xl bg-card border-2 border-card overflow-hidden shadow-lg z-10">
          {store.logo_url ? (
            <img src={store.logo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <Store className="w-6 h-6 text-primary" />
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="pt-7 pb-4 px-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-foreground text-[15px] truncate group-hover:text-primary transition-colors leading-tight">
            {store.name}
          </h3>
          {store.rating != null && Number(store.rating) > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-bold text-warning shrink-0">
              <Star className="w-3.5 h-3.5 fill-warning text-warning" />
              {Number(store.rating).toFixed(1)}
            </span>
          )}
        </div>

        {(neighborhood || city) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {neighborhood}{neighborhood && city ? " · " : ""}{city}
          </p>
        )}

        {store.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
            {store.description}
          </p>
        )}

        {/* Meta chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {store.estimated_time && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1 font-medium">
              <Clock className="w-3 h-3" />
              {store.estimated_time}
            </span>
          )}
          {store.delivery_fee != null && !freeDelivery && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1 font-medium">
              R$ {Number(store.delivery_fee).toFixed(2).replace(".", ",")}
            </span>
          )}
          {store.min_order != null && Number(store.min_order) > 0 && (
            <span className="inline-flex items-center text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1 font-medium">
              Mín. R$ {Number(store.min_order).toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Main Page ───────────────────────────────────────────
export default function ExploreStores() {
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyFreeDelivery, setOnlyFreeDelivery] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    async function fetchStores() {
      const { data } = await supabase
        .from("public_stores" as any)
        .select("id, name, slug, description, logo_url, cover_image_url, address, is_open, rating, review_count, estimated_time, delivery_fee, min_order")
        .order("rating", { ascending: false });
      setStores((data as unknown as PublicStore[]) || []);
      setLoading(false);
    }
    fetchStores();
  }, []);

  // Extract unique cities with counts
  const { cities, neighborhoods, cityCounts } = useMemo(() => {
    const cityMap = new Map<string, number>();
    const nbSet = new Set<string>();
    stores.forEach((s) => {
      const c = parseCity(s.address);
      const n = parseNeighborhood(s.address);
      if (c) cityMap.set(c, (cityMap.get(c) || 0) + 1);
      if (n) nbSet.add(n);
    });
    // Sort cities by count descending
    const sortedCities = Array.from(cityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([city]) => city);
    return {
      cities: sortedCities,
      neighborhoods: Array.from(nbSet).sort(),
      cityCounts: Object.fromEntries(cityMap) as Record<string, number>,
    };
  }, [stores]);

  // Auto-select most popular city on first load
  const [autoSelected, setAutoSelected] = useState(false);
  useEffect(() => {
    if (!loading && stores.length > 0 && cities.length > 0 && !autoSelected) {
      setLocationFilter(cities[0]); // cities already sorted by count desc
      setAutoSelected(true);
    }
  }, [loading, stores, cities, autoSelected]);

  // Neighborhoods for selected city
  const filteredNeighborhoods = useMemo(() => {
    if (!locationFilter) return neighborhoods;
    return Array.from(
      new Set(
        stores
          .filter((s) => parseCity(s.address).toLowerCase() === locationFilter.toLowerCase())
          .map((s) => parseNeighborhood(s.address))
          .filter(Boolean)
      )
    ).sort();
  }, [stores, locationFilter, neighborhoods]);

  // Featured stores (top rated + open)
  const featuredStores = useMemo(() => {
    return stores
      .filter((s) => s.is_open !== false && s.cover_image_url && Number(s.rating || 0) >= 4.5)
      .slice(0, 4);
  }, [stores]);

  // Sort function
  const sortStores = useCallback(
    (list: PublicStore[]) => {
      const copy = [...list];
      switch (sortBy) {
        case "rating":
          return copy.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
        case "delivery_fee":
          return copy.sort((a, b) => (Number(a.delivery_fee) || 0) - (Number(b.delivery_fee) || 0));
        case "name":
          return copy.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        default: {
          // Relevance: open first, then rating
          return copy.sort((a, b) => {
            const aOpen = a.is_open !== false ? 1 : 0;
            const bOpen = b.is_open !== false ? 1 : 0;
            if (aOpen !== bOpen) return bOpen - aOpen;
            return (Number(b.rating) || 0) - (Number(a.rating) || 0);
          });
        }
      }
    },
    [sortBy]
  );

  const filtered = useMemo(() => {
    let result = stores;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q) ||
          (s.address || "").toLowerCase().includes(q)
      );
    }
    if (locationFilter) {
      result = result.filter(
        (s) => parseCity(s.address).toLowerCase() === locationFilter.toLowerCase()
      );
    }
    if (neighborhoodFilter) {
      result = result.filter(
        (s) => parseNeighborhood(s.address).toLowerCase() === neighborhoodFilter.toLowerCase()
      );
    }
    if (onlyOpen) {
      result = result.filter((s) => s.is_open !== false);
    }
    if (onlyFreeDelivery) {
      result = result.filter((s) => Number(s.delivery_fee || 0) === 0);
    }
    return sortStores(result);
  }, [stores, debouncedSearch, locationFilter, neighborhoodFilter, onlyOpen, onlyFreeDelivery, sortStores]);

  const hasActiveFilters = locationFilter || neighborhoodFilter || onlyOpen || onlyFreeDelivery;
  const activeFilterCount = [locationFilter, neighborhoodFilter, onlyOpen, onlyFreeDelivery].filter(Boolean).length;
  const showFeatured = !debouncedSearch && !hasActiveFilters && featuredStores.length > 0;

  const clearAllFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setLocationFilter("");
    setNeighborhoodFilter("");
    setOnlyOpen(false);
    setOnlyFreeDelivery(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container flex items-center gap-2 py-3 px-4">
          <Link to="/" className="shrink-0">
            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar loja, bairro ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-10 rounded-xl bg-muted/50 border-transparent focus-visible:border-primary/30 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            size="icon"
            className="rounded-xl shrink-0 relative h-10 w-10"
            onClick={() => { setShowFilters(!showFilters); setShowSort(false); }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Sort toggle */}
          <Button
            variant={sortBy !== "relevance" ? "default" : "outline"}
            size="icon"
            className="rounded-xl shrink-0 relative h-10 w-10"
            onClick={() => { setShowSort(!showSort); setShowFilters(false); }}
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>

        {/* ── Sort panel ── */}
        {showSort && (
          <div className="border-t border-border bg-card px-4 py-3 animate-in slide-in-from-top-1 duration-150">
            <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wider">Ordenar por</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setSortBy(opt); setShowSort(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    sortBy === opt
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/30 hover:bg-muted/80"
                  }`}
                >
                  {SORT_LABELS[opt]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Filter panel ── */}
        {showFilters && (
          <div className="border-t border-border bg-card px-4 py-4 space-y-4 animate-in slide-in-from-top-1 duration-150">
            {/* Quick toggles */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setOnlyOpen(!onlyOpen)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  onlyOpen
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-muted text-muted-foreground border-border hover:border-accent/40"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${onlyOpen ? "bg-accent-foreground animate-pulse" : "bg-muted-foreground"}`} />
                Abertas agora
              </button>
              <button
                onClick={() => setOnlyFreeDelivery(!onlyFreeDelivery)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  onlyFreeDelivery
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-muted text-muted-foreground border-border hover:border-accent/40"
                }`}
              >
                🚚 Entrega grátis
              </button>
            </div>

            {/* City filter */}
            {cities.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wider flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> Cidade
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cities.map((city) => (
                    <button
                      key={city}
                      onClick={() => {
                        setLocationFilter(locationFilter === city ? "" : city);
                        setNeighborhoodFilter("");
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        locationFilter === city
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Neighborhood filter (shows when city selected) */}
            {filteredNeighborhoods.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Bairro
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {filteredNeighborhoods.map((nb) => (
                    <button
                      key={nb}
                      onClick={() => setNeighborhoodFilter(neighborhoodFilter === nb ? "" : nb)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        neighborhoodFilter === nb
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                      }`}
                    >
                      {nb}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-destructive font-semibold flex items-center gap-1 hover:underline transition-colors"
              >
                <X className="w-3 h-3" /> Limpar todos os filtros
              </button>
            )}
          </div>
        )}
      </header>

      {/* ── City chips bar ── */}
      {!loading && cities.length > 1 && (
        <div className="container px-4 pt-4 pb-0">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => { setLocationFilter(""); setNeighborhoodFilter(""); }}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                !locationFilter
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted text-muted-foreground border-border hover:border-primary/30"
              }`}
            >
              Todas ({stores.length})
            </button>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => { setLocationFilter(locationFilter === city ? "" : city); setNeighborhoodFilter(""); }}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                  locationFilter === city
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                {city} ({cityCounts[city] || 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <main className="container px-4 py-6 pb-12">
        {/* Page title + count */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              Explorar Lojas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading
                ? "Buscando lojas perto de você..."
                : debouncedSearch
                  ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""} para "${debouncedSearch}"`
                  : `${filtered.length} loja${filtered.length !== 1 ? "s" : ""} disponíve${filtered.length !== 1 ? "is" : "l"}`}
            </p>
          </div>

          {/* Active filters pills (desktop) */}
          {hasActiveFilters && (
            <div className="hidden md:flex items-center gap-1.5">
              {locationFilter && (
                <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setLocationFilter("")}>
                  {locationFilter} <X className="w-3 h-3" />
                </Badge>
              )}
              {neighborhoodFilter && (
                <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setNeighborhoodFilter("")}>
                  {neighborhoodFilter} <X className="w-3 h-3" />
                </Badge>
              )}
              {onlyOpen && (
                <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setOnlyOpen(false)}>
                  Abertas <X className="w-3 h-3" />
                </Badge>
              )}
              {onlyFreeDelivery && (
                <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setOnlyFreeDelivery(false)}>
                  Entrega grátis <X className="w-3 h-3" />
                </Badge>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <StoreCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* ── Featured section ── */}
            {showFeatured && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="font-bold text-foreground text-lg" style={{ fontFamily: "var(--font-display)" }}>
                    Destaques
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {featuredStores.map((store, i) => (
                    <StoreCard key={store.id} store={store} index={i} featured />
                  ))}
                </div>
              </section>
            )}

            {/* ── All stores ── */}
            <section>
              {showFeatured && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                    <Store className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h2 className="font-bold text-foreground text-lg" style={{ fontFamily: "var(--font-display)" }}>
                    Todas as lojas
                  </h2>
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-1">Nenhuma loja encontrada</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                    {debouncedSearch
                      ? `Não encontramos lojas para "${debouncedSearch}". Tente outro termo.`
                      : "Tente remover os filtros para ver mais lojas."}
                  </p>
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Limpar filtros
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map((store, i) => (
                    <StoreCard key={store.id} store={store} index={i} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container px-4 text-center">
          <p className="text-xs text-muted-foreground">
            Quer sua loja aqui?{" "}
            <Link to="/" className="text-primary font-semibold hover:underline">
              Crie grátis em minutos →
            </Link>
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
