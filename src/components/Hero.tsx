import { ArrowRight, Smartphone, Laptop, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Hero = () => {
  return (
    <div className="pt-24 pb-16 bg-gradient-to-br from-white to-blue-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 space-y-6 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Профессиональный ремонт{" "}
              <span className="text-primary">цифровой техники</span>
            </h1>
            <p className="text-xl text-gray-600">
              Быстрый и качественный ремонт смартфонов, планшетов и ноутбуков с гарантией
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Оставить заявку
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                Узнать статус ремонта
              </Button>
            </div>
          </div>
          <div className="md:w-1/2 mt-8 md:mt-0 animate-slide-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <Smartphone className="h-12 w-12 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Смартфоны</h3>
                <p className="text-gray-600">Ремонт любой сложности</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <Tablet className="h-12 w-12 text-secondary mb-4" />
                <h3 className="font-semibold mb-2">Планшеты</h3>
                <p className="text-gray-600">Быстрая диагностика</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <Laptop className="h-12 w-12 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Ноутбуки</h3>
                <p className="text-gray-600">Гарантия качества</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="text-4xl mb-4">🛠️</div>
                <h3 className="font-semibold mb-2">И другое</h3>
                <p className="text-gray-600">Любые устройства</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};