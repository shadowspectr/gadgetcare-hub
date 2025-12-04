import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, Package, ChevronLeft, X, Clock, CheckCircle2, Truck, XCircle, 
  Info, MessageCircle, Send, KeyRound, Heart, ShoppingCart, User, ChevronDown
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ProductCard, getCategoryIcon } from "@/components/telegram/ProductCard";
import { ProductGridSkeleton } from "@/components/telegram/ProductSkeleton";
import { TelegramHeader } from "@/components/telegram/TelegramHeader";
import { BottomNav } from "@/components/telegram/BottomNav";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
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
        themeParams: { bg_color?: string; text_color?: string };
        colorScheme: 'light' | 'dark';
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

type CartItem = Product & { cartQuantity: number };
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

const statusConfig = {
  pending: { label: 'Ожидает подтверждения', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock },
  accepted: { label: 'Принят в работу', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: CheckCircle2 },
  ready: { label: 'Готов к выдаче', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: Truck },
  completed: { label: 'Выдан', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20', icon: CheckCircle2 },
  cancelled: { label: 'Отменён', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle }
};

const PAGE_SIZE = 50;

export const TelegramShop = () => {
  // Products state with pagination
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const pageRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // UI state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [activeFilter, setActiveFilter] = useState<FilterType>("available");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Dialog state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Checkout state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Telegram state
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  
  // Auth state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authStep, setAuthStep] = useState<'phone' | 'code'>('phone');
  const [authPhone, setAuthPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const { toast } = useToast();

  // Load products with pagination
  const loadProducts = useCallback(async (page: number, append = false) => {
    if (page === 0) setLoading(true);
    else setLoadingMore(true);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from("products")
      .select("id, name, description, retail_price, quantity, photo_url, category_name", { count: page === 0 ? "exact" : undefined })
      .eq("is_visible", true)
      .order("category_name")
      .order("name")
      .range(from, to);

    if (error) {
      toast({ title: "Ошибка загрузки", variant: "destructive" });
    } else {
      if (page === 0 && count !== null) setTotalCount(count);
      
      const newProducts = data || [];
      if (newProducts.length < PAGE_SIZE) setHasMore(false);
      
      if (append) {
        setProducts(prev => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }
    }

    setLoading(false);
    setLoadingMore(false);
  }, [toast]);

  // Load categories
  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("category_name")
      .eq("is_visible", true)
      .not("category_name", "is", null);
    
    const unique = [...new Set(data?.map(p => p.category_name).filter(Boolean) as string[])];
    setCategories(unique);
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          pageRef.current += 1;
          loadProducts(pageRef.current, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loading, loadProducts]);

  // Initialize
  useEffect(() => {
    // Telegram init
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setTelegramUser(user);
        // Check verified
        const saved = localStorage.getItem('telegram_verified');
        if (saved === user.id.toString()) setIsVerified(true);
        // Load orders
        supabase.from('orders').select('*').eq('telegram_user_id', user.id.toString())
          .order('created_at', { ascending: false })
          .then(({ data }) => setUserOrders((data as Order[]) || []));
      }
    }

    // Load data
    loadProducts(0);
    loadCategories();

    // Load from localStorage
    const savedFav = localStorage.getItem("telegramFavorites");
    if (savedFav) setFavorites(new Set(JSON.parse(savedFav)));
    const savedCart = localStorage.getItem("telegramCart");
    if (savedCart) setCart(JSON.parse(savedCart));
  }, [loadProducts, loadCategories]);

  // Realtime order updates
  useEffect(() => {
    if (!telegramUser?.id) return;
    const channel = supabase
      .channel('order-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `telegram_user_id=eq.${telegramUser.id}`
      }, (payload) => {
        const updated = payload.new as Order;
        setUserOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
        const status = statusConfig[updated.status as keyof typeof statusConfig];
        if (status) toast({ title: "Статус обновлён", description: status.label });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [telegramUser?.id, toast]);

  // Filtered products (memoized)
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = activeFilter === "all" || p.quantity > 0;
      const matchCategory = selectedCategory === "all" || p.category_name === selectedCategory;
      const matchFavorites = activeTab !== "favorites" || favorites.has(p.id);
      return matchSearch && matchFilter && matchCategory && matchFavorites;
    });
  }, [products, searchQuery, activeFilter, selectedCategory, activeTab, favorites]);

  const totalPrice = cart.reduce((sum, item) => sum + (item.retail_price || 0) * item.cartQuantity, 0);

  // Cart actions
  const toggleFavorite = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("telegramFavorites", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const addToCart = useCallback((product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      let next: CartItem[];
      if (existing) {
        if (existing.cartQuantity >= product.quantity) {
          toast({ title: "Максимум достигнут", variant: "destructive" });
          return prev;
        }
        next = prev.map(i => i.id === product.id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i);
      } else {
        next = [...prev, { ...product, cartQuantity: 1 }];
      }
      localStorage.setItem("telegramCart", JSON.stringify(next));
      toast({ title: "Добавлено", description: product.name });
      return next;
    });
  }, [toast]);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => {
      const next = prev.filter(i => i.id !== id);
      localStorage.setItem("telegramCart", JSON.stringify(next));
      return next;
    });
  }, []);

  const updateCartQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) return removeFromCart(id);
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (item && qty > item.quantity) {
        toast({ title: "Недостаточно товара", variant: "destructive" });
        return prev;
      }
      const next = prev.map(i => i.id === id ? { ...i, cartQuantity: qty } : i);
      localStorage.setItem("telegramCart", JSON.stringify(next));
      return next;
    });
  }, [removeFromCart, toast]);

  // Checkout
  const handleCheckout = async () => {
    if (!phoneNumber.trim() || !agreedToTerms) {
      toast({ title: !phoneNumber.trim() ? "Укажите телефон" : "Требуется согласие", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-telegram-order', {
        body: {
          user: telegramUser,
          phoneNumber,
          items: cart.map(i => ({ id: i.id, name: i.name, price: i.retail_price, quantity: i.cartQuantity })),
          total: totalPrice,
          timestamp: new Date().toISOString(),
        },
      });
      if (error) throw error;
      
      toast({ title: "Заказ оформлен!", description: "Мы свяжемся с вами" });
      setCart([]);
      localStorage.removeItem("telegramCart");
      setPhoneNumber("");
      setAgreedToTerms(false);
      setIsCheckoutOpen(false);
      
      if (telegramUser) {
        const { data } = await supabase.from('orders').select('*')
          .eq('telegram_user_id', telegramUser.id.toString())
          .order('created_at', { ascending: false });
        setUserOrders((data as Order[]) || []);
      }
    } catch (error) {
      toast({ title: "Ошибка отправки", variant: "destructive" });
    }
  };

  // Auth functions
  const sendVerificationCode = async () => {
    if (!telegramUser?.id) return;
    setIsAuthLoading(true);
    try {
      await supabase.functions.invoke('telegram-auth', {
        body: { action: 'send_code', telegramUserId: telegramUser.id, phone: authPhone }
      });
      toast({ title: "Код отправлен" });
      setAuthStep('code');
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!telegramUser?.id || !verificationCode) return;
    setIsAuthLoading(true);
    try {
      const { data } = await supabase.functions.invoke('telegram-auth', {
        body: { action: 'verify_code', telegramUserId: telegramUser.id, code: verificationCode }
      });
      if (data?.success) {
        setIsVerified(true);
        setIsAuthOpen(false);
        toast({ title: "Авторизация успешна!" });
        localStorage.setItem('telegram_verified', telegramUser.id.toString());
      } else {
        toast({ title: "Неверный код", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Chat functions
  const loadChatMessages = async (orderId?: string) => {
    if (!telegramUser?.id) return;
    const { data } = await supabase.functions.invoke('telegram-chat', {
      body: { action: 'get_messages', telegramUserId: telegramUser.id, orderId }
    });
    setChatMessages(data?.messages || []);
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !telegramUser?.id) return;
    setIsChatLoading(true);
    try {
      await supabase.functions.invoke('telegram-chat', {
        body: {
          action: 'send_message',
          telegramUserId: telegramUser.id,
          telegramUsername: telegramUser.username,
          firstName: telegramUser.first_name,
          message: chatMessage,
          orderId: selectedOrder?.id
        }
      });
      setChatMessages(prev => [...prev, { message: chatMessage, is_from_manager: false, created_at: new Date().toISOString() }]);
      setChatMessage("");
    } catch (error) {
      toast({ title: "Ошибка отправки", variant: "destructive" });
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-24">
      <TelegramHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        totalCount={totalCount}
      />

      {/* Products Grid */}
      <div className="px-4 py-4">
        {loading ? (
          <ProductGridSkeleton count={6} />
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-bold">
                {activeTab === "favorites" ? "Избранное" : "Каталог"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length} товаров
              </p>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Товары не найдены</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((product, idx) => (
                  <div key={product.id} style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }} className="animate-fade-in">
                    <ProductCard
                      product={product}
                      isFavorite={favorites.has(product.id)}
                      onToggleFavorite={toggleFavorite}
                      onAddToCart={addToCart}
                      onSelect={setSelectedProduct}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Load more trigger */}
            <div ref={loadMoreRef} className="py-8 flex justify-center">
              {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
              {hasMore && !loadingMore && filteredProducts.length > 0 && (
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <ChevronDown className="h-4 w-4" /> Загрузить ещё
                </Button>
              )}
            </div>
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
                  <img src={selectedProduct.photo_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {(() => { const Icon = getCategoryIcon(selectedProduct.category_name); return <Icon className="h-24 w-24 text-muted-foreground/30" />; })()}
                  </div>
                )}
                <button onClick={() => setSelectedProduct(null)} className="absolute top-4 left-4 p-2 bg-background/90 backdrop-blur-sm rounded-full">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={(e) => toggleFavorite(selectedProduct.id, e)} className="absolute top-4 right-4 p-2 bg-background/90 backdrop-blur-sm rounded-full">
                  <Heart className={`h-5 w-5 ${favorites.has(selectedProduct.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                </button>
              </div>
              <div className="p-4 space-y-4 overflow-y-auto max-h-[40vh]">
                {selectedProduct.category_name && <Badge variant="secondary">{selectedProduct.category_name}</Badge>}
                <h2 className="text-xl font-bold">{selectedProduct.name}</h2>
                {selectedProduct.description && <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-2xl font-bold">{selectedProduct.retail_price?.toLocaleString('ru-RU')} ₽</p>
                    <p className="text-sm text-muted-foreground">{selectedProduct.quantity > 0 ? `В наличии: ${selectedProduct.quantity}` : 'Нет в наличии'}</p>
                  </div>
                  <Button onClick={(e) => { addToCart(selectedProduct, e); setSelectedProduct(null); }} disabled={selectedProduct.quantity === 0} size="lg" className="rounded-full px-6">
                    <ShoppingCart className="h-4 w-4 mr-2" /> В корзину
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
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" /> Корзина
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Корзина пуста</p>
              </div>
            ) : cart.map(item => {
              const Icon = getCategoryIcon(item.category_name);
              return (
                <div key={item.id} className="flex gap-3 p-3 rounded-2xl border bg-card">
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.name} className="w-20 h-20 object-cover rounded-xl" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center"><Icon className="h-8 w-8 text-muted-foreground/40" /></div>
                  )}
                  <div className="flex-1 space-y-2">
                    <h4 className="font-semibold text-sm line-clamp-2">{item.name}</h4>
                    <p className="text-base font-bold text-primary">{item.retail_price?.toLocaleString('ru-RU')} ₽</p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateCartQty(item.id, item.cartQuantity - 1)} className="h-8 w-8 p-0 rounded-full">-</Button>
                      <span className="w-8 text-center">{item.cartQuantity}</span>
                      <Button size="sm" variant="outline" onClick={() => updateCartQty(item.id, item.cartQuantity + 1)} className="h-8 w-8 p-0 rounded-full">+</Button>
                      <Button size="sm" variant="ghost" onClick={() => removeFromCart(item.id)} className="ml-auto text-destructive h-8 w-8 p-0"><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {cart.length > 0 && (
            <div className="pt-4 border-t space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span>Итого:</span>
                <span className="font-bold text-xl text-primary">{totalPrice.toLocaleString('ru-RU')} ₽</span>
              </div>
              <Button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full h-12 rounded-full">
                Оформить заказ
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Профиль</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            {telegramUser ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg">
                    {telegramUser.first_name?.[0] || 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{telegramUser.first_name} {telegramUser.last_name || ''}</h3>
                      {isVerified && <Badge className="bg-green-500/10 text-green-600 border-green-500/20">✓</Badge>}
                    </div>
                    {telegramUser.username && <p className="text-sm text-muted-foreground">@{telegramUser.username}</p>}
                  </div>
                </div>
                {!isVerified && (
                  <Button onClick={() => setIsAuthOpen(true)} variant="outline" className="w-full rounded-full gap-2">
                    <KeyRound className="h-4 w-4" /> Подтвердить аккаунт
                  </Button>
                )}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-muted/30"><div className="text-lg font-bold">{userOrders.length}</div><div className="text-[10px] text-muted-foreground">заказов</div></div>
                  <div className="p-3 rounded-xl bg-muted/30"><div className="text-lg font-bold">{favorites.size}</div><div className="text-[10px] text-muted-foreground">избранное</div></div>
                  <div className="p-3 rounded-xl bg-muted/30"><div className="text-lg font-bold">{cart.length}</div><div className="text-[10px] text-muted-foreground">в корзине</div></div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Мои заказы</h3>
                  {userOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground"><Package className="h-12 w-12 mx-auto mb-2 opacity-30" /><p className="text-sm">Нет заказов</p></div>
                  ) : userOrders.map(order => {
                    const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    return (
                      <Card key={order.id} className="p-4 border cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedOrder(order)}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-semibold">#{order.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
                          </div>
                          <Badge variant="outline" className={`${status.color} gap-1`}><StatusIcon className="h-3 w-3" />{status.label}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">{order.items.length} товаров</p>
                          <p className="font-bold">{Number(order.total_amount).toLocaleString('ru-RU')} ₽</p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Откройте через Telegram</p>
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
              <DialogHeader><DialogTitle>Заказ #{selectedOrder.id.slice(0, 8)}</DialogTitle></DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4">
                {(() => {
                  const status = statusConfig[selectedOrder.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <div className={`p-4 rounded-2xl border ${status.color}`}>
                      <div className="flex items-center gap-3">
                        <StatusIcon className="h-8 w-8" />
                        <div>
                          <p className="font-semibold">{status.label}</p>
                          <p className="text-xs opacity-70">{new Date(selectedOrder.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2"><Info className="h-4 w-4" /> Состав</h3>
                  {selectedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between p-3 rounded-xl bg-muted/30">
                      <div><p className="font-medium text-sm">{item.name}</p><p className="text-xs text-muted-foreground">{item.price?.toLocaleString('ru-RU')} ₽ × {item.quantity}</p></div>
                      <p className="font-semibold">{((item.price || 0) * item.quantity).toLocaleString('ru-RU')} ₽</p>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t flex justify-between items-center">
                  <span>Итого:</span>
                  <span className="text-2xl font-bold text-primary">{Number(selectedOrder.total_amount).toLocaleString('ru-RU')} ₽</span>
                </div>
                <Button onClick={() => { loadChatMessages(selectedOrder.id); setIsChatOpen(true); }} variant="outline" className="w-full rounded-full gap-2">
                  <MessageCircle className="h-4 w-4" /> Связаться с менеджером
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Оформление заказа</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Номер телефона *</Label>
              <Input type="tel" placeholder="+7 (999) 123-45-67" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
              <p className="font-semibold text-sm">Состав заказа:</p>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name} ×{item.cartQuantity}</span>
                    <span className="font-medium">{(item.retail_price * item.cartQuantity).toLocaleString('ru-RU')} ₽</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t flex justify-between"><span className="font-semibold">Итого:</span><span className="font-bold text-xl text-primary">{totalPrice.toLocaleString('ru-RU')} ₽</span></div>
            </div>
            <div className="flex items-start space-x-3 p-4 rounded-xl bg-muted/20">
              <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(c) => setAgreedToTerms(c as boolean)} />
              <Label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer">Согласен на обработку персональных данных (ФЗ №152-ФЗ)</Label>
            </div>
            <Button onClick={handleCheckout} className="w-full h-12 rounded-full" disabled={!phoneNumber.trim() || !agreedToTerms}>Подтвердить заказ</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Dialog */}
      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Авторизация</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {authStep === 'phone' ? (
              <>
                <div className="space-y-2">
                  <Label>Номер телефона (опционально)</Label>
                  <Input type="tel" placeholder="+7 (999) 123-45-67" value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <p className="text-xs text-muted-foreground">Код будет отправлен в Telegram</p>
                <Button onClick={sendVerificationCode} disabled={isAuthLoading} className="w-full h-12 rounded-full">
                  {isAuthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Получить код"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Код подтверждения</Label>
                  <Input type="text" placeholder="123456" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} className="h-12 rounded-xl text-center text-2xl tracking-widest" maxLength={6} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAuthStep('phone')} className="flex-1 rounded-full">Назад</Button>
                  <Button onClick={verifyCode} disabled={isAuthLoading || verificationCode.length !== 6} className="flex-1 rounded-full">
                    {isAuthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Подтвердить"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /> Чат с менеджером</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
            {chatMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" /><p className="text-sm">Начните диалог</p></div>
            ) : chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.is_from_manager ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl ${msg.is_from_manager ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-[10px] opacity-70 mt-1">{new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t">
            <div className="flex gap-2">
              <Textarea placeholder="Напишите..." value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} className="min-h-[44px] max-h-[100px] rounded-xl resize-none" rows={1} />
              <Button onClick={sendChatMessage} disabled={!chatMessage.trim() || isChatLoading} size="icon" className="h-11 w-11 rounded-full">
                {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cartCount={cart.length}
        favoritesCount={favorites.size}
        onCartClick={() => setIsCartOpen(true)}
        onProfileClick={() => setIsProfileOpen(true)}
      />
    </div>
  );
};

export default TelegramShop;
