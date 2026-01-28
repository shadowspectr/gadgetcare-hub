import { useEffect, useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, Package, ShoppingCart, X, Search, Heart, Plus, Minus, 
  Check, Phone, ChevronRight, ArrowLeft, Sparkles, Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

export const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showCart, setShowCart] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0); // 0 = cart, 1 = phone, 2 = confirm
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);
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
      // Use products_public view to avoid exposing purchase_price (security)
      const { data, error } = await supabase
        .from('products_public' as 'products')
        .select('*')
        .eq('is_visible', true)
        .order('category_name')
        .order('name');

      if (error) throw error;

      if (data) {
        interface ProductPublicRow {
          id: string;
          name: string;
          retail_price: number | null;
          quantity: number | null;
          description: string | null;
          photo_url: string | null;
          category_name: string | null;
        }
        
        const rawData = data as unknown as ProductPublicRow[];
        const formattedProducts: Product[] = rawData.map(product => ({
          id: product.id,
          name: product.name,
          price: product.retail_price || 0,
          quantity: product.quantity || 0,
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
    } catch (error: unknown) {
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
      const matchCategory = selectedCategory === "all" || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const availableProducts = filteredProducts.filter(p => p.quantity > 0);
  const outOfStockProducts = filteredProducts.filter(p => p.quantity === 0);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("shopFavorites", JSON.stringify([...next]));
      return next;
    });
  };

  const addToCart = (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (product.quantity === 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      let next: CartItem[];
      if (existing) {
        if (existing.cartQuantity >= product.quantity) {
          toast({ title: "Максимум достигнут", variant: "destructive" });
          return prev;
        }
        next = prev.map(item =>
          item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        );
      } else {
        next = [...prev, { ...product, cartQuantity: 1 }];
      }
      localStorage.setItem("shopCart", JSON.stringify(next));
      toast({ title: "Добавлено", description: product.name });
      return next;
    });
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    setCart(prev => {
      if (newQuantity === 0) {
        const next = prev.filter(item => item.id !== productId);
        localStorage.setItem("shopCart", JSON.stringify(next));
        return next;
      }
      const item = prev.find(i => i.id === productId);
      if (item && newQuantity > item.quantity) {
        toast({ title: "Недостаточно товара", variant: "destructive" });
        return prev;
      }
      const next = prev.map(item =>
        item.id === productId ? { ...item, cartQuantity: newQuantity } : item
      );
      localStorage.setItem("shopCart", JSON.stringify(next));
      return next;
    });
  };

  const getTotalPrice = () => cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  const getTotalItems = () => cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  const handleSubmitOrder = async () => {
    if (!phoneNumber.trim() || !agreedToTerms) {
      toast({ title: "Заполните все поля", variant: "destructive" });
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

      const { error } = await supabase.functions.invoke('send-telegram-order', {
        body: orderData,
      });

      if (error) throw error;

      localStorage.setItem('userPhone', phoneNumber);

      toast({ title: "Заказ оформлен!", description: "Мы свяжемся с вами" });

      setCart([]);
      localStorage.removeItem("shopCart");
      setShowCart(false);
      setCheckoutStep(0);
      setAgreedToTerms(false);
    } catch (error: any) {
      toast({ title: "Ошибка", description: "Попробуйте позже", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const ProductCard = ({ product }: { product: Product }) => {
    const isOutOfStock = product.quantity === 0;
    const inCart = cart.find(i => i.id === product.id);
    
    return (
      <Card 
        className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer ${isOutOfStock ? 'opacity-60' : ''}`}
        onClick={() => setSelectedProduct(product)}
      >
        <div className="relative aspect-square bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
          {product.image ? (
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/20" />
            </div>
          )}
          
          {/* Overlay actions */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Favorite button */}
          <button 
            onClick={(e) => toggleFavorite(product.id, e)}
            className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm shadow-lg transition-all hover:scale-110"
          >
            <Heart className={`h-4 w-4 ${favorites.has(product.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
          </button>

          {/* Category badge */}
          {product.category && (
            <Badge className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground text-xs">
              {product.category}
            </Badge>
          )}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <Badge variant="secondary" className="text-sm">Нет в наличии</Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold line-clamp-2 text-sm leading-tight min-h-[2.5rem]">{product.name}</h3>
          
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-primary">{product.price.toLocaleString('ru-RU')} ₽</p>
              {!isOutOfStock && (
                <p className="text-xs text-muted-foreground">В наличии: {product.quantity}</p>
              )}
            </div>
            
            {!isOutOfStock && (
              inCart ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateCartQuantity(product.id, inCart.cartQuantity - 1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{inCart.cartQuantity}</span>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateCartQuantity(product.id, inCart.cartQuantity + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={(e) => addToCart(product, e)} className="gap-1">
                  <Plus className="h-3 w-3" /> В корзину
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Магазин комплектующих</h1>
          </div>
          <p className="text-muted-foreground">Качественные запчасти для ремонта техники</p>
        </div>
      </div>

      {/* Sticky Search & Filters */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="relative gap-2" onClick={() => setShowCart(true)}>
              <ShoppingCart className="h-4 w-4" />
              {cart.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {getTotalItems()}
                </Badge>
              )}
            </Button>
          </div>

          {/* Category Pills */}
          {(showFilters || selectedCategory !== "all") && (
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-1">
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                  className="shrink-0"
                >
                  Все ({products.length})
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="shrink-0"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Товары не найдены</h3>
            <p className="text-muted-foreground">Попробуйте изменить фильтры</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Available Products */}
            {availableProducts.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Check className="h-5 w-5 text-emerald-500" />
                  В наличии ({availableProducts.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {availableProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}

            {/* Out of Stock */}
            {outOfStockProducts.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                  Нет в наличии ({outOfStockProducts.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {outOfStockProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Floating Cart Button (Mobile) */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:hidden z-30">
          <Button 
            onClick={() => setShowCart(true)} 
            className="w-full h-14 text-base shadow-2xl gap-3"
          >
            <ShoppingCart className="h-5 w-5" />
            <span>Корзина</span>
            <span className="ml-auto font-bold">{getTotalPrice().toLocaleString()} ₽</span>
          </Button>
        </div>
      )}

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {selectedProduct && (
            <>
              <div className="relative aspect-video bg-muted">
                {selectedProduct.image ? (
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-20 w-20 text-muted-foreground/20" />
                  </div>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(selectedProduct.id); }}
                  className="absolute top-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm"
                >
                  <Heart className={`h-5 w-5 ${favorites.has(selectedProduct.id) ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {selectedProduct.category && <Badge>{selectedProduct.category}</Badge>}
                <h2 className="text-xl font-bold">{selectedProduct.name}</h2>
                {selectedProduct.description && (
                  <p className="text-muted-foreground">{selectedProduct.description}</p>
                )}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-2xl font-bold text-primary">{selectedProduct.price.toLocaleString('ru-RU')} ₽</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProduct.quantity > 0 ? `В наличии: ${selectedProduct.quantity}` : 'Нет в наличии'}
                    </p>
                  </div>
                  <Button 
                    onClick={(e) => { addToCart(selectedProduct, e); setSelectedProduct(null); }} 
                    disabled={selectedProduct.quantity === 0}
                    size="lg"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" /> В корзину
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart & Checkout Dialog */}
      <Dialog open={showCart} onOpenChange={(open) => { setShowCart(open); if (!open) setCheckoutStep(0); }}>
        <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              {checkoutStep > 0 && (
                <Button variant="ghost" size="icon" onClick={() => setCheckoutStep(s => s - 1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle>
                {checkoutStep === 0 && "Корзина"}
                {checkoutStep === 1 && "Контактные данные"}
                {checkoutStep === 2 && "Подтверждение"}
              </DialogTitle>
            </div>
            
            {/* Progress Steps */}
            <div className="flex gap-2 mt-3">
              {[0, 1, 2].map(step => (
                <div 
                  key={step} 
                  className={`h-1 flex-1 rounded-full transition-colors ${step <= checkoutStep ? 'bg-primary' : 'bg-muted'}`} 
                />
              ))}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Step 0: Cart Items */}
            {checkoutStep === 0 && (
              <div className="space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Корзина пуста</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 rounded-xl border bg-card">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                        <p className="text-primary font-bold">{item.price.toLocaleString()} ₽</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateCartQuantity(item.id, 0)}>
                          <X className="h-3 w-3" />
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.cartQuantity}</span>
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Step 1: Phone */}
            {checkoutStep === 1 && (
              <div className="space-y-6">
                <div className="text-center p-6 rounded-xl bg-muted/50">
                  <Phone className="h-12 w-12 mx-auto text-primary mb-3" />
                  <h3 className="font-semibold mb-1">Укажите номер телефона</h3>
                  <p className="text-sm text-muted-foreground">Мы свяжемся с вами для подтверждения заказа</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Номер телефона</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+7 (999) 123-45-67"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="text-lg h-12"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Confirm */}
            {checkoutStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                  <h4 className="font-semibold">Ваш заказ</h4>
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.name} × {item.cartQuantity}</span>
                      <span className="font-medium">{(item.price * item.cartQuantity).toLocaleString()} ₽</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t flex justify-between font-bold">
                    <span>Итого</span>
                    <span className="text-primary">{getTotalPrice().toLocaleString()} ₽</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/50">
                  <p className="text-sm"><span className="text-muted-foreground">Телефон:</span> {phoneNumber}</p>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl border">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    Я согласен на обработку персональных данных в соответствии с ФЗ-152 "О персональных данных"
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="p-4 border-t bg-background shrink-0">
              {checkoutStep < 2 && (
                <div className="flex justify-between mb-3">
                  <span className="text-muted-foreground">Итого:</span>
                  <span className="text-xl font-bold">{getTotalPrice().toLocaleString()} ₽</span>
                </div>
              )}
              
              {checkoutStep === 0 && (
                <Button onClick={() => setCheckoutStep(1)} className="w-full h-12 text-base gap-2">
                  Продолжить <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              
              {checkoutStep === 1 && (
                <Button 
                  onClick={() => setCheckoutStep(2)} 
                  disabled={!phoneNumber.trim()}
                  className="w-full h-12 text-base gap-2"
                >
                  Продолжить <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              
              {checkoutStep === 2 && (
                <Button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || !agreedToTerms}
                  className="w-full h-12 text-base"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Подтвердить заказ
                    </>
                  )}
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