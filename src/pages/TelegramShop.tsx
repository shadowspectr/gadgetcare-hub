import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Search, Heart, ShoppingCart, User, Home, Package, 
  Smartphone, Headphones, Watch, Tablet, Cpu, Monitor, Camera, 
  Gamepad2, Speaker, Cable, Battery, Zap, ChevronLeft, X, Clock,
  CheckCircle2, Truck, XCircle, Info
} from "lucide-react";
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
        MainButton: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
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
  phone_number: string;
}

// Category icon mapping
const getCategoryIcon = (categoryName: string | null) => {
  if (!categoryName) return Package;
  const lowerCategory = categoryName.toLowerCase();
  
  if (lowerCategory.includes('телефон') || lowerCategory.includes('смартфон') || lowerCategory.includes('iphone')) return Smartphone;
  if (lowerCategory.includes('наушник') || lowerCategory.includes('airpods')) return Headphones;
  if (lowerCategory.includes('часы') || lowerCategory.includes('watch')) return Watch;
  if (lowerCategory.includes('планшет') || lowerCategory.includes('ipad')) return Tablet;
  if (lowerCategory.includes('процессор') || lowerCategory.includes('чип')) return Cpu;
  if (lowerCategory.includes('монитор') || lowerCategory.includes('экран') || lowerCategory.includes('дисплей')) return Monitor;
  if (lowerCategory.includes('камер') || lowerCategory.includes('фото')) return Camera;
  if (lowerCategory.includes('игр') || lowerCategory.includes('game')) return Gamepad2;
  if (lowerCategory.includes('колонк') || lowerCategory.includes('динамик') || lowerCategory.includes('speaker')) return Speaker;
  if (lowerCategory.includes('кабел') || lowerCategory.includes('провод') || lowerCategory.includes('шнур')) return Cable;
  if (lowerCategory.includes('аккумулятор') || lowerCategory.includes('батаре')) return Battery;
  if (lowerCategory.includes('заряд') || lowerCategory.includes('питан') || lowerCategory.includes('адаптер')) return Zap;
  
  return Package;
};

// Status configuration
const statusConfig = {
  pending: { 
    label: 'Ожидает подтверждения', 
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: Clock 
  },
  accepted: { 
    label: 'Принят в работу', 
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    icon: CheckCircle2 
  },
  ready: { 
    label: 'Готов к выдаче', 
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: Truck 
  },
  completed: { 
    label: 'Выдан', 
    color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    icon: CheckCircle2 
  },
  cancelled: { 
    label: 'Отменён', 
    color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    icon: XCircle 
  }
};

export const TelegramShop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [activeFilter, setActiveFilter] = useState<FilterType>("available");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { toast } = useToast();

  // Fetch user orders
  const fetchUserOrders = useCallback(async (telegramUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('telegram_user_id', telegramUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserOrders((data as Order[]) || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, []);

  useEffect(() => {
    // Initialize Telegram WebApp
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
  }, [fetchUserOrders]);

  // Real-time order status updates
  useEffect(() => {
    if (!telegramUser?.id) return;

    const channel = supabase
      .channel('order-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `telegram_user_id=eq.${telegramUser.id}`
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          setUserOrders(prev => 
            prev.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            )
          );
          
          // Show toast notification
          const status = statusConfig[updatedOrder.status as keyof typeof statusConfig];
          if (status) {
            toast({
              title: "Статус заказа обновлён",
              description: `Заказ #${updatedOrder.id.slice(0, 8)}: ${status.label}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [telegramUser?.id, toast]);

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
      const uniqueCategories = [...new Set(data?.map(p => p.category_name).filter(Boolean) as string[])];
      setCategories(uniqueCategories);
    }
    setLoading(false);
  };

  const toggleFavorite = (productId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
    localStorage.setItem("telegramFavorites", JSON.stringify([...newFavorites]));
  };

  const addToCart = (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const existingItem = cart.find((item) => item.id === product.id);
    let newCart: CartItem[];
    
    if (existingItem) {
      if (existingItem.cartQuantity >= product.quantity) {
        toast({
          title: "Недостаточно товара",
          description: "Достигнуто максимальное количество",
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
        variant: "destructive",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Требуется согласие",
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
        title: "Заказ оформлен!",
        description: "Мы свяжемся с вами в ближайшее время",
      });

      setCart([]);
      localStorage.removeItem("telegramCart");
      setPhoneNumber("");
      setAgreedToTerms(false);
      setIsCheckoutOpen(false);
      
      if (telegramUser) {
        fetchUserOrders(telegramUser.id.toString());
      }
    } catch (error) {
      console.error("Error sending order:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заказ",
        variant: "destructive",
      });
    }
  };

  // Product Card Component
  const ProductCard = ({ product }: { product: Product }) => {
    const CategoryIcon = getCategoryIcon(product.category_name);
    
    return (
      <Card 
        className="overflow-hidden border-0 shadow-sm bg-card animate-fade-in cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setSelectedProduct(product)}
      >
        <div className="relative aspect-square bg-muted/30">
          {product.photo_url ? (
            <img
              src={product.photo_url}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
              <CategoryIcon className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
          <button
            onClick={(e) => toggleFavorite(product.id, e)}
            className="absolute top-2 right-2 p-2 bg-background/90 backdrop-blur-sm rounded-full shadow-lg transition-all active:scale-90"
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
            <Badge className="absolute bottom-2 left-2 bg-amber-500 text-white text-xs">
              Осталось {product.quantity}
            </Badge>
          )}
        </div>
        
        <div className="p-3 space-y-2">
          <h3 className="font-medium text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
            {product.name}
          </h3>
          
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1">
              <p className="text-lg font-bold">
                {product.retail_price?.toLocaleString()} ₽
              </p>
            </div>
            <Button
              onClick={(e) => addToCart(product, e)}
              disabled={product.quantity === 0}
              size="icon"
              className="h-9 w-9 rounded-full shrink-0"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b">
        <div className="px-4 py-3 space-y-3">
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg">
              Д
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Доктор Гаджет</h1>
              <p className="text-xs text-muted-foreground">Маркет</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeFilter === "available" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveFilter("available")}
              className="flex-1 rounded-full h-9"
            >
              В наличии
            </Button>
            <Button
              variant={activeFilter === "all" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="flex-1 rounded-full h-9"
            >
              Все товары
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
              className="pl-10 rounded-full bg-muted/50 border-0 h-10"
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className="rounded-full whitespace-nowrap shrink-0 h-8"
            >
              Все
            </Button>
            {categories.map((category) => {
              const CategoryIcon = getCategoryIcon(category);
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="rounded-full whitespace-nowrap shrink-0 h-8 gap-1.5"
                >
                  <CategoryIcon className="h-3.5 w-3.5" />
                  {category}
                </Button>
              );
            })}
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
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-1">
                {activeTab === "favorites" ? "Избранное" : "Каталог"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'товар' : filteredProducts.length < 5 ? 'товара' : 'товаров'}
              </p>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Товары не найдены</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden">
          {selectedProduct && (
            <>
              <div className="relative aspect-square bg-muted">
                {selectedProduct.photo_url ? (
                  <img
                    src={selectedProduct.photo_url}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                    {(() => {
                      const CategoryIcon = getCategoryIcon(selectedProduct.category_name);
                      return <CategoryIcon className="h-24 w-24 text-muted-foreground/30" />;
                    })()}
                  </div>
                )}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 left-4 p-2 bg-background/90 backdrop-blur-sm rounded-full"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => toggleFavorite(selectedProduct.id, e)}
                  className="absolute top-4 right-4 p-2 bg-background/90 backdrop-blur-sm rounded-full"
                >
                  <Heart
                    className={`h-5 w-5 ${
                      favorites.has(selectedProduct.id)
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              </div>
              <div className="p-4 space-y-4 overflow-y-auto max-h-[40vh]">
                {selectedProduct.category_name && (
                  <Badge variant="secondary" className="rounded-full">
                    {selectedProduct.category_name}
                  </Badge>
                )}
                <h2 className="text-xl font-bold">{selectedProduct.name}</h2>
                
                {selectedProduct.description && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground">Описание</h3>
                    <p className="text-sm leading-relaxed">{selectedProduct.description}</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-2xl font-bold">
                      {selectedProduct.retail_price?.toLocaleString()} ₽
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProduct.quantity > 0 
                        ? `В наличии: ${selectedProduct.quantity} шт.` 
                        : 'Нет в наличии'}
                    </p>
                  </div>
                  <Button
                    onClick={(e) => {
                      addToCart(selectedProduct, e);
                      setSelectedProduct(null);
                    }}
                    disabled={selectedProduct.quantity === 0}
                    size="lg"
                    className="rounded-full px-6"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    В корзину
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
              <div className="text-center py-12 animate-fade-in">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Корзина пуста</p>
              </div>
            ) : (
              cart.map((item) => {
                const CategoryIcon = getCategoryIcon(item.category_name);
                return (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 rounded-2xl border bg-card animate-fade-in"
                  >
                    {item.photo_url ? (
                      <img
                        src={item.photo_url}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-xl shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl shrink-0 bg-muted flex items-center justify-center">
                        <CategoryIcon className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2 min-w-0">
                      <h4 className="font-semibold text-sm line-clamp-2">{item.name}</h4>
                      <p className="text-base font-bold text-primary">
                        {item.retail_price?.toLocaleString()} ₽
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                          className="h-8 w-8 p-0 rounded-full"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.cartQuantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                          className="h-8 w-8 p-0 rounded-full"
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.id)}
                          className="ml-auto text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
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

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-muted/30">
                    <div className="text-lg font-bold">{userOrders.length}</div>
                    <div className="text-[10px] text-muted-foreground">заказов</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30">
                    <div className="text-lg font-bold">{favorites.size}</div>
                    <div className="text-[10px] text-muted-foreground">избранное</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30">
                    <div className="text-lg font-bold">{cart.length}</div>
                    <div className="text-[10px] text-muted-foreground">в корзине</div>
                  </div>
                </div>

                {/* Orders History */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-base">Мои заказы</h3>
                  {userOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">У вас пока нет заказов</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userOrders.map((order) => {
                        const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
                        const StatusIcon = status.icon;
                        
                        return (
                          <Card 
                            key={order.id} 
                            className="p-4 border cursor-pointer hover:bg-muted/30 transition-colors animate-fade-in"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="text-sm font-semibold">Заказ #{order.id.slice(0, 8)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(order.created_at).toLocaleDateString('ru-RU', {
                                    day: 'numeric',
                                    month: 'long',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <Badge variant="outline" className={`${status.color} gap-1`}>
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="text-xs text-muted-foreground">
                                {order.items.length} {order.items.length === 1 ? 'товар' : 'товаров'}
                              </p>
                              <p className="font-bold">
                                {Number(order.total_amount).toLocaleString()} ₽
                              </p>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 animate-fade-in">
                <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">
                  Откройте приложение через Telegram для авторизации
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          {selectedOrder && (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Заказ #{selectedOrder.id.slice(0, 8)}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4 -mx-6 px-6">
                {/* Status */}
                {(() => {
                  const status = statusConfig[selectedOrder.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <div className={`p-4 rounded-2xl border ${status.color}`}>
                      <div className="flex items-center gap-3">
                        <StatusIcon className="h-8 w-8" />
                        <div>
                          <p className="font-semibold">{status.label}</p>
                          <p className="text-xs opacity-70">
                            {new Date(selectedOrder.created_at).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Order Items */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    Состав заказа
                  </h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.price?.toLocaleString()} ₽ × {item.quantity} шт.</p>
                        </div>
                        <p className="font-semibold">
                          {((item.price || 0) * item.quantity).toLocaleString()} ₽
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Контактные данные</h3>
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-sm">📞 {selectedOrder.phone_number}</p>
                  </div>
                </div>

                {/* Total */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Итого:</span>
                    <span className="text-2xl font-bold text-primary">
                      {Number(selectedOrder.total_amount).toLocaleString()} ₽
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
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
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.name} <span className="font-medium">×{item.cartQuantity}</span>
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
                Я согласен на обработку персональных данных в соответствии с ФЗ №152-ФЗ
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
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t safe-area-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
              activeTab === "all" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground"
            }`}
          >
            <Home className={`h-5 w-5 transition-transform ${activeTab === "all" ? "scale-110" : ""}`} />
            <span className="text-[10px] font-medium">Маркет</span>
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
              activeTab === "favorites" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground"
            }`}
          >
            <Heart className={`h-5 w-5 transition-transform ${activeTab === "favorites" ? "scale-110 fill-current" : ""}`} />
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
                : "text-muted-foreground"
            }`}
          >
            <div className="relative">
              <ShoppingCart className={`h-5 w-5 transition-transform ${activeTab === "cart" ? "scale-110" : ""}`} />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold animate-scale-in">
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
                : "text-muted-foreground"
            }`}
          >
            <User className={`h-5 w-5 transition-transform ${activeTab === "profile" ? "scale-110" : ""}`} />
            <span className="text-[10px] font-medium">Профиль</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TelegramShop;
