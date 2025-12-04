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
  const navItems = [
    { id: "all" as TabType, icon: Home, label: "Главная", count: 0 },
    { id: "favorites" as TabType, icon: Heart, label: "Избранное", count: favoritesCount },
    { id: "cart" as TabType, icon: ShoppingCart, label: "Корзина", count: cartCount },
    { id: "profile" as TabType, icon: User, label: "Профиль", count: 0 },
  ];

  const handleClick = (id: TabType) => {
    if (id === "cart") {
      onCartClick();
    } else if (id === "profile") {
      onProfileClick();
    } else {
      onTabChange(id);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20">
      {/* Gradient fade effect */}
      <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      
      {/* Navigation bar */}
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/50 px-2 py-2">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {navItems.map(({ id, icon: Icon, label, count }) => {
            const isActive = activeTab === id || (id === "cart" && false) || (id === "profile" && false);
            return (
              <button
                key={id}
                onClick={() => handleClick(id)}
                className={`relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full px-1 shadow-lg shadow-primary/30 animate-scale-in">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : ""}`}>
                  {label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary shadow-lg shadow-primary/50" />
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </div>
  );
});

BottomNav.displayName = "BottomNav";
