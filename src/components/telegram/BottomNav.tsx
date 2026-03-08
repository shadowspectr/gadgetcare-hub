import { memo } from "react";
import { Home, Heart, ShoppingCart, User } from "lucide-react";

type TabType = "all" | "favorites" | "cart" | "profile";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  cartCount: number;
  favoritesCount: number;
  onCartClick: () => void;
  onProfileClick: () => void;
}

export const BottomNav = memo(({
  activeTab,
  onTabChange,
  cartCount,
  favoritesCount,
  onCartClick,
  onProfileClick,
}: BottomNavProps) => {
  const items = [
    { id: "all" as TabType, icon: Home, label: "Главная", count: 0 },
    { id: "favorites" as TabType, icon: Heart, label: "Избранное", count: favoritesCount },
    { id: "cart" as TabType, icon: ShoppingCart, label: "Корзина", count: cartCount },
    { id: "profile" as TabType, icon: User, label: "Профиль", count: 0 },
  ];

  const handleClick = (id: TabType) => {
    if (id === "cart") onCartClick();
    else if (id === "profile") onProfileClick();
    else onTabChange(id);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20">
      <div className="bg-background/90 backdrop-blur-xl border-t border-border/30">
        <div className="flex justify-around items-center max-w-md mx-auto px-2 py-1.5">
          {items.map(({ id, icon: Icon, label, count }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleClick(id)}
                className={`relative flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.5} />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-semibold bg-destructive text-destructive-foreground rounded-full px-1">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
        <div className="h-safe-area-inset-bottom bg-background" />
      </div>
    </div>
  );
});

BottomNav.displayName = "BottomNav";
