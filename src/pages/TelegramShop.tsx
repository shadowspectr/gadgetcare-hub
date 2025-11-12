import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Heart, ShoppingCart, User, Home } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
      };
    };
  }
}

type Product = {
  id: string;
  name: string;
  description: string | null;
  retail_price: number;
  quantity: number;
  photo_url: string | null;
  category_name: string | null;
};

type CartItem = Product & {
  cartQuantity: number;
};

type TabType = "all" | "favorites" | "cart" | "profile";
type FilterType = "all" | "available";

export const TelegramShop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Инициализация Telegram WebApp
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      const user = window.Telegram.WebApp.initDataUnsafe.user;
      if (user) {
        setTelegramUser(user);
      }
    }
    fetchProducts();
    
    // Load favorites and cart from localStorage
    const savedFavorites = localStorage.getItem("telegramFavorites");
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
    
    const savedCart = localStorage.getItem("telegramCart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_visible", true)
      .order("category_name", { ascending: true })
      .order("name");

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить товары",
        variant: "destructive",
      });
    } else {
      setProducts(data || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map(p => p.category_name).filter(Boolean) as string[])];
      setCategories(uniqueCategories);
    }
    setLoading(false);
  };

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
      toast({
        title: "Удалено из избранного",
      });
    } else {
      newFavorites.add(productId);
      toast({
        title: "Добавлено в избранное",
      });
    }
    setFavorites(newFavorites);
    localStorage.setItem("telegramFavorites", JSON.stringify([...newFavorites]));
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    let newCart: CartItem[];
    
    if (existingItem) {
      if (existingItem.cartQuantity >= product.quantity) {
        toast({
          title: "Недостаточно товара",
          description: "Вы уже добавили максимальное количество",
          variant: "destructive",
        });
        return;
      }
      newCart = cart.map((item) =>
        item.id === product.id
          ? { ...item, cartQuantity: item.cartQuantity + 1 }
          : item
      );
    } else {
      newCart = [...cart, { ...product, cartQuantity: 1 }];
    }
    
    setCart(newCart);
    localStorage.setItem("telegramCart", JSON.stringify(newCart));
    toast({
      title: "Добавлено в корзину",
      description: product.name,
    });
  };

  const removeFromCart = (productId: string) => {
    const newCart = cart.filter((item) => item.id !== productId);
    setCart(newCart);
    localStorage.setItem("telegramCart", JSON.stringify(newCart));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    const product = cart.find((item) => item.id === productId);
    if (product && quantity > product.quantity) {
      toast({
        title: "Недостаточно товара",
        description: "Вы достигли максимального количества",
        variant: "destructive",
      });
      return;
    }
    
    const newCart = cart.map((item) =>
      item.id === productId ? { ...item, cartQuantity: quantity } : item
    );
    setCart(newCart);
    localStorage.setItem("telegramCart", JSON.stringify(newCart));
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = 
      activeFilter === "all" ||
      (activeFilter === "available" && product.quantity > 0);
    const matchesCategory = 
      selectedCategory === "all" || 
      product.category_name === selectedCategory;
    const matchesFavorites = activeTab === "favorites" ? favorites.has(product.id) : true;
    return matchesSearch && matchesFilter && matchesCategory && matchesFavorites;
  });

  const totalPrice = cart.reduce(
    (sum, item) => sum + (item.retail_price || 0) * item.cartQuantity,
    0
  );

  const handleCheckoutClick = () => {
    if (cart.length === 0) {
      toast({
        title: "Корзина пуста",
        description: "Добавьте товары перед оформлением заказа",
        variant: "destructive",
      });
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleCheckout = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Укажите номер телефона",
        description: "Номер телефона обязателен для оформления заказа",
        variant: "destructive",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Требуется согласие",
        description: "Необходимо согласие на обработку персональных данных",
        variant: "destructive",
      });
      return;
    }

    try {
      const orderData = {
        user: telegramUser,
        phoneNumber,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.retail_price,
          quantity: item.cartQuantity,
        })),
        total: totalPrice,
        timestamp: new Date().toISOString(),
      };

      const { error } = await supabase.functions.invoke('send-telegram-order', {
        body: orderData,
      });

      if (error) throw error;

      toast({
        title: "Заказ оформлен",
        description: "Мы получили ваш заказ и свяжемся с вами в ближайшее время",
      });

      // Очищаем корзину и форму
      setCart([]);
      localStorage.removeItem("telegramCart");
      setPhoneNumber("");
      setAgreedToTerms(false);
      setIsCheckoutOpen(false);
    } catch (error) {
      console.error("Error sending order:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заказ. Попробуйте еще раз.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Доктор Гаджет
            </h1>
            <Badge variant="secondary" className="text-xs">
              {products.length} товаров
            </Badge>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="flex-1"
            >
              Все
            </Button>
            <Button
              variant={activeFilter === "available" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("available")}
              className="flex-1"
            >
              В наличии
            </Button>
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Товары не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden hover-lift animate-fade-in">
                <div className="relative">
                  <img
                    src={product.photo_url || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-40 object-cover"
                  />
                  <button
                    onClick={() => toggleFavorite(product.id)}
                    className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur rounded-full"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        favorites.has(product.id)
                          ? "fill-red-500 text-red-500"
                          : "text-foreground"
                      }`}
                    />
                  </button>
                  {product.quantity === 0 && (
                    <Badge className="absolute bottom-2 left-2 bg-destructive">
                      Нет в наличии
                    </Badge>
                  )}
                  {product.quantity > 0 && product.quantity < 5 && (
                    <Badge className="absolute bottom-2 left-2 bg-orange-500">
                      Осталось {product.quantity}
                    </Badge>
                  )}
                </div>
                
                <div className="p-3 space-y-2">
                  <div>
                    {product.category_name && (
                      <Badge variant="secondary" className="text-xs mb-1">
                        {product.category_name}
                      </Badge>
                    )}
                    <h3 className="font-semibold text-sm line-clamp-2">
                      {product.name}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-primary">
                      {product.retail_price?.toLocaleString()} ₽
                    </p>
                    <Button
                      onClick={() => addToCart(product)}
                      disabled={product.quantity === 0}
                      size="sm"
                      className="gap-1"
                    >
                      <ShoppingCart className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cart Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Корзина
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Корзина пуста
              </p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-lg border"
                >
                  <img
                    src={item.photo_url || "/placeholder.svg"}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1 space-y-2">
                    <h4 className="font-semibold text-sm line-clamp-2">{item.name}</h4>
                    <p className="text-lg font-bold text-primary">
                      {item.retail_price?.toLocaleString()} ₽
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateCartQuantity(item.id, item.cartQuantity - 1)
                        }
                        className="h-7 w-7 p-0"
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm">{item.cartQuantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateCartQuantity(item.id, item.cartQuantity + 1)
                        }
                        className="h-7 w-7 p-0"
                      >
                        +
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCart(item.id)}
                        className="ml-auto text-destructive hover:text-destructive"
                      >
                        Удалить
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="pt-4 border-t space-y-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Итого:</span>
                <span className="text-primary">{totalPrice.toLocaleString()} ₽</span>
              </div>
              <Button
                onClick={handleCheckoutClick}
                className="w-full"
                size="lg"
              >
                Оформить заказ
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Профиль</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {telegramUser ? (
              <>
                {telegramUser.photo_url && (
                  <div className="flex justify-center">
                    <img 
                      src={telegramUser.photo_url} 
                      alt="Аватар" 
                      className="h-24 w-24 rounded-full border-4 border-primary"
                    />
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Имя:</p>
                    <p className="font-medium text-lg">
                      {telegramUser.first_name} {telegramUser.last_name || ''}
                    </p>
                  </div>
                  {telegramUser.username && (
                    <div>
                      <p className="text-sm text-muted-foreground">Username:</p>
                      <p className="font-medium">@{telegramUser.username}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Telegram ID:</p>
                    <p className="font-mono text-sm">{telegramUser.id}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Откройте приложение через Telegram для просмотра профиля
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оформление заказа</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Номер телефона *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-semibold">Ваш заказ:</p>
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} x{item.cartQuantity}</span>
                  <span>{(item.retail_price * item.cartQuantity).toLocaleString()} ₽</span>
                </div>
              ))}
              <div className="pt-2 border-t flex justify-between font-bold">
                <span>Итого:</span>
                <span className="text-primary">{totalPrice.toLocaleString()} ₽</span>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              />
              <Label 
                htmlFor="terms" 
                className="text-sm leading-tight cursor-pointer"
              >
                Я согласен на обработку персональных данных в соответствии с Федеральным законом №152-ФЗ "О персональных данных"
              </Label>
            </div>

            <Button
              onClick={handleCheckout}
              className="w-full"
              size="lg"
              disabled={!phoneNumber.trim() || !agreedToTerms}
            >
              Подтвердить заказ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t shadow-lg">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              activeTab === "all" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Главная</span>
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              activeTab === "favorites" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Heart className="h-5 w-5" />
            <span className="text-xs">Избранное</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("cart");
              setIsCartOpen(true);
            }}
            className={`flex flex-col items-center gap-1 px-4 py-2 relative transition-colors ${
              activeTab === "cart" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <ShoppingCart className="h-5 w-5" />
            {cart.length > 0 && (
              <span className="absolute top-1 right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center animate-scale-in">
                {cart.length}
              </span>
            )}
            <span className="text-xs">Корзина</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("profile");
              setIsProfileOpen(true);
            }}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              activeTab === "profile" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Профиль</span>
          </button>
        </div>
      </div>
    </div>
  );
};
