import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Loader2, Search, Upload, Plus, Pencil, Trash2, Eye, EyeOff, 
  Package, AlertTriangle, DollarSign, Minus, ChevronDown 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
  id: string;
  name: string;
  code?: string;
  article?: string;
  category_path?: string;
  category_name?: string;
  country?: string;
  quantity: number;
  unit?: string;
  min_quantity?: number;
  purchase_price?: number;
  retail_price?: number;
  warranty_days?: number;
  warranty_months?: number;
  description?: string;
  photo_url?: string;
  is_visible?: boolean;
}

export const WarehouseManagerNew = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategories, showLowStock]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("category_name", { ascending: true })
        .order("name");

      if (error) throw error;
      
      const productsList = data || [];
      setProducts(productsList);
      
      const uniqueCategories = Array.from(
        new Set(productsList.map(p => p.category_name).filter(Boolean))
      ).sort() as string[];
      setCategories(uniqueCategories);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить товары",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.code?.toLowerCase().includes(query) ||
        p.article?.toLowerCase().includes(query)
      );
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(p => 
        p.category_name && selectedCategories.includes(p.category_name)
      );
    }

    if (showLowStock) {
      filtered = filtered.filter(p => 
        p.quantity <= (p.min_quantity || 5)
      );
    }

    setFilteredProducts(filtered);
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const productsToInsert = jsonData.map((row: any) => ({
        name: row['Наименование'] || row['Название'] || row['name'] || '',
        code: row['Код'] || row['code'] || null,
        article: row['Артикул'] || row['article'] || null,
        category_path: row['Полная группа'] || row['category_path'] || null,
        category_name: row['Название группы'] || row['category_name'] || null,
        country: row['Страна'] || row['country'] || null,
        quantity: parseInt(row['Остаток'] || row['quantity'] || '0') || 0,
        unit: row['Ед. измерения'] || row['unit'] || 'шт.',
        min_quantity: parseInt(row['Неснижаемый остаток'] || row['min_quantity'] || '0') || 0,
        purchase_price: parseFloat(row['Закупочная'] || row['purchase_price'] || '0') || null,
        retail_price: parseFloat(row['Розничная'] || row['retail_price'] || '0') || null,
        warranty_days: parseInt(row['Гарантия в днях'] || '0') || null,
        warranty_months: parseInt(row['Гарантия в месяцах'] || '0') || null,
        description: row['Описание'] || row['description'] || null,
        photo_url: row['Фото'] || row['photo_url'] || null,
        is_visible: true
      })).filter(p => p.name);

      if (productsToInsert.length === 0) {
        toast({ title: "Ошибка", description: "В файле не найдено товаров", variant: "destructive" });
        return;
      }

      // Delete existing and insert new
      await supabase.from("products").delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const batchSize = 100;
      for (let i = 0; i < productsToInsert.length; i += batchSize) {
        const batch = productsToInsert.slice(i, i + batchSize);
        const { error } = await supabase.from("products").insert(batch);
        if (error) throw error;
      }

      toast({ title: "Успешно", description: `Импортировано: ${productsToInsert.length} товаров` });
      fetchProducts();
    } catch (error: any) {
      toast({ title: "Ошибка импорта", description: error.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const productData = {
      name: formData.get("name") as string,
      code: formData.get("code") as string || null,
      article: formData.get("article") as string || null,
      category_name: formData.get("category_name") as string || null,
      quantity: parseInt(formData.get("quantity") as string) || 0,
      min_quantity: parseInt(formData.get("min_quantity") as string) || 0,
      retail_price: parseFloat(formData.get("retail_price") as string) || null,
      purchase_price: parseFloat(formData.get("purchase_price") as string) || null,
      description: formData.get("description") as string || null,
      photo_url: formData.get("photo_url") as string || null,
      is_visible: formData.get("is_visible") === "on",
    };

    try {
      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id);
        if (error) throw error;
        toast({ title: "Успешно", description: "Товар обновлен" });
      } else {
        const { error } = await supabase.from("products").insert([productData]);
        if (error) throw error;
        toast({ title: "Успешно", description: "Товар добавлен" });
      }
      setIsDialogOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Удалить товар?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Успешно", description: "Товар удален" });
      fetchProducts();
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  };

  const toggleVisibility = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_visible: !product.is_visible })
        .eq("id", product.id);
      if (error) throw error;
      toast({ title: "Успешно", description: `Товар ${!product.is_visible ? 'отображается' : 'скрыт'}` });
      fetchProducts();
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  };

  const updateQuantity = async (product: Product, delta: number) => {
    const newQty = Math.max(0, product.quantity + delta);
    try {
      const { error } = await supabase
        .from("products")
        .update({ quantity: newQty })
        .eq("id", product.id);
      if (error) throw error;
      fetchProducts();
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      toast({ title: "Ошибка", description: "Только изображения до 5MB", variant: "destructive" });
      return;
    }

    try {
      setIsUploadingImage(true);
      const fileName = `${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
      const photoInput = document.getElementById('photo_url') as HTMLInputElement;
      if (photoInput) photoInput.value = publicUrl;
      toast({ title: "Успешно", description: "Изображение загружено" });
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Stats
  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.quantity > 0 && p.quantity <= (p.min_quantity || 5)).length,
    outOfStock: products.filter(p => p.quantity === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.quantity || 0) * (p.retail_price || 0), 0),
    categoriesCount: categories.length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Товаров</p>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.lowStock > 0 ? "border-yellow-300 bg-yellow-50" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className={`h-8 w-8 ${stats.lowStock > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-2xl font-bold">{stats.lowStock}</p>
              <p className="text-xs text-muted-foreground">Заканчивается</p>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.outOfStock > 0 ? "border-red-300 bg-red-50" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <Minus className={`h-8 w-8 ${stats.outOfStock > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-2xl font-bold">{stats.outOfStock}</p>
              <p className="text-xs text-muted-foreground">Нет в наличии</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{(stats.totalValue / 1000).toFixed(0)}к</p>
              <p className="text-xs text-muted-foreground">Стоимость</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{stats.categoriesCount}</p>
              <p className="text-xs text-muted-foreground">Категорий</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, коду, артикулу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  Категории ({selectedCategories.length || 'Все'})
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto">
                {categories.map(cat => (
                  <DropdownMenuCheckboxItem
                    key={cat}
                    checked={selectedCategories.includes(cat)}
                    onCheckedChange={(checked) => {
                      setSelectedCategories(prev => 
                        checked ? [...prev, cat] : prev.filter(c => c !== cat)
                      );
                    }}
                  >
                    {cat}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <Switch
                checked={showLowStock}
                onCheckedChange={setShowLowStock}
                id="low-stock"
              />
              <Label htmlFor="low-stock" className="text-sm cursor-pointer">
                Мало на складе
              </Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="gap-2">
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Импорт Excel
              </Button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => { setEditingProduct(null); setIsDialogOpen(true); }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Добавить
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? "Редактировать" : "Добавить товар"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveProduct} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Название *</Label>
                      <Input id="name" name="name" defaultValue={editingProduct?.name} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="code">Код</Label>
                        <Input id="code" name="code" defaultValue={editingProduct?.code || ''} />
                      </div>
                      <div>
                        <Label htmlFor="article">Артикул</Label>
                        <Input id="article" name="article" defaultValue={editingProduct?.article || ''} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="category_name">Категория</Label>
                      <Input id="category_name" name="category_name" defaultValue={editingProduct?.category_name || ''} list="categories-list" />
                      <datalist id="categories-list">
                        {categories.map(cat => <option key={cat} value={cat} />)}
                      </datalist>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="quantity">Количество</Label>
                        <Input id="quantity" name="quantity" type="number" min="0" defaultValue={editingProduct?.quantity || 0} />
                      </div>
                      <div>
                        <Label htmlFor="min_quantity">Мин. остаток</Label>
                        <Input id="min_quantity" name="min_quantity" type="number" min="0" defaultValue={editingProduct?.min_quantity || 0} />
                      </div>
                      <div>
                        <Label htmlFor="retail_price">Розничная цена</Label>
                        <Input id="retail_price" name="retail_price" type="number" min="0" step="0.01" defaultValue={editingProduct?.retail_price || ''} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="purchase_price">Закупочная цена</Label>
                      <Input id="purchase_price" name="purchase_price" type="number" min="0" step="0.01" defaultValue={editingProduct?.purchase_price || ''} />
                    </div>
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Textarea id="description" name="description" defaultValue={editingProduct?.description || ''} />
                    </div>
                    <div>
                      <Label htmlFor="photo_url">URL фото</Label>
                      <div className="flex gap-2">
                        <Input id="photo_url" name="photo_url" defaultValue={editingProduct?.photo_url || ''} />
                        <Button type="button" variant="outline" disabled={isUploadingImage}>
                          <label className="cursor-pointer flex items-center gap-2">
                            {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                          </label>
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="is_visible" name="is_visible" defaultChecked={editingProduct?.is_visible !== false} />
                      <Label htmlFor="is_visible">Отображать на сайте</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Отмена</Button>
                      <Button type="submit">Сохранить</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Товары ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Артикул</TableHead>
                  <TableHead className="text-center">Кол-во</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Видимость</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Товары не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/30">
                      <TableCell>
                        {product.photo_url ? (
                          <img src={product.photo_url} alt="" className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {product.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {product.category_name || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {product.article || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(product, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Badge 
                            variant={product.quantity === 0 ? "destructive" : product.quantity <= (product.min_quantity || 5) ? "secondary" : "default"}
                            className="min-w-[40px] justify-center"
                          >
                            {product.quantity}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(product, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.retail_price?.toLocaleString() || '—'}₽
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleVisibility(product)}
                        >
                          {product.is_visible ? (
                            <Eye className="h-4 w-4 text-green-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingProduct(product); setIsDialogOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
