import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Package, Smartphone, Headphones, Watch, Tablet, Cpu, Monitor, Camera, Gamepad2, Speaker, Cable, Battery, Zap } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  retail_price: number;
  quantity: number;
  photo_url: string | null;
  category_name: string | null;
}

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void;
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
  onSelect: (product: Product) => void;
}

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

export const ProductCard = memo(({ product, isFavorite, onToggleFavorite, onAddToCart, onSelect }: ProductCardProps) => {
  const CategoryIcon = getCategoryIcon(product.category_name);
  
  return (
    <Card 
      className="group overflow-hidden border-0 bg-gradient-to-b from-card to-card/80 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-[0.98]"
      onClick={() => onSelect(product)}
    >
      <div className="relative aspect-square bg-gradient-to-br from-muted/20 to-muted/60 overflow-hidden">
        {product.photo_url ? (
          <img
            src={product.photo_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
              <CategoryIcon className="h-10 w-10 text-primary/40" />
            </div>
          </div>
        )}
        
        {/* Favorite button with glow effect */}
        <button
          onClick={(e) => onToggleFavorite(product.id, e)}
          className={`absolute top-2 right-2 p-2.5 rounded-full shadow-lg transition-all duration-200 active:scale-90 ${
            isFavorite 
              ? 'bg-red-500 shadow-red-500/30' 
              : 'bg-background/95 backdrop-blur-sm hover:bg-background'
          }`}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isFavorite
                ? "fill-white text-white"
                : "text-muted-foreground"
            }`}
          />
        </button>
        
        {/* Out of stock overlay */}
        {product.quantity === 0 && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <Badge variant="secondary" className="bg-muted text-muted-foreground font-medium">
              Нет в наличии
            </Badge>
          </div>
        )}
        
        {/* Low stock badge */}
        {product.quantity > 0 && product.quantity < 5 && (
          <div className="absolute bottom-2 left-2">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20">
              Осталось {product.quantity}
            </Badge>
          </div>
        )}
      </div>
      
      <div className="p-3 space-y-2">
        <h3 className="font-medium text-sm line-clamp-2 leading-snug min-h-[2.5rem] text-foreground/90">
          {product.name}
        </h3>
        
        <div className="flex items-end justify-between gap-2">
          <div className="flex-1">
            <p className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {product.retail_price?.toLocaleString('ru-RU')} ₽
            </p>
          </div>
          <Button
            onClick={(e) => onAddToCart(product, e)}
            disabled={product.quantity === 0}
            size="icon"
            className="h-9 w-9 rounded-full shrink-0 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
});

ProductCard.displayName = "ProductCard";

export { getCategoryIcon };
