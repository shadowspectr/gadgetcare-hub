import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  image?: string;
  category?: string;
}

export const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedCategories.length === 0) {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(
        products.filter(p => 
          p.category && selectedCategories.includes(p.category)
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

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching products from database...');
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('quantity', 0)
        .order('name');

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      console.log('Products data:', data);

      if (data) {
        // Преобразуем данные из БД в формат, который ожидает компонент
        const formattedProducts: Product[] = data.map(product => ({
          id: product.id,
          name: product.name,
          price: product.retail_price || 0,
          quantity: product.quantity,
          description: product.description || undefined,
          image: product.photo_url || undefined,
          category: product.category_name || undefined,
        }));
        setProducts(formattedProducts);
        setFilteredProducts(formattedProducts);
        
        // Извлекаем уникальные категории
        const uniqueCategories = Array.from(
          new Set(formattedProducts.map(p => p.category).filter(Boolean))
        ).sort() as string[];
        setCategories(uniqueCategories);
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить товары",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить товары из базы данных",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Магазин <span className="text-primary">комплектующих</span>
          </h1>
          <p className="text-gray-600">
            Качественные комплектующие для вашей техники
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Показано товаров: {filteredProducts.length} из {products.length}
          </p>
        </div>

        {categories.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Категории товаров</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategories.length === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategories([])}
                >
                  Все категории
                </Button>
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

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {products.length === 0 ? 'Товары временно недоступны' : 'Нет товаров в выбранных категориях'}
            </h3>
            <p className="text-gray-600">
              {products.length === 0 
                ? 'Попробуйте обновить страницу или зайдите позже'
                : 'Попробуйте выбрать другие категории'}
            </p>
            {products.length === 0 && (
              <Button 
                onClick={fetchProducts} 
                className="mt-4"
                variant="outline"
              >
                Обновить
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg line-clamp-2">
                      {product.name}
                    </CardTitle>
                    {product.quantity > 0 ? (
                      <Badge variant="default" className="bg-green-500">
                        В наличии
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Нет в наличии
                      </Badge>
                    )}
                  </div>
                  {product.category && (
                    <CardDescription>{product.category}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {product.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {product.description}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {product.price.toLocaleString('ru-RU')} ₽
                      </p>
                      {product.quantity > 0 && (
                        <p className="text-sm text-gray-500">
                          Доступно: {product.quantity} шт.
                        </p>
                      )}
                    </div>
                    <Button 
                      size="sm"
                      disabled={product.quantity === 0}
                      className="gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Заказать
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Shop;
