import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Plus, Package, Smartphone, Headphones, Watch, Tablet, Cpu, Monitor, Camera, Gamepad2, Speaker, Cable, Battery, Zap } from "lucide-react";

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
  const lc = categoryName.toLowerCase();
  if (lc.includes('телефон') || lc.includes('смартфон') || lc.includes('iphone')) return Smartphone;
  if (lc.includes('наушник') || lc.includes('airpods')) return Headphones;
  if (lc.includes('часы') || lc.includes('watch')) return Watch;
  if (lc.includes('планшет') || lc.includes('ipad')) return Tablet;
  if (lc.includes('процессор') || lc.includes('чип')) return Cpu;
  if (lc.includes('монитор') || lc.includes('экран') || lc.includes('дисплей')) return Monitor;
  if (lc.includes('камер') || lc.includes('фото')) return Camera;
  if (lc.includes('игр') || lc.includes('game')) return Gamepad2;
  if (lc.includes('колонк') || lc.includes('динамик') || lc.includes('speaker')) return Speaker;
  if (lc.includes('кабел') || lc.includes('провод') || lc.includes('шнур')) return Cable;
  if (lc.includes('аккумулятор') || lc.includes('батаре')) return Battery;
  if (lc.includes('заряд') || lc.includes('питан') || lc.includes('адаптер')) return Zap;
  return Package;
};

export const ProductCard = memo(({ product, isFavorite, onToggleFavorite, onAddToCart, onSelect }: ProductCardProps) => {
  const CategoryIcon = getCategoryIcon(product.category_name);
  const isOutOfStock = product.quantity === 0;

  return (
    <div
      className="group cursor-pointer"
      onClick={() => onSelect(product)}
    >
      {/* Image */}
      <div className="relative aspect-square rounded-2xl bg-muted/40 overflow-hidden mb-3">
        {product.photo_url ? (
          <img
            src={product.photo_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CategoryIcon className="h-12 w-12 text-muted-foreground/20" />
          </div>
        )}

        {/* Favorite */}
        <button
          onClick={(e) => onToggleFavorite(product.id, e)}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full transition-all duration-200 active:scale-90 ${
            isFavorite
              ? "bg-destructive/90 text-destructive-foreground"
              : "bg-background/70 backdrop-blur-md text-muted-foreground hover:bg-background/90"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-current" : ""}`} />
        </button>

        {/* Out of stock */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground bg-background/80 px-3 py-1.5 rounded-full">
              Нет в наличии
            </span>
          </div>
        )}

        {/* Low stock */}
        {!isOutOfStock && product.quantity > 0 && product.quantity < 5 && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="text-[10px] font-medium text-amber-700 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-1 rounded-full">
              Осталось {product.quantity}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1.5 px-0.5">
        <p className="text-[13px] leading-snug text-foreground/80 line-clamp-2 min-h-[2.25rem]">
          {product.name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold text-foreground tracking-tight">
            {product.retail_price?.toLocaleString('ru-RU')} ₽
          </span>
          {!isOutOfStock && (
            <Button
              onClick={(e) => onAddToCart(product, e)}
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

export { getCategoryIcon };
