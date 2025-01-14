import { Smartphone, Laptop, Tablet, Battery, Wifi, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ServicePriceDialog } from "./ServicePriceDialog";

const services = [
  {
    icon: Smartphone,
    title: "Ремонт смартфонов",
    description: "Замена экрана, батареи, разъемов и других компонентов",
    prices: [
      { service: "Диагностика", price: 500 },
      { service: "Замена экрана", price: 2500 },
      { service: "Замена батареи", price: 1500 },
      { service: "Замена разъема зарядки", price: 1800 },
      { service: "Замена динамика", price: 1200 },
    ],
  },
  {
    icon: Laptop,
    title: "Ремонт ноутбуков",
    description: "Чистка от пыли, замена термопасты, ремонт материнских плат",
    prices: [
      { service: "Диагностика", price: 800 },
      { service: "Чистка от пыли", price: 1500 },
      { service: "Замена термопасты", price: 1200 },
      { service: "Ремонт материнской платы", price: 3500 },
      { service: "Замена клавиатуры", price: 2500 },
    ],
  },
  {
    icon: Tablet,
    title: "Ремонт планшетов",
    description: "Замена тачскрина, дисплея, восстановление после падений",
    prices: [
      { service: "Диагностика", price: 600 },
      { service: "Замена тачскрина", price: 2800 },
      { service: "Замена дисплея", price: 3500 },
      { service: "Замена батареи", price: 2000 },
      { service: "Ремонт после падения", price: 2500 },
    ],
  },
  {
    icon: Battery,
    title: "Замена батареи",
    description: "Установка оригинальных аккумуляторов с гарантией",
    prices: [
      { service: "Диагностика", price: 400 },
      { service: "Замена батареи смартфона", price: 1500 },
      { service: "Замена батареи планшета", price: 2000 },
      { service: "Замена батареи ноутбука", price: 2500 },
      { service: "Калибровка батареи", price: 500 },
    ],
  },
  {
    icon: Wifi,
    title: "Настройка ПО",
    description: "Установка операционных систем, драйверов, программ",
    prices: [
      { service: "Диагностика", price: 500 },
      { service: "Установка Windows", price: 2000 },
      { service: "Установка драйверов", price: 800 },
      { service: "Установка программ", price: 1000 },
      { service: "Удаление вирусов", price: 1500 },
    ],
  },
  {
    icon: HardDrive,
    title: "Восстановление данных",
    description: "Спасение информации с поврежденных носителей",
    prices: [
      { service: "Диагностика", price: 1000 },
      { service: "Восстановление с HDD", price: 3500 },
      { service: "Восстановление с SSD", price: 4500 },
      { service: "Восстановление с флешки", price: 2500 },
      { service: "Восстановление с карты памяти", price: 2000 },
    ],
  },
];

export const Services = () => {
  const [selectedService, setSelectedService] = useState<number | null>(null);

  return (
    <section id="services" className="py-12 sm:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Наши услуги</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
            Мы предоставляем полный спектр услуг по ремонту и обслуживанию цифровой техники
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="p-4 sm:p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
            >
              <service.icon className="h-10 sm:h-12 w-10 sm:w-12 text-primary mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{service.title}</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">{service.description}</p>
              <Button 
                variant="outline" 
                className="w-full hover:text-primary hover:border-primary"
                onClick={() => setSelectedService(index)}
              >
                Подробнее
              </Button>
            </div>
          ))}
        </div>
      </div>
      {selectedService !== null && (
        <ServicePriceDialog
          isOpen={selectedService !== null}
          onClose={() => setSelectedService(null)}
          serviceTitle={services[selectedService].title}
          prices={services[selectedService].prices}
        />
      )}
    </section>
  );
};