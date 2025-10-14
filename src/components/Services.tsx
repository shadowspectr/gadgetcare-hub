import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone, Laptop, Tablet, Battery, Wifi, HardDrive } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  return (
    <section id="services" className="py-12 sm:py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-primary">
            Наши услуги
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
            Мы предоставляем полный спектр услуг по ремонту и обслуживанию
            цифровой техники
          </p>
        </div>
        <div className="max-w-4xl mx-auto animate-slide-in">
          <Accordion type="single" collapsible className="space-y-4">
            {categories.map((category) => {
              const Icon = category.icon 
                ? iconComponents[category.icon as keyof typeof iconComponents] || Smartphone
                : Smartphone;
              const categoryServices = services[category.id] || [];
              
              return (
                <AccordionItem 
                  key={category.id} 
                  value={category.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline group">
                    <div className="flex items-center gap-4">
                      <Icon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-lg font-semibold text-gray-800 group-hover:text-primary transition-colors">
                        {category.name}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4">
                    <div className="space-y-3 pt-2">
                      {categoryServices.length > 0 ? (
                        categoryServices.map((service) => (
                          <div 
                            key={service.id}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors duration-200"
                          >
                            <span className="text-gray-700">{service.name}</span>
                            <span className="text-primary font-semibold">{service.price} ₽</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm italic">Услуги в этой категории пока не добавлены</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
