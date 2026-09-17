import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon issue with bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export interface LocationResult {
  lat: number;
  lng: number;
  googleMapsUrl: string;
  displayAddress: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
}

interface LocationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (url: string, address?: string, structured?: LocationResult) => void;
  initialLat?: number;
  initialLng?: number;
}

const DEFAULT_CENTER: [number, number] = [-14.235, -51.925];
const DEFAULT_ZOOM = 4;
const GPS_ZOOM = 17;

export function LocationPickerModal({ open, onOpenChange, onConfirm, initialLat, initialLng }: LocationPickerModalProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [address, setAddress] = useState<string>("");
  const [structured, setStructured] = useState<Partial<LocationResult>>({});
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Reverse geocode with Nominatim + ViaCEP enrichment — returns structured data
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pt-BR`,
        { headers: { "User-Agent": "StorefrontApp/1.0" } }
      );
      const data = await res.json();
      if (data?.display_name) {
        setAddress(data.display_name);
      }
      const addr = data?.address || {};
      const postcode = addr.postcode?.replace(/\D/g, "") || "";
      const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || addr.hamlet || addr.residential || "";

      const base: Partial<LocationResult> = {
        lat,
        lng,
        googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
        displayAddress: data?.display_name || "",
        street: addr.road || addr.pedestrian || addr.street || "",
        neighborhood,
        city: addr.city || addr.town || addr.village || addr.municipality || "",
        state: addr.state_code || (addr.state ? addr.state.slice(0, 2).toUpperCase() : ""),
        cep: postcode ? postcode.replace(/(\d{5})(\d{3})/, "$1-$2") : "",
      };

      // Enrich with ViaCEP for better Brazilian address data (especially bairro)
      if (postcode.length === 8) {
        try {
          const viaRes = await fetch(`https://viacep.com.br/ws/${postcode}/json/`);
          const viaData = await viaRes.json();
          if (!viaData.erro) {
            if (viaData.bairro) base.neighborhood = viaData.bairro;
            if (viaData.logradouro && !base.street) base.street = viaData.logradouro;
            if (viaData.localidade) base.city = viaData.localidade;
            if (viaData.uf) base.state = viaData.uf;
          }
        } catch { /* silent */ }
      }

      setStructured(base);
    } catch {
      // Silent fail
    }
  }, []);

  const updatePosition = useCallback((lat: number, lng: number) => {
    setPosition([lat, lng]);
    setConfirmed(false);
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  // Request GPS with longer timeout for mobile
  const requestGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("GPS não disponível neste dispositivo");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        updatePosition(lat, lng);
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], GPS_ZOOM, { animate: true });
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsError("Permissão de localização negada. Mova o mapa manualmente.");
        } else {
          setGpsError("Não foi possível obter sua localização. Mova o mapa manualmente.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, [updatePosition]);

  // Initialize map — always clean up first to prevent stale refs
  useEffect(() => {
    if (!open) return;

    // Wait for DOM container
    const initTimer = setTimeout(() => {
      const container = mapContainerRef.current;
      if (!container) return;

      // CRITICAL: Always destroy old map before creating new one
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
        markerRef.current = null;
      }
      // Clear any leftover Leaflet DOM
      container.innerHTML = "";

      const map = L.map(container, {
        center: position || DEFAULT_CENTER,
        zoom: position ? GPS_ZOOM : DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const center = position || DEFAULT_CENTER;
      const marker = L.marker(center, { draggable: true }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        updatePosition(pos.lat, pos.lng);
        const el = marker.getElement();
        if (el) {
          el.style.transition = "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)";
          el.style.transform += " translateY(-8px)";
          setTimeout(() => {
            el.style.transform = el.style.transform.replace(" translateY(-8px)", "");
          }, 150);
        }
      });

      map.on("click", (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        updatePosition(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      setMapReady(true);

      if (!position) {
        requestGPS();
      } else {
        reverseGeocode(position[0], position[1]);
      }

      // invalidateSize with multiple fallback timings for Dialog animation
      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 200);
      setTimeout(() => map.invalidateSize(), 500);
    }, 150);

    return () => clearTimeout(initTimer);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup map on close
  useEffect(() => {
    if (!open && mapRef.current) {
      try { mapRef.current.remove(); } catch {}
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
      setConfirmed(false);
      setAddress("");
      setGpsError("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (!position) return;
    const url = `https://www.google.com/maps?q=${position[0]},${position[1]}`;
    setConfirmed(true);

    const result: LocationResult = {
      lat: position[0],
      lng: position[1],
      googleMapsUrl: url,
      displayAddress: address,
      street: structured.street,
      neighborhood: structured.neighborhood,
      city: structured.city,
      state: structured.state,
      cep: structured.cep,
    };

    setTimeout(() => {
      onConfirm(url, address, result);
      onOpenChange(false);
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-lg">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              Marque sua localização
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mt-1.5">
            Toque no mapa ou arraste o pin para o local exato de entrega
          </p>
        </div>

        {/* Map Container */}
        <div className="relative mx-4 rounded-xl overflow-hidden shadow-md border border-border/50" style={{ height: "55vh", minHeight: 280 }}>
          <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
          
          {/* Loading overlay */}
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando mapa...</span>
              </div>
            </div>
          )}

          {/* Confirmed overlay */}
          {confirmed && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 backdrop-blur-[2px] z-10 animate-in fade-in duration-300">
              <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 duration-300">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary">📍 Localização salva!</span>
              </div>
            </div>
          )}
        </div>

        {/* Address feedback */}
        {address && !confirmed && (
          <div className="mx-4 px-3 py-2 bg-secondary/60 rounded-lg border border-border/40 animate-in slide-in-from-bottom-2 duration-300">
            <p className="text-xs text-muted-foreground leading-relaxed truncate">
              📍 {address}
            </p>
          </div>
        )}

        {/* GPS error */}
        {gpsError && (
          <div className="mx-4 px-3 py-2 bg-destructive/5 rounded-lg border border-destructive/20 animate-in slide-in-from-bottom-2 duration-200">
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {gpsError}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 pb-5 pt-2 flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-2 px-3 text-sm font-medium min-w-0 max-w-full whitespace-normal break-words leading-tight text-foreground"
            onClick={requestGPS}
            disabled={gpsLoading}
          >
            {gpsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Navigation className="w-4 h-4 shrink-0" />
            )}
            <span className="min-w-0 flex-1 text-center whitespace-normal break-words">{gpsLoading ? "Obtendo localização..." : "Usar minha localização"}</span>
          </Button>

          <Button
            type="button"
            className="w-full h-12 gap-2 px-3 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-colors duration-300 min-w-0 max-w-full whitespace-normal break-words leading-tight"
            onClick={handleConfirm}
            disabled={!position || confirmed}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="min-w-0 flex-1 text-center whitespace-normal break-words">{confirmed ? "Localização salva!" : "Confirmar localização"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
