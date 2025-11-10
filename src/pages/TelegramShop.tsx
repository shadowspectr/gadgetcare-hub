import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Heart, Search, User, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

type TabType = "all" | "new" | "used";
type FilterType = "favorites" | "all" | "headphones" | "watches";

export const TelegramShop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    
    // Load favorites and cart from localStorage
    const savedFavorites = localStorage.getItem("tg_favorites");
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
    
    const savedCart = localStorage.getItem("tg_cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .gt("quantity", 0)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить товары",
        variant: "destructive",
      });
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
    localStorage.setItem("tg_favorites", JSON.stringify([...newFavorites]));
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    let newCart: CartItem[];
    
    if (existingItem) {
      newCart = cart.map((item) =>
        item.id === product.id
          ? { ...item, cartQuantity: item.cartQuantity + 1 }
          : item
      );
    } else {
      newCart = [...cart, { ...product, cartQuantity: 1 }];
    }
    
    setCart(newCart);
    localStorage.setItem("tg_cart", JSON.stringify(newCart));
    toast({
      title: "Добавлено в корзину",
      description: product.name,
    });
  };

  const removeFromCart = (productId: string) => {
    const newCart = cart.filter((item) => item.id !== productId);
    setCart(newCart);
    localStorage.setItem("tg_cart", JSON.stringify(newCart));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    const newCart = cart.map((item) =>
      item.id === productId ? { ...item, cartQuantity: quantity } : item
    );
    setCart(newCart);
    localStorage.setItem("tg_cart", JSON.stringify(newCart));
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorites = activeFilter === "favorites" ? favorites.has(product.id) : true;
    return matchesSearch && matchesFavorites;
  });

  const totalPrice = cart.reduce(
    (sum, item) => sum + (item.retail_price || 0) * item.cartQuantity,
    0
  );

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "Корзина пуста",
        description: "Добавьте товары перед оформлением заказа",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Оформление заказа",
      description: "Функция находится в разработке",
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="bg-[#1a1a1a] sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center font-bold text-lg">
                A
              </div>
              <h1 className="text-xl font-bold">Айден Маркет</h1>
            </div>
            <button className="text-gray-400">⋮</button>
          </div>
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            <Button
              variant={activeTab === "all" ? "default" : "ghost"}
              className={`flex-1 ${activeTab === "all" ? "bg-gray-700" : "bg-transparent text-gray-400"}`}
              onClick={() => setActiveTab("all")}
            >
              Все
            </Button>
            <Button
              variant={activeTab === "new" ? "default" : "ghost"}
              className={`flex-1 ${activeTab === "new" ? "bg-gray-700" : "bg-transparent text-gray-400"}`}
              onClick={() => setActiveTab("new")}
            >
              Новые
            </Button>
            <Button
              variant={activeTab === "used" ? "default" : "ghost"}
              className={`flex-1 ${activeTab === "used" ? "bg-gray-700" : "bg-transparent text-gray-400"}`}
              onClick={() => setActiveTab("used")}
            >
              Б/у
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={activeFilter === "favorites" ? "default" : "outline"}
              size="sm"
              className={`whitespace-nowrap ${
                activeFilter === "favorites"
                  ? "bg-pink-600 hover:bg-pink-700 border-pink-600"
                  : "bg-transparent border-gray-600 text-gray-300"
              }`}
              onClick={() => setActiveFilter("favorites")}
            >
              <Heart className="h-4 w-4 mr-1" />
              Избранное
            </Button>
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              className={`whitespace-nowrap ${
                activeFilter === "all"
                  ? "bg-white text-black hover:bg-gray-200"
                  : "bg-transparent border-gray-600 text-gray-300"
              }`}
              onClick={() => setActiveFilter("all")}
            >
              Все
            </Button>
            <Button
              variant={activeFilter === "headphones" ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap bg-transparent border-gray-600 text-gray-300"
              onClick={() => setActiveFilter("headphones")}
            >
              Наушники
            </Button>
            <Button
              variant={activeFilter === "watches" ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap bg-transparent border-gray-600 text-gray-300"
              onClick={() => setActiveFilter("watches")}
            >
              Часы
            </Button>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="container mx-auto px-4 py-4">
        <h2 className="text-2xl font-bold mb-4">Товары</h2>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-20">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="bg-[#1a1a1a] border-gray-800 overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={product.photo_url || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={() => toggleFavorite(product.id)}
                      className="absolute top-2 right-2 p-2 bg-black/50 rounded-full"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          favorites.has(product.id)
                            ? "fill-pink-500 text-pink-500"
                            : "text-white"
                        }`}
                      />
                    </button>
                    <div className="absolute bottom-2 left-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((star) => (
                          <span key={star} className="text-yellow-500">⭐</span>
                        ))}
                        <span className="text-gray-400">⭐</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xl font-bold mb-2">
                      {product.retail_price?.toLocaleString()} ₽
                    </p>
                    <Button
                      onClick={() => addToCart(product)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      В корзину
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Товары не найдены</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-gray-800">
        <div className="container mx-auto px-4 py-3 flex justify-around">
          <button className="flex flex-col items-center gap-1">
            <Package className="h-6 w-6" />
            <span className="text-xs">Маркет</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-500">
            <ShoppingCart className="h-6 w-6" />
            <span className="text-xs">Заказы</span>
          </button>
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center gap-1 text-gray-500 relative"
          >
            <ShoppingCart className="h-6 w-6" />
            {cart.length > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-red-600 text-white text-xs h-5 w-5 flex items-center justify-center rounded-full p-0">
                {cart.length}
              </Badge>
            )}
            <span className="text-xs">Корзина</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-500">
            <User className="h-6 w-6" />
            <span className="text-xs">Профиль</span>
          </button>
        </div>
      </div>

      {/* Cart Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="bg-[#1a1a1a] text-white border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Корзина
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Корзина пуста</p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 bg-[#2a2a2a] p-3 rounded-lg"
                >
                  <img
                    src={item.photo_url || "/placeholder.svg"}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{item.name}</h4>
                    <p className="text-lg font-bold mb-2">
                      {item.retail_price?.toLocaleString()} ₽
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateCartQuantity(item.id, item.cartQuantity - 1)
                        }
                        className="h-7 w-7 p-0 bg-transparent border-gray-600"
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{item.cartQuantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateCartQuantity(item.id, item.cartQuantity + 1)
                        }
                        className="h-7 w-7 p-0 bg-transparent border-gray-600"
                      >
                        +
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCart(item.id)}
                        className="ml-auto text-red-500 hover:text-red-600"
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
            <div className="pt-4 border-t border-gray-800">
              <div className="flex justify-between text-lg font-bold mb-4">
                <span>Итого:</span>
                <span>{totalPrice.toLocaleString()} ₽</span>
              </div>
              <Button
                onClick={handleCheckout}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Оформить заказ
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
