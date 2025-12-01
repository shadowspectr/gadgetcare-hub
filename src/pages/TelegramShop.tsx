import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Heart, ShoppingCart, User, Home, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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

interface Order {
  id: string;
  items: any;
  total_amount: number;
  status: string;
  created_at: string;
}

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
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Инициализация Telegram WebApp
    if (window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user) {
          setTelegramUser(user);
          fetchUserOrders(user.id.toString());
        }
      } catch (e) {
        console.warn('Telegram WebApp init error', e);
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

  const fetchUserOrders = async (telegramUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('telegram_user_id', telegramUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

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
      
      // Reload orders
      if (telegramUser) {
        fetchUserOrders(telegramUser.id.toString());
      }
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/98 backdrop-blur-xl border-b">
        <div className="px-4 py-3 space-y-3">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-lg">
                Д
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">Доктор Гаджет</h1>
                <p className="text-xs text-muted-foreground">Маркет</p>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeFilter === "all" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="flex-1 rounded-full"
            >
              Все
            </Button>
            <Button
              variant={activeFilter === "available" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveFilter("available")}
              className="flex-1 rounded-full"
            >
              В наличии
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full bg-muted/50 border-0"
            />
          </div>

          {/* Category Pills - Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className="rounded-full whitespace-nowrap shrink-0"
            >
              Все категории
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="rounded-full whitespace-nowrap shrink-0"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Section Title */}
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-1">
                {activeTab === "favorites" ? "Избранное" : "Для вас"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'товар' : filteredProducts.length < 5 ? 'товара' : 'товаров'}
              </p>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Товары не найдены</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden border-0 shadow-sm bg-card/50 backdrop-blur">
                    <div className="relative aspect-square">
                      <img
                        src={product.photo_url || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => toggleFavorite(product.id)}
                        className="absolute top-2 right-2 p-2 bg-background/90 backdrop-blur-sm rounded-full shadow-lg transition-transform active:scale-95"
                      >
                        <Heart
                          className={`h-4 w-4 transition-colors ${
                            favorites.has(product.id)
                              ? "fill-red-500 text-red-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                      {product.quantity === 0 && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                          <Badge variant="destructive" className="text-xs">
                            Нет в наличии
                          </Badge>
                        </div>
                      )}
                      {product.quantity > 0 && product.quantity < 5 && (
                        <Badge className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs">
                          Осталось {product.quantity}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="p-3 space-y-2 bg-background">
                      <h3 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
                        {product.name}
                      </h3>
                      
                      <div className="flex items-end justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-lg font-bold text-foreground">
                            {product.retail_price?.toLocaleString()} ₽
                          </p>
                          {product.category_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {product.category_name}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => addToCart(product)}
                          disabled={product.quantity === 0}
                          size="icon"
                          className="h-9 w-9 rounded-full shrink-0"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Cart Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Корзина
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 -mx-6 px-6">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">Корзина пуста</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-2xl border bg-card"
                >
                  <img
                    src={item.photo_url || "/placeholder.svg"}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-xl shrink-0"
                  />
                  <div className="flex-1 space-y-2 min-w-0">
                    <h4 className="font-semibold text-sm line-clamp-2 leading-tight">{item.name}</h4>
                    <p className="text-base font-bold text-primary">
                      {item.retail_price?.toLocaleString()} ₽
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateCartQuantity(item.id, item.cartQuantity - 1)
                        }
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.cartQuantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateCartQuantity(item.id, item.cartQuantity + 1)
                        }
                        className="h-8 w-8 p-0 rounded-full"
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
            <div className="pt-4 border-t space-y-4 shrink-0 bg-background">
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium">Итого:</span>
                <span className="font-bold text-xl text-primary">{totalPrice.toLocaleString()} ₽</span>
              </div>
              <Button
                onClick={handleCheckoutClick}
                className="w-full h-12 rounded-full text-base font-semibold"
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
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-xl">Профиль</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 -mx-6 px-6">
            {telegramUser ? (
              <>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
                  {telegramUser.photo_url ? (
                    <img 
                      src={telegramUser.photo_url} 
                      alt="Аватар" 
                      className="h-16 w-16 rounded-full border-2 border-primary/20"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-lg">
                      {telegramUser.first_name} {telegramUser.last_name || ''}
                    </p>
                    {telegramUser.username && (
                      <p className="text-sm text-muted-foreground">@{telegramUser.username}</p>
                    )}
                  </div>
                </div>

                {/* Orders Button */}
                <Button 
                  variant="outline"
                  className="w-full h-14 rounded-2xl text-primary border-primary/20 hover:bg-primary/5 text-base font-semibold"
                  onClick={() => {/* можно добавить отдельный диалог заказов */}}
                >
                  Мои заказы
                </Button>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-muted/30">
                    <div className="text-lg font-bold">0</div>
                    <div className="text-[10px] text-muted-foreground">отзывов</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30">
                    <div className="text-lg font-bold">{userOrders.length}</div>
                    <div className="text-[10px] text-muted-foreground">заказов</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30">
                    <div className="text-lg font-bold">0</div>
                    <div className="text-[10px] text-muted-foreground">возвратов</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30">
                    <div className="text-lg font-bold">{favorites.size}</div>
                    <div className="text-[10px] text-muted-foreground">нравится</div>
                  </div>
                </div>

                {/* Orders History */}
                {userOrders.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">История заказов</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {userOrders.map((order) => {
                        const statusConfig = {
                          pending: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' },
                          accepted: { label: 'Принят', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' },
                          ready: { label: 'Готов к выдаче', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' },
                          completed: { label: 'Выдан', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-200' },
                          cancelled: { label: 'Отменен', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' }
                        };
                        const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
                        
                        return (
                          <Card key={order.id} className="p-4 border-0 bg-muted/30">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="text-sm font-semibold">Заказ #{order.id.slice(0, 8)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(order.created_at).toLocaleString('ru-RU')}
                                </p>
                              </div>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="text-sm space-y-1">
                              {order.items.slice(0, 2).map((item: any, idx: number) => (
                                <p key={idx} className="text-xs text-muted-foreground">
                                  • {item.name} <span className="font-medium">x{item.quantity}</span>
                                </p>
                              ))}
                              {order.items.length > 2 && (
                                <p className="text-xs text-muted-foreground">
                                  +ещё {order.items.length - 2}
                                </p>
                              )}
                              <p className="font-semibold text-base pt-2">
                                {Number(order.total_amount).toLocaleString()} ₽
                              </p>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">
                  Профиль Telegram недоступен. Продолжайте оформлять заказ через корзину.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Оформление заказа</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Номер телефона *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
              <p className="font-semibold text-sm">Состав заказа:</p>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.name} <span className="font-medium">x{item.cartQuantity}</span>
                    </span>
                    <span className="font-medium">
                      {(item.retail_price * item.cartQuantity).toLocaleString()} ₽
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t flex justify-between items-center">
                <span className="font-semibold">Итого:</span>
                <span className="font-bold text-xl text-primary">{totalPrice.toLocaleString()} ₽</span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-xl bg-muted/20">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="mt-0.5"
              />
              <Label 
                htmlFor="terms" 
                className="text-xs leading-relaxed cursor-pointer text-muted-foreground"
              >
                Я согласен на обработку персональных данных в соответствии с Федеральным законом №152-ФЗ "О персональных данных"
              </Label>
            </div>

            <Button
              onClick={handleCheckout}
              className="w-full h-12 rounded-full text-base font-semibold"
              size="lg"
              disabled={!phoneNumber.trim() || !agreedToTerms}
            >
              Подтвердить заказ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-xl border-t">
        <div className="flex justify-around items-center h-16 px-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
              activeTab === "all" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Home className={`h-5 w-5 ${activeTab === "all" ? "fill-current" : ""}`} />
            <span className="text-[10px] font-medium">Маркет</span>
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
              activeTab === "favorites" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Heart className={`h-5 w-5 ${activeTab === "favorites" ? "fill-current" : ""}`} />
            <span className="text-[10px] font-medium">Избранное</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("cart");
              setIsCartOpen(true);
            }}
            className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl relative transition-all ${
              activeTab === "cart" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <div className="relative">
              <ShoppingCart className={`h-5 w-5 ${activeTab === "cart" ? "fill-current" : ""}`} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                  {cart.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Корзина</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("profile");
              setIsProfileOpen(true);
            }}
            className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
              activeTab === "profile" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <User className={`h-5 w-5 ${activeTab === "profile" ? "fill-current" : ""}`} />
            <span className="text-[10px] font-medium">Профиль</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TelegramShop;
