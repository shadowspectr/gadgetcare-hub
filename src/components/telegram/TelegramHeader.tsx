import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/30">
      <div className="px-4 pt-3 pb-2 space-y-3">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">Магазин</h1>
            <p className="text-[13px] text-muted-foreground">{totalCount} товаров</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            type="text"
            placeholder="Поиск"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 rounded-xl bg-muted/50 border-0 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5">
          <button
            onClick={() => onFilterChange("available")}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              activeFilter === "available"
                ? "bg-foreground text-background"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            В наличии
          </button>
          <button
            onClick={() => onFilterChange("all")}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              activeFilter === "all"
                ? "bg-foreground text-background"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Все
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => onCategoryChange("all")}
            className={`px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
            }`}
          >
            Все
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

TelegramHeader.displayName = "TelegramHeader";
