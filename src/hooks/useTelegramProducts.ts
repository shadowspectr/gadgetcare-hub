import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  description: string | null;
  retail_price: number;
  quantity: number;
  photo_url: string | null;
  category_name: string | null;
}

interface ProductPublicRow {
  id: string;
  name: string;
  description: string | null;
  retail_price: number | null;
  quantity: number | null;
  photo_url: string | null;
  category_name: string | null;
  is_visible: boolean;
}

const PAGE_SIZE = 100;

export const useTelegramProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const pageRef = useRef(0);
  const loadedIdsRef = useRef(new Set<string>());

  // Load a specific page using products_public view (excludes purchase_price for security)
  const loadPage = useCallback(async (page: number) => {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from("products_public" as "products")
      .select("id, name, description, retail_price, quantity, photo_url, category_name", { count: page === 0 ? "exact" : undefined })
      .eq("is_visible", true)
      .order("category_name", { ascending: true })
      .order("name", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("Error loading products page:", error);
      return { products: [] as Product[], count: 0 };
    }

    const rawData = (data || []) as unknown as ProductPublicRow[];
    
    // Filter out already loaded products and map to Product type
    const newProducts: Product[] = rawData
      .filter(p => !loadedIdsRef.current.has(p.id))
      .map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        retail_price: p.retail_price || 0,
        quantity: p.quantity || 0,
        photo_url: p.photo_url,
        category_name: p.category_name,
      }));
    
    newProducts.forEach(p => loadedIdsRef.current.add(p.id));

    return { products: newProducts, count: count || 0 };
  }, []);

  // Load more products (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const { products: newProducts } = await loadPage(nextPage);

      if (newProducts.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (newProducts.length > 0) {
        setProducts(prev => [...prev, ...newProducts]);
        pageRef.current = nextPage;
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more products:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadPage, loadingMore, hasMore]);

  // Refresh products
  const refresh = useCallback(async () => {
    pageRef.current = 0;
    loadedIdsRef.current.clear();
    setProducts([]);
    setHasMore(true);
    setLoading(true);
    
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from("products_public" as "products")
        .select("*", { count: "exact", head: true })
        .eq("is_visible", true);

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Get unique categories
      const { data: catData, error: catError } = await supabase
        .from("products_public" as "products")
        .select("category_name")
        .eq("is_visible", true)
        .not("category_name", "is", null);

      if (catError) throw catError;
      
      const rawCatData = (catData || []) as unknown as { category_name: string }[];
      const uniqueCategories = [...new Set(rawCatData.map(p => p.category_name).filter(Boolean))];
      setCategories(uniqueCategories);

      // Load first page
      const { products: firstPageData } = await loadPage(0);
      setProducts(firstPageData);
      
      if (firstPageData.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error refreshing products:", error);
    } finally {
      setLoading(false);
    }
  }, [loadPage]);

  // Initial load
  useEffect(() => {
    const initAndLoad = async () => {
      setLoading(true);
      try {
        // Get total count
        const { count, error: countError } = await supabase
          .from("products_public" as "products")
          .select("*", { count: "exact", head: true })
          .eq("is_visible", true);

        if (countError) throw countError;
        setTotalCount(count || 0);

        // Get unique categories
        const { data: catData, error: catError } = await supabase
          .from("products_public" as "products")
          .select("category_name")
          .eq("is_visible", true)
          .not("category_name", "is", null);

        if (catError) throw catError;
        
        const rawCatData = (catData || []) as unknown as { category_name: string }[];
        const uniqueCategories = [...new Set(rawCatData.map(p => p.category_name).filter(Boolean))];
        setCategories(uniqueCategories);

        // Load first page
        const { products: firstPageData, count: fetchedCount } = await loadPage(0);
        setProducts(firstPageData);
        if (fetchedCount) setTotalCount(fetchedCount);
        
        if (firstPageData.length < PAGE_SIZE) {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error initializing products:", error);
      } finally {
        setLoading(false);
      }
    };

    initAndLoad();
  }, [loadPage]);

  return {
    products,
    categories,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    loadMore,
    refresh,
  };
};
