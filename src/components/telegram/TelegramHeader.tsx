import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Sparkles } from "lucide-react";
import { getCategoryIcon } from "./ProductCard";

interface TelegramHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: "all" | "available";
  onFilterChange: (filter: "all" | "available") => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  totalCount: number;
}

export const TelegramHeader = memo(({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  selectedCategory,
  onCategoryChange,
  categories,
  totalCount,
}: TelegramHeaderProps) => {
  return (
    <div className="sticky top-0 z-10 bg-gradient-to-b from-background via-background to-background/95 backdrop-blur-xl border-b border-border/50">
      <div className="px-4 py-3 space-y-3">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-xl shadow-xl shadow-primary/20">
              Д
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-background animate-pulse" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Доктор Гаджет
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Маркет • {totalCount.toLocaleString('ru-RU')} товаров</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs with glow */}
        <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl">
          <Button
            variant={activeFilter === "available" ? "default" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("available")}
            className={`flex-1 rounded-xl h-9 transition-all duration-200 ${
              activeFilter === "available" 
                ? "shadow-lg shadow-primary/20" 
                : "hover:bg-muted"
            }`}
          >
            В наличии
          </Button>
          <Button
            variant={activeFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("all")}
            className={`flex-1 rounded-xl h-9 transition-all duration-200 ${
              activeFilter === "all" 
                ? "shadow-lg shadow-primary/20" 
                : "hover:bg-muted"
            }`}
          >
            Все товары
          </Button>
        </div>

        {/* Search with icon animation */}
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            type="text"
            placeholder="Найти товар..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 rounded-xl bg-muted/50 border-0 h-11 focus:bg-muted transition-all duration-200 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Category Pills with scroll snap */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange("all")}
            className={`rounded-xl whitespace-nowrap shrink-0 h-9 snap-start transition-all duration-200 ${
              selectedCategory === "all" 
                ? "shadow-lg shadow-primary/20" 
                : "border-border/50 hover:border-primary/30 hover:bg-primary/5"
            }`}
          >
            Все
          </Button>
          {categories.map((category) => {
            const CategoryIcon = getCategoryIcon(category);
            const isSelected = selectedCategory === category;
            return (
              <Button
                key={category}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onCategoryChange(category)}
                className={`rounded-xl whitespace-nowrap shrink-0 h-9 gap-1.5 snap-start transition-all duration-200 ${
                  isSelected 
                    ? "shadow-lg shadow-primary/20" 
                    : "border-border/50 hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                <CategoryIcon className="h-3.5 w-3.5" />
                {category}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

TelegramHeader.displayName = "TelegramHeader";
