import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2, Plus, Pencil, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import * as XLSX from 'xlsx';

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

export const ProductsManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("category_name", { ascending: true, nullsFirst: false })
        .order("name");

      if (error) throw error;
      
      const productsList = data || [];
      setProducts(productsList);
      
      // Извлекаем уникальные категории
      const uniqueCategories = Array.from(
        new Set(productsList.map(p => p.category_name).filter(Boolean))
      ).sort() as string[];
      setCategories(uniqueCategories);
      
      // Инициализируем фильтрованный список
      setFilteredProducts(productsList);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить товары",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCategories.length === 0) {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(
        products.filter(p => 
          p.category_name && selectedCategories.includes(p.category_name)
        )
      );
    }
  }, [selectedCategories, products]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const selectAllCategories = () => {
    setSelectedCategories(categories);
  };

  const clearCategories = () => {
    setSelectedCategories([]);
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

      console.log("Parsed Excel data:", jsonData);

      const productsToInsert = jsonData.map((row: any) => {
        // Извлекаем данные из различных возможных названий колонок
        const name = row['Наименование'] || row['Название'] || row['name'] || '';
        const code = row['Код'] || row['code'] || null;
        const article = row['Артикул'] || row['article'] || null;
        const categoryPath = row['Полная группа'] || row['category_path'] || null;
        const categoryName = row['Название группы'] || row['category_name'] || null;
        const country = row['Страна'] || row['country'] || null;
        const quantity = parseInt(row['Остаток'] || row['quantity'] || '0');
        const unit = row['Ед. измерения'] || row['unit'] || 'шт.';
        const minQuantity = parseInt(row['Неснижаемый остаток'] || row['min_quantity'] || '0');
        const purchasePrice = parseFloat(row['Закупочная'] || row['purchase_price'] || '0');
        const retailPrice = parseFloat(row['Розничная'] || row['retail_price'] || '0');
        const warrantyDays = parseInt(row['Гарантия в днях'] || row['warranty_days'] || '0') || null;
        const warrantyMonths = parseInt(row['Гарантия в месяцах'] || row['warranty_months'] || '0') || null;
        const description = row['Описание'] || row['description'] || null;
        const photoUrl = row['Фото'] || row['photo_url'] || null;

        return {
          name,
          code,
          article,
          category_path: categoryPath,
          category_name: categoryName,
          country,
          quantity: isNaN(quantity) ? 0 : quantity,
          unit,
          min_quantity: isNaN(minQuantity) ? 0 : minQuantity,
          purchase_price: isNaN(purchasePrice) ? null : purchasePrice,
          retail_price: isNaN(retailPrice) ? null : retailPrice,
          warranty_days: warrantyDays,
          warranty_months: warrantyMonths,
          description,
          photo_url: photoUrl,
        };
      }).filter(p => p.name); // Фильтруем строки без названия

      if (productsToInsert.length === 0) {
        toast({
          title: "Ошибка",
          description: "В файле не найдено товаров для импорта",
          variant: "destructive",
        });
        return;
      }

      // Сначала удаляем все существующие товары
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все

      if (deleteError) throw deleteError;

      // Вставляем новые товары пакетами по 100 штук
      const batchSize = 100;
      for (let i = 0; i < productsToInsert.length; i += batchSize) {
        const batch = productsToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from("products")
          .insert(batch);

        if (insertError) throw insertError;
      }

      toast({
        title: "Успешно",
        description: `Импортировано товаров: ${productsToInsert.length}`,
      });

      fetchProducts();
    } catch (error) {
      console.error("Error importing Excel:", error);
      toast({
        title: "Ошибка импорта",
        description: error instanceof Error ? error.message : "Не удалось импортировать файл",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот товар?")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Товар удален",
      });

      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить товар",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ошибка",
        description: "Можно загружать только изображения",
        variant: "destructive",
      });
      return;
    }

    // Проверка размера файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер изображения не должен превышать 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploadingImage(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // Обновляем поле photo_url в форме
      const photoInput = document.getElementById('photo_url') as HTMLInputElement;
      if (photoInput) {
        photoInput.value = publicUrl;
      }

      toast({
        title: "Успешно",
        description: "Изображение загружено",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить изображение",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
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
      retail_price: parseFloat(formData.get("retail_price") as string) || null,
      description: formData.get("description") as string || null,
      photo_url: formData.get("photo_url") as string || null,
      is_visible: formData.get("is_visible") === "on",
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;

        toast({
          title: "Успешно",
          description: "Товар обновлен",
        });
      } else {
        const { error } = await supabase
          .from("products")
          .insert([productData]);

        if (error) throw error;

        toast({
          title: "Успешно",
          description: "Товар добавлен",
        });
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить товар",
        variant: "destructive",
      });
    }
  };

  const toggleProductVisibility = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_visible: !product.is_visible })
        .eq("id", product.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: `Товар ${!product.is_visible ? 'отображается' : 'скрыт'}`,
      });

      fetchProducts();
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить видимость товара",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Управление товарами</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Импорт...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Импорт из Excel
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
              className="hidden"
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingProduct(null);
                    setIsDialogOpen(true);
                  }}
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Добавить товар
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "Редактировать товар" : "Добавить товар"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Название *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingProduct?.name}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code">Код</Label>
                      <Input
                        id="code"
                        name="code"
                        defaultValue={editingProduct?.code || ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="article">Артикул</Label>
                      <Input
                        id="article"
                        name="article"
                        defaultValue={editingProduct?.article || ''}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="category_name">Категория</Label>
                    <Input
                      id="category_name"
                      name="category_name"
                      defaultValue={editingProduct?.category_name || ''}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Количество *</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="0"
                        defaultValue={editingProduct?.quantity || 0}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="retail_price">Розничная цена</Label>
                      <Input
                        id="retail_price"
                        name="retail_price"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={editingProduct?.retail_price || ''}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Описание</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingProduct?.description || ''}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photo_url">Изображение товара</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="gap-2"
                      >
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Загрузка...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Загрузить
                          </>
                        )}
                      </Button>
                      <Input
                        id="photo_url"
                        name="photo_url"
                        type="url"
                        placeholder="или вставьте URL"
                        defaultValue={editingProduct?.photo_url || ''}
                        className="flex-1"
                      />
                    </div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {editingProduct?.photo_url && (
                      <div className="mt-2">
                        <img 
                          src={editingProduct.photo_url} 
                          alt="Текущее изображение" 
                          className="h-24 w-24 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <Switch
                      id="is_visible"
                      name="is_visible"
                      defaultChecked={editingProduct?.is_visible !== false}
                    />
                    <Label htmlFor="is_visible">
                      Отображать товар на сайте и в боте
                    </Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingProduct(null);
                      }}
                    >
                      Отмена
                    </Button>
                    <Button type="submit">
                      {editingProduct ? "Сохранить" : "Добавить"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Всего товаров: {products.length}</p>
            <p>В наличии: {products.filter(p => p.quantity > 0).length}</p>
            <p>Показано: {filteredProducts.length}</p>
          </div>
        </CardContent>
      </Card>

      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Фильтр по категориям</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllCategories}
                >
                  Выбрать все
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCategories}
                >
                  Сбросить
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategories.includes(category) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Список товаров</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Код</TableHead>
                  <TableHead>Артикул</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Количество</TableHead>
                  <TableHead>Розничная цена</TableHead>
                  <TableHead>Закупочная</TableHead>
                  <TableHead>Гарантия</TableHead>
                  <TableHead>Видимость</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium max-w-xs">
                      <div className="truncate" title={product.name}>
                        {product.name}
                      </div>
                    </TableCell>
                    <TableCell>{product.code || '-'}</TableCell>
                    <TableCell>{product.article || '-'}</TableCell>
                    <TableCell>{product.category_name || '-'}</TableCell>
                    <TableCell>
                      <span className={product.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                        {product.quantity} {product.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      {product.retail_price ? `${product.retail_price.toLocaleString('ru-RU')} ₽` : '-'}
                    </TableCell>
                    <TableCell>
                      {product.purchase_price ? `${product.purchase_price.toLocaleString('ru-RU')} ₽` : '-'}
                    </TableCell>
                    <TableCell>
                      {product.warranty_days ? `${product.warranty_days} дн.` : 
                       product.warranty_months ? `${product.warranty_months} мес.` : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleProductVisibility(product)}
                        title={product.is_visible ? 'Скрыть товар' : 'Показать товар'}
                      >
                        {product.is_visible !== false ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingProduct(product);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Формат файла Excel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Файл должен содержать следующие колонки:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Наименование</strong> - название товара (обязательно)</li>
              <li><strong>Код</strong> - код товара</li>
              <li><strong>Артикул</strong> - артикул товара</li>
              <li><strong>Название группы</strong> - категория товара</li>
              <li><strong>Остаток</strong> - количество на складе</li>
              <li><strong>Розничная</strong> - розничная цена</li>
              <li><strong>Описание</strong> - описание товара</li>
              <li><strong>Фото</strong> - URL фотографии товара</li>
            </ul>
            <p className="mt-4 text-yellow-600">
              <strong>Внимание:</strong> При импорте все существующие товары будут заменены на товары из файла.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
