import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

const emojiCategories = {
  food: {
    label: "Comida",
    emojis: [
      "🍽️", "🍔", "🍕", "🌮", "🌯", "🥙", "🥪", "🍜", "🍝", "🍣", "🍱",
      "🥗", "🍲", "🍛", "🍚", "🍙", "🍘", "🍢", "🥟", "🥠", "🥡", "🍿",
      "🥓", "🥩", "🍗", "🍖", "🌭", "🍟", "🥚", "🍳", "🥞", "🧇", "🥐",
      "🍞", "🥖", "🥨", "🧀", "🥯", "🥓", "🥬", "🥒", "🌶️", "🌽", "🥕",
      "🧄", "🧅", "🥔", "🍠", "🥜", "🍰", "🎂", "🧁", "🥧", "🍮", "🍭",
      "🍬", "🍫", "🍩", "🍪", "🧃", "🍌", "🍎", "🍊", "🍇", "🍓", "🫐"
    ]
  },
  drinks: {
    label: "Bebidas",
    emojis: [
      "☕", "🍵", "🧋", "🧃", "🥤", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃",
      "🍸", "🍹", "🍾", "🧉", "🫖", "🥛", "🍼"
    ]
  },
  symbols: {
    label: "Símbolos",
    emojis: [
      "⭐", "🔥", "❤️", "💚", "💙", "💜", "🧡", "💛", "🤍", "🖤", "💖",
      "✨", "💫", "🌟", "⚡", "💥", "🎉", "🎊", "🎁", "🏆", "🥇", "🥈",
      "🥉", "🏅", "🎯", "💰", "💎", "👑", "🌈", "☀️", "🌙", "⛔", "✅",
      "❌", "💯", "🆕", "🆓", "📍", "🔔", "💬", "💡", "🛒", "🛍️", "📦"
    ]
  },
  nature: {
    label: "Natureza",
    emojis: [
      "🌱", "🌿", "☘️", "🍀", "🌴", "🌵", "🌾", "🌻", "🌼", "🌸", "💐",
      "🌹", "🥀", "🌺", "🌷", "🍁", "🍂", "🍃", "🐔", "🐷", "🐮", "🐟",
      "🦐", "🦀", "🦞", "🦑", "🐙", "🦪", "🐚"
    ]
  }
};

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("");

  const handleCustomEmoji = () => {
    if (customEmoji) {
      onChange(customEmoji);
      setCustomEmoji("");
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Ícone</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-2xl h-12"
          >
            {value}
            <span className="ml-2 text-sm text-muted-foreground font-normal">
              Clique para escolher
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Tabs defaultValue="food" className="w-full">
            <TabsList className="w-full grid grid-cols-4 rounded-none border-b">
              {Object.entries(emojiCategories).map(([key, cat]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="text-xs rounded-none"
                >
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(emojiCategories).map(([key, cat]) => (
              <TabsContent key={key} value={key} className="m-0">
                <ScrollArea className="h-48">
                  <div className="grid grid-cols-8 gap-1 p-2">
                    {cat.emojis.map((emoji) => (
                      <Button
                        key={emoji}
                        type="button"
                        variant={value === emoji ? "default" : "ghost"}
                        className="h-9 w-9 p-0 text-xl"
                        onClick={() => {
                          onChange(emoji);
                          setOpen(false);
                        }}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
          <div className="border-t p-2">
            <div className="flex gap-2">
              <Input
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                placeholder="Cole qualquer emoji..."
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCustomEmoji}
                disabled={!customEmoji}
              >
                Usar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
