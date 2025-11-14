import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, ShoppingCart, Heart, User, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  image?: string;
  category?: string;
}

interface CartItem extends Product {
  cartQuantity: number;
}

interface Order {
  id: string;
  items: any;
  total_amount: number;
  status: string;
  created_at: string;
  phone_number: string;
}

export const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [selectedCategories, products, searchQuery]);

  const filterProducts = () => {
    let filtered = products;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(p => 
        p.category && selectedCategories.includes(p.category)
      );
    }

    setFilteredProducts(filtered);
  };

  const fetchUserOrders = async () => {
    // Removed - no longer needed
  };

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
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_visible', true)
        .gt('quantity', 0)
        .order('name');

      if (error) throw error;

      if (data) {
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
        
        const uniqueCategories = Array.from(
          new Set(formattedProducts.map(p => p.category).filter(Boolean))
        ).sort() as string[];
        setCategories(uniqueCategories);
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить товары",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, cartQuantity: Math.min(item.cartQuantity + 1, product.quantity) }
            : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
    toast({
      title: "Добавлено в корзину",
      description: product.name,
    });
  };
    if (newQuantity === 0) {
      setCart(prev => prev.filter(item => item.id !== productId));
    } else {
      setCart(prev =>
        prev.map(item =>
          item.id === productId ? { ...item, cartQuantity: newQuantity } : item
        )
      );
    }
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    return cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "Корзина пуста",
        description: "Добавьте товары в корзину перед оформлением заказа",
        variant: "destructive",
      });
      return;
    }
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleSubmitOrder = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите номер телефона",
        variant: "destructive",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Ошибка",
        description: "Необходимо согласие на обработку персональных данных",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        phoneNumber,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.cartQuantity,
        })),
        total: getTotalPrice(),
        timestamp: new Date().toISOString(),
      };

      const { data, error } = await supabase.functions.invoke('send-telegram-order', {
        body: orderData,
      });

      if (error) throw error;

      localStorage.setItem('userPhone', phoneNumber);

      toast({
        title: "Заказ оформлен!",
        description: "Мы свяжемся с вами в ближайшее время",
      });

      setCart([]);
      setShowCheckout(false);
      setPhoneNumber("");
      setAgreedToTerms(false);
    } catch (error: any) {
      console.error('Error submitting order:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось оформить заказ. Попробуйте позже.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    // Removed - no longer needed
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold">
              Магазин <span className="text-primary">комплектующих</span>
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCart(true)}
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              {cart.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {cart.length}
                </span>
              )}
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant={selectedCategories.length === 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategories([])}
              >
                Все
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
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 pb-16">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Товары не найдены</h3>
            <p className="text-muted-foreground">
              Попробуйте изменить фильтры или поисковый запрос
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">
                    {product.name}
                  </CardTitle>
                  {product.category && (
                    <CardDescription>{product.category}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {product.description}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {product.price.toLocaleString('ru-RU')} ₽
                      </p>
                      <p className="text-sm text-muted-foreground">
                        В наличии: {product.quantity} шт.
                      </p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => addToCart(product)}
                      className="gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      В корзину
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Корзина</DialogTitle>
            <DialogDescription>
              {cart.length} товаров на сумму {getTotalPrice().toLocaleString()} ₽
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Корзина пуста</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b pb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.price.toLocaleString()} ₽ × {item.cartQuantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{item.cartQuantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                      disabled={item.cartQuantity >= item.quantity}
                    >
                      +
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateCartQuantity(item.id, 0)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          {cart.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between mb-4">
                <span className="font-bold text-lg">Итого:</span>
                <span className="font-bold text-lg">{getTotalPrice().toLocaleString()} ₽</span>
              </div>
              <Button onClick={handleCheckout} className="w-full">
                Оформить заказ
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оформление заказа</DialogTitle>
            <DialogDescription>
              Заполните контактные данные для подтверждения заказа
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Номер телефона *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                Я согласен на обработку персональных данных в соответствии с ФЗ-152 "О персональных данных"
              </Label>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between mb-4">
                <span className="font-bold">Итого:</span>
                <span className="font-bold">{getTotalPrice().toLocaleString()} ₽</span>
              </div>
              <Button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || !phoneNumber || !agreedToTerms}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  'Подтвердить заказ'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shop;