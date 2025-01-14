import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ServicePriceDialog } from "./ServicePriceDialog";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone, Laptop, Tablet, Battery, Wifi, HardDrive } from "lucide-react";

const iconComponents = {
  smartphone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  battery: Battery,
  wifi: Wifi,
  "hard-drive": HardDrive,
};

type Service = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof iconComponents;
};

type ServicePrice = {
  id: string;
  name: string;
  price: number;
};

export const Services = () => {
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [prices, setPrices] = useState<{ [key: string]: ServicePrice[] }>({});

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at");

    if (error) {
      console.error("Error fetching services:", error);
      return;
    }

    setServices(data);
  };

  const fetchPrices = async (serviceId: string) => {
    const { data, error } = await supabase
      .from("service_prices")
      .select("*")
      .eq("service_id", serviceId)
      .order("created_at");

    if (error) {
      console.error("Error fetching prices:", error);
      return;
    }

    setPrices((prev) => ({ ...prev, [serviceId]: data }));
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (selectedService !== null) {
      const service = services[selectedService];
      if (service && !prices[service.id]) {
        fetchPrices(service.id);
      }
    }
  }, [selectedService, services, prices]);

  return (
    <section id="services" className="py-12 sm:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Наши услуги
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
            Мы предоставляем полный спектр услуг по ремонту и обслуживанию
            цифровой техники
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {services.map((service, index) => {
            const Icon = iconComponents[service.icon];
            return (
              <div
                key={service.id}
                className="p-4 sm:p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
              >
                <Icon className="h-10 sm:h-12 w-10 sm:w-12 text-primary mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">
                  {service.title}
                </h3>
                <p className="text-gray-600 mb-4 text-sm sm:text-base">
                  {service.description}
                </p>
                <Button
                  variant="outline"
                  className="w-full hover:text-primary hover:border-primary"
                  onClick={() => setSelectedService(index)}
                >
                  Подробнее
                </Button>
              </div>
            );
          })}
        </div>
      </div>
      {selectedService !== null && services[selectedService] && (
        <ServicePriceDialog
          isOpen={selectedService !== null}
          onClose={() => setSelectedService(null)}
          serviceTitle={services[selectedService].title}
          prices={prices[services[selectedService].id] || []}
        />
      )}
    </section>
  );
};