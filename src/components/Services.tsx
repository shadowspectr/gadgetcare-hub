import { Smartphone, Laptop, Tablet, Battery, Wifi, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Smartphone,
    title: "Ремонт смартфонов",
    description: "Замена экрана, батареи, разъемов и других компонентов",
  },
  {
    icon: Laptop,
    title: "Ремонт ноутбуков",
    description: "Чистка от пыли, замена термопасты, ремонт материнских плат",
  },
  {
    icon: Tablet,
    title: "Ремонт планшетов",
    description: "Замена тачскрина, дисплея, восстановление после падений",
  },
  {
    icon: Battery,
    title: "Замена батареи",
    description: "Установка оригинальных аккумуляторов с гарантией",
  },
  {
    icon: Wifi,
    title: "Настройка ПО",
    description: "Установка операционных систем, драйверов, программ",
  },
  {
    icon: HardDrive,
    title: "Восстановление данных",
    description: "Спасение информации с поврежденных носителей",
  },
];

export const Services = () => {
  return (
    <section id="services" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Наши услуги</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Мы предоставляем полный спектр услуг по ремонту и обслуживанию цифровой техники
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
            >
              <service.icon className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
              <p className="text-gray-600 mb-4">{service.description}</p>
              <Button variant="outline" className="w-full">
                Подробнее
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};