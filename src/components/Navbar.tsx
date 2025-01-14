import { useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed w-full bg-white shadow-sm z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-wider italic uppercase">
              <span className="text-primary font-extrabold">Доктор</span>{" "}
              <span className="text-primary font-extrabold">Гаджет</span>
            </h1>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-8">
            <a href="#" className="text-gray-700 hover:text-primary transition-colors">
              Главная
            </a>
            <a href="#services" className="text-gray-700 hover:text-primary transition-colors">
              Услуги
            </a>
            <a href="#about" className="text-gray-700 hover:text-primary transition-colors">
              О нас
            </a>
            <a href="#contact" className="text-gray-700 hover:text-primary transition-colors">
              Контакты
            </a>
            <Button className="bg-primary hover:bg-primary/90 whitespace-nowrap">
              <Phone className="mr-2 h-4 w-4" />
              Заказать звонок
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-primary transition-colors"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            <div className="flex flex-col space-y-4">
              <a href="#" className="text-gray-700 hover:text-primary transition-colors">
                Главная
              </a>
              <a href="#services" className="text-gray-700 hover:text-primary transition-colors">
                Услуги
              </a>
              <a href="#about" className="text-gray-700 hover:text-primary transition-colors">
                О нас
              </a>
              <a href="#contact" className="text-gray-700 hover:text-primary transition-colors">
                Контакты
              </a>
              <Button className="bg-primary hover:bg-primary/90">
                <Phone className="mr-2 h-4 w-4" />
                Заказать звонок
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};