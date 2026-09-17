import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DbCategory } from "@/hooks/useStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface SortableCategoryProps {
  category: DbCategory;
  index: number;
  onEdit: (category: DbCategory) => void;
  onDelete: (category: DbCategory) => void;
  onToggleActive: (category: DbCategory) => void;
}

export function SortableCategory({
  category,
  index,
  onEdit,
  onDelete,
  onToggleActive,
}: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`hover:shadow-md transition-shadow ${isDragging ? "shadow-lg ring-2 ring-primary" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div
            {...attributes}
            {...listeners}
            className="text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="w-5 h-5" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0 overflow-hidden">
            {(category as any).icon_url ? (
              <img src={(category as any).icon_url} alt={category.name} className="w-full h-full object-cover" />
            ) : (
              category.icon
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground truncate">
                {category.name}
              </h3>
              {!category.is_active && (
                <Badge variant="secondary" className="text-xs">
                  Inativa
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Posição: {index + 1}</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={category.is_active}
              onCheckedChange={() => onToggleActive(category)}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(category)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação não pode ser desfeita. A categoria "{category.name}" será removida.
                    Os produtos desta categoria ficarão sem categoria.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(category)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
