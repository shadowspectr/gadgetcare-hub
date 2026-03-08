import { useEffect, useState, useMemo, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, Package, ShoppingCart, X, Search, Plus, Minus, 
  Check, Phone, ChevronRight, ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductCard, getCategoryIcon } from "@/components/telegram/ProductCard";
import { ProductGridSkeleton } from "@/components/telegram/ProductSkeleton";

interface Product {
  id: string;
  name: string;
  retail_price: number;
  quantity: number;
  description: string | null;
  photo_url: string | null;
  category_name: string | null;
}

interface CartItem extends Product {
  cartQuantity: number;
}

export const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showCart, setShowCart] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "available">("available");
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    const savedFav = localStorage.getItem("shopFavorites");
    if (savedFav) setFavorites(new Set(JSON.parse(savedFav)));
    const savedCart = localStorage.getItem("shopCart");
    if (savedCart) setCart(JSON.parse(savedCart));
    const savedPhone = localStorage.getItem("userPhone");
    if (savedPhone) setPhoneNumber(savedPhone);
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products_public' as 'products')
        .select('*')
        .eq('is_visible', true)
        .order('category_name')
        .order('name');

      if (error) throw error;

      if (data) {
        interface ProductPublicRow {
          id: string; name: string; retail_price: number | null;
          quantity: number | null; description: string | null;
          photo_url: string | null; category_name: string | null;
        }
        const rawData = data as unknown as ProductPublicRow[];
        const formatted: Product[] = rawData.map(p => ({
          id: p.id, name: p.name,
          retail_price: p.retail_price || 0,
          quantity: p.quantity || 0,
          description: p.description,
          photo_url: p.photo_url,
          category_name: p.category_name,
        }));
        setProducts(formatted);
        const cats = Array.from(new Set(formatted.map(p => p.category_name).filter(Boolean))).sort() as string[];
        setCategories(cats);
      }
    } catch {
      toast({ title: "Ошибка загрузки", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === "all" || p.category_name === selectedCategory;
      const matchFilter = activeFilter === "all" || p.quantity > 0;
      return matchSearch && matchCategory && matchFilter;
    });
  }, [products, searchQuery, selectedCategory, activeFilter]);

  const toggleFavorite = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("shopFavorites", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const addToCart = useCallback((product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (product.quantity === 0) return;
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
      localStorage.setItem("shopCart", JSON.stringify(next));
      toast({ title: "Добавлено в корзину", description: product.name });
      return next;
    });
  }, [toast]);

  const updateCartQuantity = useCallback((id: string, qty: number) => {
    setCart(prev => {
      if (qty === 0) {
        const next = prev.filter(i => i.id !== id);
        localStorage.setItem("shopCart", JSON.stringify(next));
        return next;
      }
      const item = prev.find(i => i.id === id);
      if (item && qty > item.quantity) {
        toast({ title: "Недостаточно товара", variant: "destructive" });
        return prev;
      }
      const next = prev.map(i => i.id === id ? { ...i, cartQuantity: qty } : i);
      localStorage.setItem("shopCart", JSON.stringify(next));
      return next;
    });
  }, [toast]);

  const totalPrice = cart.reduce((sum, i) => sum + i.retail_price * i.cartQuantity, 0);
  const totalItems = cart.reduce((sum, i) => sum + i.cartQuantity, 0);

  const handleSubmitOrder = async () => {
    if (!phoneNumber.trim() || !agreedToTerms) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-telegram-order', {
        body: {
          phoneNumber,
          items: cart.map(i => ({ id: i.id, name: i.name, price: i.retail_price, quantity: i.cartQuantity })),
          total: totalPrice,
          timestamp: new Date().toISOString(),
        },
      });
      if (error) throw error;
      localStorage.setItem('userPhone', phoneNumber);
      toast({ title: "Заказ оформлен!", description: "Мы свяжемся с вами" });
      setCart([]); localStorage.removeItem("shopCart");
      setShowCart(false); setCheckoutStep(0); setAgreedToTerms(false);
    } catch {
      toast({ title: "Ошибка", description: "Попробуйте позже", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Sticky header */}
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container mx-auto px-4 py-3 space-y-3">
          {/* Search */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Поиск товаров"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <ShoppingCart className="h-5 w-5 text-foreground" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-semibold bg-destructive text-destructive-foreground rounded-full px-1">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveFilter("available")}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                activeFilter === "available"
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              В наличии
            </button>
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                activeFilter === "all"
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              Все товары
            </button>
          </div>

          {/* Categories */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
              }`}
            >
              Все
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground text-sm">Ничего не найдено</p>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-muted-foreground mb-4">{filteredProducts.length} товаров</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
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
          </>
        )}
      </main>

      {/* Floating cart (mobile) */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:hidden z-30">
          <button
            onClick={() => setShowCart(true)}
            className="w-full flex items-center justify-between bg-foreground text-background rounded-2xl px-5 py-4 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-5 w-5" />
              <span className="font-medium">{totalItems} товаров</span>
            </div>
            <span className="font-semibold">{totalPrice.toLocaleString('ru-RU')} ₽</span>
          </button>
        </div>
      )}

      {/* Product Detail */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
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
              </div>
              <div className="p-5 space-y-3">
                {selectedProduct.category_name && (
                  <span className="text-[12px] font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                    {selectedProduct.category_name}
                  </span>
                )}
                <h2 className="text-lg font-semibold leading-snug">{selectedProduct.name}</h2>
                {selectedProduct.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedProduct.description}</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-border/30">
                  <div>
                    <p className="text-xl font-bold">{selectedProduct.retail_price.toLocaleString('ru-RU')} ₽</p>
                    <p className="text-[12px] text-muted-foreground">
                      {selectedProduct.quantity > 0 ? `В наличии: ${selectedProduct.quantity}` : 'Нет в наличии'}
                    </p>
                  </div>
                  <Button
                    onClick={(e) => { addToCart(selectedProduct, e); setSelectedProduct(null); }}
                    disabled={selectedProduct.quantity === 0}
                    className="rounded-full px-6 h-10"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> В корзину
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart & Checkout */}
      <Dialog open={showCart} onOpenChange={(open) => { setShowCart(open); if (!open) setCheckoutStep(0); }}>
        <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden flex flex-col rounded-2xl">
          <DialogHeader className="p-5 pb-3 border-b border-border/30 shrink-0">
            <div className="flex items-center gap-3">
              {checkoutStep > 0 && (
                <button onClick={() => setCheckoutStep(s => s - 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <DialogTitle className="text-[17px] font-semibold">
                {checkoutStep === 0 && "Корзина"}
                {checkoutStep === 1 && "Контакт"}
                {checkoutStep === 2 && "Подтверждение"}
              </DialogTitle>
            </div>
            {/* Progress */}
            <div className="flex gap-1.5 mt-3">
              {[0, 1, 2].map(s => (
                <div key={s} className={`h-0.5 flex-1 rounded-full transition-colors ${s <= checkoutStep ? 'bg-foreground' : 'bg-muted'}`} />
              ))}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5">
            {checkoutStep === 0 && (
              <div className="space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-16">
                    <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/15 mb-3" />
                    <p className="text-sm text-muted-foreground">Корзина пуста</p>
                  </div>
                ) : cart.map(item => (
                  <div key={item.id} className="flex gap-3 py-3 border-b border-border/20 last:border-0">
                    {item.photo_url ? (
                      <img src={item.photo_url} alt={item.name} className="w-14 h-14 object-cover rounded-xl" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-muted/40 flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground/20" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium line-clamp-2 leading-snug">{item.name}</p>
                      <p className="text-[13px] font-semibold mt-1">{item.retail_price.toLocaleString('ru-RU')} ₽</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => updateCartQuantity(item.id, 0)} className="p-1 text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)} className="h-7 w-7 rounded-full border border-border/50 flex items-center justify-center hover:bg-muted">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-medium w-5 text-center">{item.cartQuantity}</span>
                        <button onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)} className="h-7 w-7 rounded-full border border-border/50 flex items-center justify-center hover:bg-muted">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {checkoutStep === 1 && (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Phone className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Укажите телефон для связи</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[13px]">Номер телефона</Label>
                  <Input
                    id="phone" type="tel"
                    placeholder="+7 (999) 123-45-67"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-12 rounded-xl text-base"
                  />
                </div>
              </div>
            )}

            {checkoutStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between text-[13px] py-1.5">
                      <span className="text-muted-foreground">{item.name} × {item.cartQuantity}</span>
                      <span className="font-medium">{(item.retail_price * item.cartQuantity).toLocaleString('ru-RU')} ₽</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-border/30 flex justify-between">
                    <span className="font-semibold">Итого</span>
                    <span className="font-bold text-lg">{totalPrice.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 text-[13px]">
                  <span className="text-muted-foreground">Телефон:</span> {phoneNumber}
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl border border-border/30">
                  <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(c) => setAgreedToTerms(c as boolean)} className="mt-0.5" />
                  <Label htmlFor="terms" className="text-[12px] text-muted-foreground leading-relaxed cursor-pointer">
                    Я согласен на обработку персональных данных в соответствии с ФЗ-152
                  </Label>
                </div>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-5 pt-3 border-t border-border/30 bg-background shrink-0">
              {checkoutStep < 2 && (
                <div className="flex justify-between mb-3 text-[13px]">
                  <span className="text-muted-foreground">Итого</span>
                  <span className="font-semibold text-base">{totalPrice.toLocaleString('ru-RU')} ₽</span>
                </div>
              )}
              {checkoutStep === 0 && (
                <Button onClick={() => setCheckoutStep(1)} className="w-full h-11 rounded-full font-medium gap-1">
                  Продолжить <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {checkoutStep === 1 && (
                <Button onClick={() => setCheckoutStep(2)} disabled={!phoneNumber.trim()} className="w-full h-11 rounded-full font-medium gap-1">
                  Продолжить <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {checkoutStep === 2 && (
                <Button onClick={handleSubmitOrder} disabled={isSubmitting || !agreedToTerms} className="w-full h-11 rounded-full font-medium">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  {isSubmitting ? "Отправка..." : "Подтвердить заказ"}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shop;
