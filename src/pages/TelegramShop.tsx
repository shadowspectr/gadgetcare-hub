import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, Package, ChevronLeft, X, Clock, CheckCircle2, Truck, XCircle, 
  Info, MessageCircle, Send, KeyRound, ShoppingCart, User, ChevronDown,
  Plus, Minus, Phone, Check, ArrowLeft, Heart
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ProductCard, getCategoryIcon } from "@/components/telegram/ProductCard";
import { ProductGridSkeleton } from "@/components/telegram/ProductSkeleton";
import { TelegramHeader } from "@/components/telegram/TelegramHeader";
import { BottomNav } from "@/components/telegram/BottomNav";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number; first_name?: string; last_name?: string;
            username?: string; photo_url?: string;
          };
        };
        ready: () => void; expand: () => void;
        themeParams: { bg_color?: string; text_color?: string };
        colorScheme: 'light' | 'dark';
      };
    };
  }
}

type Product = {
  id: string; name: string; description: string | null;
  retail_price: number; quantity: number;
  photo_url: string | null; category_name: string | null;
};

type CartItem = Product & { cartQuantity: number };
type TabType = "all" | "favorites" | "cart" | "profile";
type FilterType = "all" | "available";

interface Order {
  id: string; items: any; total_amount: number;
  status: string; created_at: string; phone_number: string;
}

const statusConfig = {
  pending: { label: 'Ожидает', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', icon: Clock },
  accepted: { label: 'Принят', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', icon: CheckCircle2 },
  ready: { label: 'Готов', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', icon: Truck },
  completed: { label: 'Выдан', color: 'bg-muted text-muted-foreground border-border', icon: CheckCircle2 },
  cancelled: { label: 'Отменён', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle }
};

const PAGE_SIZE = 100;
const MIN_VISIBLE_FOR_SCROLL = 20;

export const TelegramShop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const pageRef = useRef(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [activeFilter, setActiveFilter] = useState<FilterType>("available");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authStep, setAuthStep] = useState<'phone' | 'code'>('phone');
  const [authPhone, setAuthPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const { toast } = useToast();
  const { requestPermission } = useOrderNotifications(telegramUser?.id);

  const loadProducts = useCallback(async (page: number, append = false) => {
    if (page === 0) setLoading(true); else setLoadingMore(true);
    const from = page * PAGE_SIZE;
    const { data, error, count } = await supabase
      .from("products")
      .select("id, name, description, retail_price, quantity, photo_url, category_name", { count: page === 0 ? "exact" : undefined })
      .eq("is_visible", true).order("category_name").order("name").range(from, from + PAGE_SIZE - 1);

    if (error) { toast({ title: "Ошибка загрузки", variant: "destructive" }); }
    else {
      if (page === 0 && count !== null) setTotalCount(count);
      const np = data || [];
      if (np.length < PAGE_SIZE) setHasMore(false);
      if (append) setProducts(prev => [...prev, ...np]); else setProducts(np);
      return np.length;
    }
    setLoading(false); setLoadingMore(false); return 0;
  }, [toast]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    pageRef.current += 1;
    await loadProducts(pageRef.current, true);
    setLoadingMore(false); setLoading(false);
  }, [loadProducts, loadingMore, hasMore]);

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from("products").select("category_name").eq("is_visible", true).not("category_name", "is", null);
    setCategories([...new Set(data?.map(p => p.category_name).filter(Boolean) as string[])]);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) loadMore(); },
      { threshold: 0.1, rootMargin: '100px' }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready(); tg.expand();
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setTelegramUser(user);
        const saved = localStorage.getItem('telegram_verified');
        if (saved === user.id.toString()) setIsVerified(true);
        supabase.from('orders').select('*').eq('telegram_user_id', user.id.toString())
          .order('created_at', { ascending: false })
          .then(({ data }) => setUserOrders((data as Order[]) || []));
      }
    }
    loadProducts(0); loadCategories();
    const savedFav = localStorage.getItem("telegramFavorites");
    if (savedFav) setFavorites(new Set(JSON.parse(savedFav)));
    const savedCart = localStorage.getItem("telegramCart");
    if (savedCart) setCart(JSON.parse(savedCart));
  }, [loadProducts, loadCategories]);

  useEffect(() => {
    if (!telegramUser?.id) return;
    const channel = supabase.channel('order-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `telegram_user_id=eq.${telegramUser.id}` },
        (payload) => {
          const updated = payload.new as Order;
          setUserOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
          const status = statusConfig[updated.status as keyof typeof statusConfig];
          if (status) toast({ title: "Статус обновлён", description: status.label });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [telegramUser?.id, toast]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = activeFilter === "all" || p.quantity > 0;
      const matchCategory = selectedCategory === "all" || p.category_name === selectedCategory;
      const matchFavorites = activeTab !== "favorites" || favorites.has(p.id);
      return matchSearch && matchFilter && matchCategory && matchFavorites;
    });
  }, [products, searchQuery, activeFilter, selectedCategory, activeTab, favorites]);

  useEffect(() => {
    if (!loading && !loadingMore && hasMore && filteredProducts.length < MIN_VISIBLE_FOR_SCROLL && products.length < totalCount) loadMore();
  }, [filteredProducts.length, loading, loadingMore, hasMore, products.length, totalCount, loadMore]);

  const totalPrice = cart.reduce((sum, i) => sum + (i.retail_price || 0) * i.cartQuantity, 0);

  const toggleFavorite = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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
        if (existing.cartQuantity >= product.quantity) { toast({ title: "Максимум", variant: "destructive" }); return prev; }
        next = prev.map(i => i.id === product.id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i);
      } else { next = [...prev, { ...product, cartQuantity: 1 }]; }
      localStorage.setItem("telegramCart", JSON.stringify(next));
      toast({ title: "Добавлено", description: product.name });
      return next;
    });
  }, [toast]);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => { const next = prev.filter(i => i.id !== id); localStorage.setItem("telegramCart", JSON.stringify(next)); return next; });
  }, []);

  const updateCartQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) return removeFromCart(id);
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (item && qty > item.quantity) { toast({ title: "Недостаточно", variant: "destructive" }); return prev; }
      const next = prev.map(i => i.id === id ? { ...i, cartQuantity: qty } : i);
      localStorage.setItem("telegramCart", JSON.stringify(next));
      return next;
    });
  }, [removeFromCart, toast]);

  const handleCheckout = async () => {
    if (!phoneNumber.trim() || !agreedToTerms) {
      toast({ title: !phoneNumber.trim() ? "Укажите телефон" : "Требуется согласие", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('send-telegram-order', {
        body: { user: telegramUser, phoneNumber, items: cart.map(i => ({ id: i.id, name: i.name, price: i.retail_price, quantity: i.cartQuantity })), total: totalPrice, timestamp: new Date().toISOString() },
      });
      if (error) throw error;
      toast({ title: "Заказ оформлен!" });
      setCart([]); localStorage.removeItem("telegramCart");
      setPhoneNumber(""); setAgreedToTerms(false); setIsCheckoutOpen(false);
      if (telegramUser) {
        const { data } = await supabase.from('orders').select('*').eq('telegram_user_id', telegramUser.id.toString()).order('created_at', { ascending: false });
        setUserOrders((data as Order[]) || []);
      }
    } catch { toast({ title: "Ошибка", variant: "destructive" }); }
  };

  const sendVerificationCode = async () => {
    if (!telegramUser?.id) return;
    setIsAuthLoading(true);
    try {
      await supabase.functions.invoke('telegram-auth', { body: { action: 'send_code', telegramUserId: telegramUser.id, phone: authPhone } });
      toast({ title: "Код отправлен" }); setAuthStep('code');
    } catch (e: any) { toast({ title: "Ошибка", description: e.message, variant: "destructive" }); }
    finally { setIsAuthLoading(false); }
  };

  const verifyCode = async () => {
    if (!telegramUser?.id || !verificationCode) return;
    setIsAuthLoading(true);
    try {
      const { data } = await supabase.functions.invoke('telegram-auth', { body: { action: 'verify_code', telegramUserId: telegramUser.id, code: verificationCode } });
      if (data?.success) { setIsVerified(true); setIsAuthOpen(false); toast({ title: "Авторизация успешна!" }); localStorage.setItem('telegram_verified', telegramUser.id.toString()); }
      else toast({ title: "Неверный код", variant: "destructive" });
    } catch { toast({ title: "Ошибка", variant: "destructive" }); }
    finally { setIsAuthLoading(false); }
  };

  const loadChatMessages = async (orderId?: string) => {
    if (!telegramUser?.id) return;
    const { data } = await supabase.functions.invoke('telegram-chat', { body: { action: 'get_messages', telegramUserId: telegramUser.id, orderId } });
    setChatMessages(data?.messages || []);
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !telegramUser?.id) return;
    setIsChatLoading(true);
    try {
      await supabase.functions.invoke('telegram-chat', {
        body: { action: 'send_message', telegramUserId: telegramUser.id, telegramUsername: telegramUser.username, firstName: telegramUser.first_name, message: chatMessage, orderId: selectedOrder?.id }
      });
      setChatMessages(prev => [...prev, { message: chatMessage, is_from_manager: false, created_at: new Date().toISOString() }]);
      setChatMessage("");
    } catch { toast({ title: "Ошибка", variant: "destructive" }); }
    finally { setIsChatLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TelegramHeader
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        activeFilter={activeFilter} onFilterChange={setActiveFilter}
        selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory}
        categories={categories} totalCount={totalCount}
      />

      {/* Products */}
      <div className="px-4 py-4">
        {loading ? (
          <ProductGridSkeleton count={6} />
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {activeTab === "favorites" ? "Избранное" : "Каталог"}
              </h2>
              <span className="text-[13px] text-muted-foreground">{filteredProducts.length} товаров</span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/15 mb-3" />
                <p className="text-sm text-muted-foreground">Ничего не найдено</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFavorite={favorites.has(product.id)}
                    onToggleFavorite={toggleFavorite}
                    onAddToCart={addToCart}
                    onSelect={setSelectedProduct}
                  />
                ))}
              </div>
            )}

            <div ref={loadMoreRef} className="py-6 flex justify-center">
              {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              {hasMore && !loadingMore && (
                <button onClick={loadMore} className="text-[13px] text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <ChevronDown className="h-3.5 w-3.5" /> Ещё ({products.length}/{totalCount})
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Product Detail */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden rounded-2xl">
          {selectedProduct && (
            <>
              <div className="relative aspect-square bg-muted/30">
                {selectedProduct.photo_url ? (
                  <img src={selectedProduct.photo_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {(() => { const Icon = getCategoryIcon(selectedProduct.category_name); return <Icon className="h-20 w-20 text-muted-foreground/15" />; })()}
                  </div>
                )}
                <button onClick={() => setSelectedProduct(null)} className="absolute top-3 left-3 p-2 bg-background/80 backdrop-blur-sm rounded-full">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={(e) => toggleFavorite(selectedProduct.id, e)} className="absolute top-3 right-3 p-2 bg-background/80 backdrop-blur-sm rounded-full">
                  <Heart className={`h-4 w-4 ${favorites.has(selectedProduct.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                </button>
              </div>
              <div className="p-5 space-y-3">
                {selectedProduct.category_name && (
                  <span className="text-[12px] font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">{selectedProduct.category_name}</span>
                )}
                <h2 className="text-lg font-semibold leading-snug">{selectedProduct.name}</h2>
                {selectedProduct.description && <p className="text-sm text-muted-foreground leading-relaxed">{selectedProduct.description}</p>}
                <div className="flex items-center justify-between pt-3 border-t border-border/30">
                  <div>
                    <p className="text-xl font-bold">{selectedProduct.retail_price?.toLocaleString('ru-RU')} ₽</p>
                    <p className="text-[12px] text-muted-foreground">{selectedProduct.quantity > 0 ? `В наличии: ${selectedProduct.quantity}` : 'Нет в наличии'}</p>
                  </div>
                  <Button onClick={(e) => { addToCart(selectedProduct, e); setSelectedProduct(null); }} disabled={selectedProduct.quantity === 0} className="rounded-full px-6 h-10">
                    <Plus className="h-4 w-4 mr-1.5" /> В корзину
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-[17px] font-semibold">Корзина</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/15 mb-3" />
                <p className="text-sm text-muted-foreground">Корзина пуста</p>
              </div>
            ) : cart.map(item => (
              <div key={item.id} className="flex gap-3 py-3 border-b border-border/20 last:border-0">
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.name} className="w-16 h-16 object-cover rounded-xl" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-muted/40 flex items-center justify-center">
                    {(() => { const Icon = getCategoryIcon(item.category_name); return <Icon className="h-6 w-6 text-muted-foreground/20" />; })()}
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-[13px] font-medium line-clamp-2 leading-snug">{item.name}</p>
                  <p className="text-[13px] font-semibold">{item.retail_price?.toLocaleString('ru-RU')} ₽</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateCartQty(item.id, item.cartQuantity - 1)} className="h-7 w-7 rounded-full border border-border/50 flex items-center justify-center hover:bg-muted text-[13px]">−</button>
                    <span className="w-5 text-center text-sm">{item.cartQuantity}</span>
                    <button onClick={() => updateCartQty(item.id, item.cartQuantity + 1)} className="h-7 w-7 rounded-full border border-border/50 flex items-center justify-center hover:bg-muted text-[13px]">+</button>
                    <button onClick={() => removeFromCart(item.id)} className="ml-auto p-1 text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="pt-3 border-t border-border/30 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-muted-foreground">Итого</span>
                <span className="font-bold text-lg">{totalPrice.toLocaleString('ru-RU')} ₽</span>
              </div>
              <Button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full h-11 rounded-full font-medium">
                Оформить заказ
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-[17px] font-semibold">Профиль</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-5">
            {telegramUser ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                    {telegramUser.first_name?.[0] || 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{telegramUser.first_name} {telegramUser.last_name || ''}</h3>
                      {isVerified && <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">✓</span>}
                    </div>
                    {telegramUser.username && <p className="text-[13px] text-muted-foreground">@{telegramUser.username}</p>}
                  </div>
                </div>

                {!isVerified && (
                  <button onClick={() => setIsAuthOpen(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/50 text-[13px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                    <KeyRound className="h-3.5 w-3.5" /> Подтвердить аккаунт
                  </button>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center py-3 rounded-xl bg-muted/30">
                    <div className="text-base font-bold">{userOrders.length}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">заказов</div>
                  </div>
                  <div className="text-center py-3 rounded-xl bg-muted/30">
                    <div className="text-base font-bold">{favorites.size}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">избранное</div>
                  </div>
                  <div className="text-center py-3 rounded-xl bg-muted/30">
                    <div className="text-base font-bold">{cart.length}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">в корзине</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[15px] font-semibold">Заказы</h3>
                  {userOrders.length === 0 ? (
                    <div className="text-center py-10">
                      <Package className="h-10 w-10 mx-auto text-muted-foreground/15 mb-2" />
                      <p className="text-[13px] text-muted-foreground">Нет заказов</p>
                    </div>
                  ) : userOrders.map(order => {
                    const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    return (
                      <button key={order.id} onClick={() => setSelectedOrder(order)} className="w-full text-left p-3 rounded-xl border border-border/30 hover:bg-muted/30 transition-colors space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[13px] font-semibold">#{order.id.slice(0, 8)}</p>
                            <p className="text-[11px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${status.color}`}>
                            <StatusIcon className="h-3 w-3" />{status.label}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-muted-foreground">{order.items.length} товаров</span>
                          <span className="text-[13px] font-semibold">{Number(order.total_amount).toLocaleString('ru-RU')} ₽</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <User className="h-12 w-12 mx-auto text-muted-foreground/15 mb-3" />
                <p className="text-sm text-muted-foreground">Откройте через Telegram</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col rounded-2xl">
          {selectedOrder && (
            <>
              <DialogHeader className="pb-2">
                <DialogTitle className="text-[17px] font-semibold">Заказ #{selectedOrder.id.slice(0, 8)}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4">
                {(() => {
                  const status = statusConfig[selectedOrder.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <div className={`p-4 rounded-xl border ${status.color}`}>
                      <div className="flex items-center gap-3">
                        <StatusIcon className="h-6 w-6" />
                        <div>
                          <p className="text-[13px] font-semibold">{status.label}</p>
                          <p className="text-[11px] opacity-70">{new Date(selectedOrder.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="space-y-2">
                  <h3 className="text-[13px] font-semibold flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> Состав</h3>
                  {selectedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between p-3 rounded-xl bg-muted/30 text-[13px]">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-muted-foreground">{item.price?.toLocaleString('ru-RU')} ₽ × {item.quantity}</p>
                      </div>
                      <p className="font-semibold">{((item.price || 0) * item.quantity).toLocaleString('ru-RU')} ₽</p>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-border/30 flex justify-between items-center">
                  <span className="text-[13px]">Итого</span>
                  <span className="text-xl font-bold">{Number(selectedOrder.total_amount).toLocaleString('ru-RU')} ₽</span>
                </div>
                <button onClick={() => { loadChatMessages(selectedOrder.id); setIsChatOpen(true); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-border/50 text-[13px] font-medium hover:bg-muted/50 transition-colors">
                  <MessageCircle className="h-3.5 w-3.5" /> Связаться с менеджером
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-[17px] font-semibold">Оформление</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Телефон</Label>
              <Input type="tel" placeholder="+7 (999) 123-45-67" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="rounded-xl bg-muted/30 p-4 space-y-2">
              <p className="text-[13px] font-semibold">Состав</p>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">{item.name} ×{item.cartQuantity}</span>
                    <span className="font-medium">{(item.retail_price * item.cartQuantity).toLocaleString('ru-RU')} ₽</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border/30 flex justify-between">
                <span className="text-[13px] font-semibold">Итого</span>
                <span className="font-bold text-base">{totalPrice.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl border border-border/30">
              <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(c) => setAgreedToTerms(c as boolean)} className="mt-0.5" />
              <Label htmlFor="terms" className="text-[11px] text-muted-foreground cursor-pointer leading-relaxed">Согласен на обработку персональных данных (ФЗ №152-ФЗ)</Label>
            </div>
            <Button onClick={handleCheckout} className="w-full h-11 rounded-full font-medium" disabled={!phoneNumber.trim() || !agreedToTerms}>
              Подтвердить заказ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth */}
      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-[17px] font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4" /> Авторизация</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {authStep === 'phone' ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Телефон (опционально)</Label>
                  <Input type="tel" placeholder="+7 (999) 123-45-67" value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <p className="text-[11px] text-muted-foreground">Код будет отправлен в Telegram</p>
                <Button onClick={sendVerificationCode} disabled={isAuthLoading} className="w-full h-11 rounded-full">
                  {isAuthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Получить код"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Код подтверждения</Label>
                  <Input type="text" placeholder="123456" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} className="h-11 rounded-xl text-center text-xl tracking-[0.3em]" maxLength={6} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAuthStep('phone')} className="flex-1 rounded-full h-10">Назад</Button>
                  <Button onClick={verifyCode} disabled={isAuthLoading || verificationCode.length !== 6} className="flex-1 rounded-full h-10">
                    {isAuthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Подтвердить"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-[17px] font-semibold flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Чат</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[200px]">
            {chatMessages.length === 0 ? (
              <div className="text-center py-10">
                <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/15 mb-2" />
                <p className="text-[13px] text-muted-foreground">Начните диалог</p>
              </div>
            ) : chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.is_from_manager ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl ${msg.is_from_manager ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                  <p className="text-[13px]">{msg.message}</p>
                  <p className="text-[10px] opacity-50 mt-1">{new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-border/30">
            <div className="flex gap-2">
              <Textarea placeholder="Сообщение..." value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} className="min-h-[40px] max-h-[80px] rounded-xl resize-none text-[13px]" rows={1} />
              <Button onClick={sendChatMessage} disabled={!chatMessage.trim() || isChatLoading} size="icon" className="h-10 w-10 rounded-full shrink-0">
                {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav
        activeTab={activeTab} onTabChange={setActiveTab}
        cartCount={cart.length} favoritesCount={favorites.size}
        onCartClick={() => setIsCartOpen(true)} onProfileClick={() => setIsProfileOpen(true)}
      />
    </div>
  );
};

export default TelegramShop;
