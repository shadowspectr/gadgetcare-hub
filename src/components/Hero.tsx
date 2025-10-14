
import { ArrowRight, Smartphone, Laptop, Tablet, BanknoteIcon, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { OrderStatusDialog } from "./OrderStatusDialog";

export const Hero = () => {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  const handleRepairRequest = () => {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="pt-24 pb-16 bg-gradient-to-br from-white via-gray-50 to-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="w-full md:w-1/2 space-y-6 animate-fade-in">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Профессиональный ремонт{" "}
                <span className="text-primary bg-gradient-to-r from-primary to-red-500 bg-clip-text text-transparent">
                  цифровой техники
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600">
                Быстрый и качественный ремонт смартфонов, планшетов и ноутбуков с гарантией в Донецке
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-slide-in-right">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  onClick={handleRepairRequest}
                >
                  Оставить заявку
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300"
                  onClick={() => setIsStatusDialogOpen(true)}
                >
                  Узнать статус ремонта
                </Button>
              </div>
            </div>
            <div className="w-full md:w-1/2 animate-slide-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg hover-lift hover:shadow-2xl transition-all duration-300 border border-gray-100 animate-scale-in">
                  <Smartphone className="h-8 sm:h-12 w-8 sm:w-12 text-primary mb-4 transition-transform duration-300 hover:scale-110" />
                  <h3 className="font-semibold mb-2">Смартфоны</h3>
                  <p className="text-gray-600 text-sm sm:text-base">Ремонт любой сложности</p>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg hover-lift hover:shadow-2xl transition-all duration-300 border border-gray-100 animate-scale-in" style={{animationDelay: '0.1s'}}>
                  <Tablet className="h-8 sm:h-12 w-8 sm:w-12 text-primary mb-4 transition-transform duration-300 hover:scale-110" />
                  <h3 className="font-semibold mb-2">Планшеты</h3>
                  <p className="text-gray-600 text-sm sm:text-base">Быстрая диагностика</p>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg hover-lift hover:shadow-2xl transition-all duration-300 border border-gray-100 animate-scale-in" style={{animationDelay: '0.2s'}}>
                  <Laptop className="h-8 sm:h-12 w-8 sm:w-12 text-primary mb-4 transition-transform duration-300 hover:scale-110" />
                  <h3 className="font-semibold mb-2">Ноутбуки</h3>
                  <p className="text-gray-600 text-sm sm:text-base">Гарантия качества</p>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg hover-lift hover:shadow-2xl transition-all duration-300 border border-gray-100 animate-scale-in" style={{animationDelay: '0.3s'}}>
                  <div className="flex">
                    <ShieldCheck className="h-8 sm:h-12 w-8 sm:w-12 text-primary mb-4 ml-2 transition-transform duration-300 hover:scale-110" />
                  </div>
                  <h3 className="font-semibold mb-2">Работа с ПО</h3>
                  <p className="text-gray-600 text-sm sm:text-base">Установка банковских приложений на iOS<br />Снятие блокировок</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "Доктор Гаджет",
          "description": "Сервисный центр по ремонту смартфонов, планшетов и ноутбуков в Донецке",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "ул. Октября 16А",
            "addressLocality": "Донецк",
            "postalCode": "",
            "addressCountry": "RU"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": "",
            "longitude": ""
          },
          "openingHours": "Mo-Su 09:00-17:00",
          "telephone": "+7 (949) 504-22-26",
          "url": "https://doctor-gadget.ru",
          "image": "/og-image.png",
          "priceRange": "₽₽"
        })}
      </script>

      <OrderStatusDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
      />
    </>
  );
};
