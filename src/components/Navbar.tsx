import { useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleCallRequest = () => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const contactSection = document.getElementById('contact');
        if (contactSection) {
          contactSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleNavigation = (path: string, sectionId?: string) => {
    if (path === '/' && sectionId) {
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const section = document.getElementById(sectionId);
          if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } else {
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      navigate(path);
    }
    setIsOpen(false);
  };

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
            <button 
              onClick={() => handleNavigation('/')}
              className="text-gray-700 hover:text-primary transition-colors"
            >
              Главная
            </button>
            <button 
              onClick={() => handleNavigation('/', 'services')}
              className="text-gray-700 hover:text-primary transition-colors"
            >
              Услуги
            </button>
            <button 
              onClick={() => handleNavigation('/shop')}
              className="text-gray-700 hover:text-primary transition-colors"
            >
              Магазин
            </button>
            <button 
              onClick={() => handleNavigation('/', 'contact')}
              className="text-gray-700 hover:text-primary transition-colors"
            >
              Контакты
            </button>
            <Button 
              className="bg-primary hover:bg-primary/90 whitespace-nowrap"
              onClick={handleCallRequest}
            >
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
              <button 
                onClick={() => handleNavigation('/')}
                className="text-gray-700 hover:text-primary transition-colors text-left"
              >
                Главная
              </button>
              <button 
                onClick={() => handleNavigation('/', 'services')}
                className="text-gray-700 hover:text-primary transition-colors text-left"
              >
                Услуги
              </button>
              <button 
                onClick={() => handleNavigation('/shop')}
                className="text-gray-700 hover:text-primary transition-colors text-left"
              >
                Магазин
              </button>
              <button 
                onClick={() => handleNavigation('/', 'contact')}
                className="text-gray-700 hover:text-primary transition-colors text-left"
              >
                Контакты
              </button>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={handleCallRequest}
              >
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