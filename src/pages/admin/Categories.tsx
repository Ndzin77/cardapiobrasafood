import { useState } from "react";
import { useMyStore, useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, DbCategory } from "@/hooks/useStore";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Tag } from "lucide-react";
import { EmojiPicker } from "@/components/admin/EmojiPicker";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SortableCategory } from "@/components/admin/SortableCategory";

export default function Categories() {
  const { data: store } = useMyStore();
  const { data: categories, isLoading } = useCategories(store?.id);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DbCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    icon: "🍽️",
    icon_url: "",
    is_active: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const resetForm = () => {
    setFormData({
      name: "",
      icon: "🍽️",
      icon_url: "",
      is_active: true,
    });
    setEditingCategory(null);
  };

  const openEditDialog = (category: DbCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon || "🍽️",
      icon_url: (category as any).icon_url || "",
      is_active: category.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    const categoryData = {
      store_id: store.id,
      name: formData.name,
      icon: formData.icon_url ? "📷" : formData.icon,
      icon_url: formData.icon_url || null,
      is_active: formData.is_active,
      sort_order: categories?.length || 0,
    };

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, ...categoryData });
      } else {
        await createCategory.mutateAsync(categoryData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  const handleDelete = async (category: DbCategory) => {
    if (!store) return;
    await deleteCategory.mutateAsync({ id: category.id, storeId: store.id });
  };

  const toggleActive = async (category: DbCategory) => {
    await updateCategory.mutateAsync({
      id: category.id,
      is_active: !category.is_active,
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && categories) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedCategories = arrayMove(categories, oldIndex, newIndex);
        
        // Update sort_order for all affected categories
        for (let i = 0; i < reorderedCategories.length; i++) {
          if (reorderedCategories[i].sort_order !== i) {
            await updateCategory.mutateAsync({
              id: reorderedCategories[i].id,
              sort_order: i,
            });
          }
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2 sm:space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 sm:h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Categorias</h1>
          <p className="text-sm text-muted-foreground">Organize seus produtos (arraste para reordenar)</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="mx-4 sm:mx-auto max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
              <DialogDescription className="text-sm">
                {editingCategory
                  ? "Atualize as informações"
                  : "Crie uma nova categoria"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Ícone da Categoria</Label>
                <Tabs defaultValue={formData.icon_url ? "image" : "emoji"} className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="emoji" className="text-xs">Emoji</TabsTrigger>
                    <TabsTrigger value="image" className="text-xs">Foto</TabsTrigger>
                  </TabsList>
                  <TabsContent value="emoji" className="mt-2">
                    <EmojiPicker
                      value={formData.icon}
                      onChange={(emoji) => setFormData({ ...formData, icon: emoji, icon_url: "" })}
                    />
                  </TabsContent>
                  <TabsContent value="image" className="mt-2">
                    <ImageUpload
                      value={formData.icon_url}
                      onChange={(url) => setFormData({ ...formData, icon_url: url })}
                      label="Imagem do ícone"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Recomendado: imagem quadrada (ex: 100x100)</p>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Lanches, Bebidas..."
                  required
                  className="h-10"
                />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="text-sm">Categoria ativa</Label>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending} className="w-full sm:w-auto">
                  {editingCategory ? "Salvar" : "Criar Categoria"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categories?.length === 0 ? (
        <Card className="py-8 sm:py-12">
          <CardContent className="text-center">
            <Tag className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-medium mb-2">Nenhuma categoria</h3>
            <p className="text-sm text-muted-foreground mb-4">Crie categorias para organizar</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories?.map((c) => c.id) || []} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 sm:space-y-3">
              {categories?.map((category, index) => (
                <SortableCategory
                  key={category.id}
                  category={category}
                  index={index}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                  onToggleActive={toggleActive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
