import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Package, AlertTriangle } from "lucide-react";

interface Product {
  id: string;
  name: string;
  code: string | null;
  article: string | null;
  category_name: string | null;
  quantity: number;
  min_quantity: number;
  retail_price: number | null;
  purchase_price: number | null;
  unit: string;
}

export const WarehouseManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");

      if (error) throw error;

      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.code?.toLowerCase().includes(query) ||
        product.article?.toLowerCase().includes(query) ||
        product.category_name?.toLowerCase().includes(query)
    );
    setFilteredProducts(filtered);
  };

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 0) {
      toast({
        title: "Ошибка",
        description: "Количество не может быть отрицательным",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({ quantity: newQuantity })
        .eq("id", productId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Количество обновлено",
      });

      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Ошибка обновления",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.quantity === 0) {
      return <Badge variant="destructive">Нет в наличии</Badge>;
    }
    if (product.quantity <= product.min_quantity) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Низкий остаток</Badge>;
    }
    return <Badge variant="outline" className="border-green-500 text-green-500">В наличии</Badge>;
  };

  const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= p.min_quantity).length;
  const outOfStockCount = products.filter(p => p.quantity === 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.quantity * (p.retail_price || 0)), 0);
  const categories = Array.from(new Set(products.map(p => p.category_name).filter(Boolean))) as string[];

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Всего товаров</CardDescription>
            <CardTitle className="text-3xl">{products.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Низкий остаток</CardDescription>
            <CardTitle className="text-3xl text-yellow-500">{lowStockCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Нет в наличии</CardDescription>
            <CardTitle className="text-3xl text-destructive">{outOfStockCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Общая стоимость</CardDescription>
            <CardTitle className="text-3xl">{totalValue.toFixed(0)} ₽</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Категории</CardDescription>
            <CardTitle className="text-3xl">{categories.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Складской учет</CardTitle>
          <CardDescription>Управление остатками товаров на складе</CardDescription>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, коду, артикулу или категории..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto text-xs">
                {categories.map((cat) => (
                  <Badge key={cat} variant="outline">
                    {cat}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Код</TableHead>
                  <TableHead>Артикул</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Остаток</TableHead>
                  <TableHead>Мин. остаток</TableHead>
                  <TableHead>Цена закупки</TableHead>
                  <TableHead>Цена розничная</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "Товары не найдены" : "Нет товаров на складе"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.code || "-"}</TableCell>
                      <TableCell>{product.article || "-"}</TableCell>
                      <TableCell>{product.category_name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {product.quantity <= product.min_quantity && product.quantity > 0 && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          {product.quantity === 0 && (
                            <Package className="h-4 w-4 text-destructive" />
                          )}
                          <span>{product.quantity} {product.unit}</span>
                        </div>
                      </TableCell>
                      <TableCell>{product.min_quantity} {product.unit}</TableCell>
                      <TableCell>{product.purchase_price ? `${product.purchase_price} ₽` : "-"}</TableCell>
                      <TableCell>{product.retail_price ? `${product.retail_price} ₽` : "-"}</TableCell>
                      <TableCell>{getStockStatus(product)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(product.id, product.quantity - 1)}
                            disabled={product.quantity === 0}
                          >
                            -
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(product.id, product.quantity + 1)}
                          >
                            +
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
