import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Smartphone, Laptop, Tablet, Battery, Wifi, HardDrive } from "lucide-react";

const iconComponents = {
  smartphone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  battery: Battery,
  wifi: Wifi,
  "hard-drive": HardDrive,
};

type ServiceCategory = {
  id: string;
  name: string;
  icon: string | null;
  created_at?: string;
};

type Service = {
  id: string;
  category_id: string;
  name: string;
  price: string;
  created_at?: string;
};

export const Services = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<{ [key: string]: Service[] }>({});
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchCategoriesAndServices = async () => {
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("service_categories")
      .select("*")
      .order("created_at");

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
      return;
    }

    setCategories(categoriesData || []);

    const { data: servicesData, error: servicesError } = await supabase
      .from("services")
      .select("*")
      .order("created_at");

    if (servicesError) {
      console.error("Error fetching services:", servicesError);
      return;
    }

    const groupedServices = (servicesData || []).reduce((acc, service) => {
      if (!acc[service.category_id]) {
        acc[service.category_id] = [];
      }
      acc[service.category_id].push(service);
      return acc;
    }, {} as { [key: string]: Service[] });

    setServices(groupedServices);
  };

  useEffect(() => {
    fetchCategoriesAndServices();
  }, []);

  const handleCategoryClick = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setIsDialogOpen(true);
  };

  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-4 text-foreground">
          Наши услуги
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Профессиональный ремонт техники с гарантией качества
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const Icon = category.icon 
              ? iconComponents[category.icon as keyof typeof iconComponents] || Smartphone
              : Smartphone;
            const categoryServices = services[category.id] || [];

            return (
              <Card 
                key={category.id} 
                className="hover:shadow-lg transition-all cursor-pointer hover-scale animate-scale-in group"
                onClick={() => handleCategoryClick(category)}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{category.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {categoryServices.length} {categoryServices.length === 1 ? 'услуга' : categoryServices.length < 5 ? 'услуги' : 'услуг'}
                  </p>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              {selectedCategory && (
                <>
                  {(() => {
                    const Icon = selectedCategory.icon 
                      ? iconComponents[selectedCategory.icon as keyof typeof iconComponents] || Smartphone
                      : Smartphone;
                    return <Icon className="h-7 w-7 text-primary" />;
                  })()}
                  {selectedCategory.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedCategory && (
              <div className="space-y-3">
                {(services[selectedCategory.id] || []).map((service) => (
                  <div 
                    key={service.id} 
                    className="flex justify-between items-center py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="text-base">{service.name}</span>
                    <span className="font-semibold text-lg text-primary whitespace-nowrap ml-4">
                      {service.price} ₽
                    </span>
                  </div>
                ))}
                {(services[selectedCategory.id] || []).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    В этой категории пока нет услуг
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
