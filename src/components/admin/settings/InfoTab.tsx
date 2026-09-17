import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Store } from "lucide-react";
import { THEME_PRESETS, type StoreThemePresetId } from "@/lib/storeTheme";
import type { SettingsFormData } from "./types";

interface InfoTabProps {
  formData: SettingsFormData;
  setFormData: React.Dispatch<React.SetStateAction<SettingsFormData>>;
  themePreset: StoreThemePresetId;
  setThemePreset: (preset: StoreThemePresetId) => void;
  themeAccent: string;
  setThemeAccent: (v: string) => void;
  themeFontHeading: string;
  setThemeFontHeading: (v: string) => void;
  themeFontBody: string;
  setThemeFontBody: (v: string) => void;
  useCustomHeadingFont: boolean;
  setUseCustomHeadingFont: (v: boolean) => void;
  useCustomBodyFont: boolean;
  setUseCustomBodyFont: (v: boolean) => void;
}

export function InfoTab({
  formData, setFormData,
  themePreset, setThemePreset,
  themeAccent, setThemeAccent,
  themeFontHeading, setThemeFontHeading,
  themeFontBody, setThemeFontBody,
  useCustomHeadingFont, setUseCustomHeadingFont,
  useCustomBodyFont, setUseCustomBodyFont,
}: InfoTabProps) {
  const themeOptions = [
    { id: "pizzaria", label: "🍕 Pizzaria", color: "#d9480f" },
    { id: "padaria", label: "🥖 Padaria", color: "#b08968" },
    { id: "doceria", label: "🧁 Doceria", color: "#c2255c" },
    { id: "churrascaria", label: "🥩 Churrascaria", color: "#111827" },
    { id: "hamburgueria", label: "🍔 Hamburgueria", color: "#f59f00" },
    { id: "pastelaria", label: "🥟 Pastelaria", color: "#2b8a3e" },
    { id: "acai", label: "🍇 Açaí", color: "#7b2d8e" },
    { id: "sushi", label: "🍣 Sushi", color: "#c92a2a" },
    { id: "cafeteria", label: "☕ Cafeteria", color: "#6f4e37" },
    { id: "sorveteria", label: "🍦 Sorveteria", color: "#e64980" },
    { id: "petiscaria", label: "🍺 Petiscaria", color: "#e8590c" },
    { id: "marmitaria", label: "🍱 Marmitaria", color: "#2b8a3e" },
  ] as const;

  return (
    <Card className="card-interactive overflow-hidden">
      <CardHeader className="p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Store className="w-4 h-4 text-primary" />
          </div>
          Informações da Loja
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm pl-10">
          Dados básicos e imagens que aparecem na vitrine
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
        {/* Name and slug */}
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm">Nome da Loja *</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Minha Loja" className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-sm">Link Personalizado</Label>
            <div className="flex">
              <span className="inline-flex items-center px-2 sm:px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs sm:text-sm">/loja/</span>
              <Input id="slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="rounded-l-none h-10" placeholder="minha-loja" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm">Descrição</Label>
          <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descreva seu negócio..." rows={3} className="text-sm" />
        </div>

        {/* Image Uploads */}
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
          <ImageUpload value={formData.logo_url} onChange={(url) => setFormData({ ...formData, logo_url: url })} label="Logo da Loja" folder="logos" aspectRatio="square" />
          <ImageUpload value={formData.cover_image_url} onChange={(url) => setFormData({ ...formData, cover_image_url: url })} label="Imagem de Capa" folder="covers" aspectRatio="banner" />
        </div>

        {/* Instagram */}
        <div className="space-y-2">
          <Label htmlFor="instagram" className="text-sm">Instagram</Label>
          <Input id="instagram" value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} placeholder="@sualoja" className="h-10" />
        </div>

        {/* Theme Presets */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Modelo do tema</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {themeOptions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setThemePreset(p.id);
                  const preset = THEME_PRESETS[p.id];
                  setFormData((prev) => ({ ...prev, theme_color: preset.primary }));
                  setThemeAccent(preset.accent);
                  setThemeFontHeading(preset.fontHeading);
                  setThemeFontBody(preset.fontBody);
                  setUseCustomHeadingFont(false);
                  setUseCustomBodyFont(false);
                }}
                className={`relative flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                  themePreset === p.id
                    ? "border-primary bg-primary/10 text-primary shadow-soft ring-1 ring-primary/20"
                    : "border-border bg-card text-foreground hover:border-muted-foreground/30 hover:bg-muted/50"
                }`}
              >
                <div className="w-4 h-4 rounded-full shrink-0 border border-border/50" style={{ backgroundColor: p.color }} />
                <span className="truncate">{p.label}</span>
                {themePreset === p.id && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Escolha um modelo e personalize abaixo. Você não fica "preso" ao modelo.</p>
        </div>

        {/* Palette */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="theme_color" className="text-sm">Cor principal</Label>
            <div className="flex gap-2">
              <Input id="theme_color" type="color" value={formData.theme_color} onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
              <Input value={formData.theme_color} onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })} className="flex-1 h-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme_accent" className="text-sm">Cor de destaque</Label>
            <div className="flex gap-2">
              <Input id="theme_accent" type="color" value={themeAccent} onChange={(e) => setThemeAccent(e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
              <Input value={themeAccent} onChange={(e) => setThemeAccent(e.target.value)} className="flex-1 h-10" />
            </div>
          </div>
        </div>

        {/* Fonts */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm">Fonte do título</Label>
            <Select
              value={useCustomHeadingFont ? "__custom__" : themeFontHeading}
              onValueChange={(v) => {
                if (v === "__custom__") { setUseCustomHeadingFont(true); return; }
                setUseCustomHeadingFont(false);
                setThemeFontHeading(v);
              }}
            >
              <SelectTrigger className="h-10"><SelectValue placeholder="Escolha uma fonte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Plus Jakarta Sans">Plus Jakarta Sans</SelectItem>
                <SelectItem value="DM Sans">DM Sans</SelectItem>
                <SelectItem value="Bebas Neue">Bebas Neue</SelectItem>
                <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                <SelectItem value="Oswald">Oswald</SelectItem>
                <SelectItem value="Poppins">Poppins</SelectItem>
                <SelectItem value="Noto Sans JP">Noto Sans JP</SelectItem>
                <SelectItem value="Lora">Lora</SelectItem>
                <SelectItem value="Quicksand">Quicksand</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="__custom__">Outra (digitar)</SelectItem>
              </SelectContent>
            </Select>
            {useCustomHeadingFont && <Input value={themeFontHeading} onChange={(e) => setThemeFontHeading(e.target.value)} placeholder="Digite o nome da fonte (Google Fonts)" className="h-10" />}
            <p className="text-xs text-muted-foreground">Usada no nome da loja e headings.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Fonte do texto</Label>
            <Select
              value={useCustomBodyFont ? "__custom__" : themeFontBody}
              onValueChange={(v) => {
                if (v === "__custom__") { setUseCustomBodyFont(true); return; }
                setUseCustomBodyFont(false);
                setThemeFontBody(v);
              }}
            >
              <SelectTrigger className="h-10"><SelectValue placeholder="Escolha uma fonte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Plus Jakarta Sans">Plus Jakarta Sans</SelectItem>
                <SelectItem value="DM Sans">DM Sans</SelectItem>
                <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                <SelectItem value="Oswald">Oswald</SelectItem>
                <SelectItem value="__custom__">Outra (digitar)</SelectItem>
              </SelectContent>
            </Select>
            {useCustomBodyFont && <Input value={themeFontBody} onChange={(e) => setThemeFontBody(e.target.value)} placeholder="Digite o nome da fonte (Google Fonts)" className="h-10" />}
            <p className="text-xs text-muted-foreground">Usada no restante do texto.</p>
          </div>
        </div>

        {/* Unavailable Products Config */}
        <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-secondary/30">
          <Label className="text-sm font-semibold flex items-center gap-2">
            🚫 Produtos Indisponíveis
          </Label>
          <p className="text-xs text-muted-foreground">
            Configure como os produtos indisponíveis aparecem para seus clientes
          </p>
          <Select
            value={formData.unavailable_mode}
            onValueChange={(v) => setFormData({ ...formData, unavailable_mode: v })}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="show_badge">Mostrar com badge "Indisponível"</SelectItem>
              <SelectItem value="hide">Esconder da vitrine</SelectItem>
            </SelectContent>
          </Select>
          {formData.unavailable_mode === "show_badge" && (
            <div className="space-y-2">
              <Label htmlFor="unavailable_message" className="text-xs">Mensagem personalizada</Label>
              <Input
                id="unavailable_message"
                value={formData.unavailable_message}
                onChange={(e) => setFormData({ ...formData, unavailable_message: e.target.value })}
                placeholder="Produto temporariamente indisponível"
                className="h-10"
              />
              <p className="text-[10px] text-muted-foreground">
                Exibida abaixo do produto. Ex: "Consultar previsão no WhatsApp"
              </p>
            </div>
          )}
        </div>

        {/* Store Open Toggle */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <Switch id="is_open" checked={formData.is_open} onCheckedChange={(checked) => setFormData({ ...formData, is_open: checked })} />
          <Label htmlFor="is_open" className="flex items-center gap-2 text-sm flex-1">
            Loja Aberta
            <Badge variant={formData.is_open ? "default" : "secondary"} className="text-xs">
              {formData.is_open ? "Aberta" : "Fechada"}
            </Badge>
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
