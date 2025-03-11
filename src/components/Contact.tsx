
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const Contact = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });

  // Инициализация карты Яндекс
  useEffect(() => {
    // Проверяем, загружен ли Яндекс API и существует ли контейнер для карты
    if (window.ymaps && mapContainerRef.current) {
      const initMap = () => {
        // Проверяем, что карта еще не была инициализирована в этом контейнере
        if (mapContainerRef.current?.innerHTML !== '') {
          return;
        }
        
        try {
          const map = new window.ymaps.Map(mapContainerRef.current, {
            center: [48.0020302, 37.8037703],
            zoom: 14,
            controls: ['zoomControl', 'geolocationControl']
          });

          // Добавляем метки на карту
          const placemark1 = new window.ymaps.Placemark([48.0020302, 37.8037703], {
            balloonContent: 'г. Донецк, ул. Октября 16А',
            hintContent: 'Доктор Гаджет'
          }, {
            preset: 'islands#blueRepairShopIcon'
          });

          const placemark2 = new window.ymaps.Placemark([48.0059386, 37.8238506], {
            balloonContent: 'г. Донецк, ул. Полоцкая 17 (Майский рынок)',
            hintContent: 'Доктор Гаджет'
          }, {
            preset: 'islands#blueRepairShopIcon'
          });

          const placemark3 = new window.ymaps.Placemark([48.0149863, 37.8066252], {
            balloonContent: 'г. Донецк, ул. Горького 150 (Скоро открытие)',
            hintContent: 'Доктор Гаджет'
          }, {
            preset: 'islands#blueRepairShopIcon'
          });

          map.geoObjects.add(placemark1).add(placemark2).add(placemark3);
        } catch (error) {
          console.error('Ошибка при инициализации карты:', error);
        }
      };

      // Если API уже готов - инициализируем карту
      if (window.ymaps.ready) {
        window.ymaps.ready(initMap);
      } else {
        // Иначе ждем готовности API
        const checkYmapsReady = setInterval(() => {
          if (window.ymaps && window.ymaps.ready) {
            window.ymaps.ready(initMap);
            clearInterval(checkYmapsReady);
          }
        }, 300);
        
        // Очистка интервала при размонтировании компонента
        return () => clearInterval(checkYmapsReady);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.functions.invoke('send-telegram', {
        body: formData
      });

      if (error) throw error;

      toast({
        title: "Заявка отправлена",
        description: "Мы свяжемся с вами в ближайшее время",
      });

      setFormData({
        name: '',
        phone: '',
        message: ''
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заявку. Пожалуйста, попробуйте позже.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <section id="contact" className="py-12 sm:py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Свяжитесь с нами</h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Оставьте заявку, и мы перезвоним вам в течение 15 минут
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ваше имя
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm sm:text-base"
                  placeholder="Иван Иванов"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Телефон
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm sm:text-base"
                  placeholder="+7 (949) 999-99-99"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сообщение
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm sm:text-base"
                  rows={4}
                  placeholder="Опишите проблему..."
                  required
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? 'Отправка...' : 'Отправить заявку'}
              </Button>
            </form>
          </div>
          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Контактная информация</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-primary mr-3" />
                  <a href="tel:+79495042226" className="text-sm sm:text-base hover:text-primary">+7 (949) 504-22-26</a>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-primary mr-3" />
                  <a href="mailto:info@doctor-gadget.ru" className="text-sm sm:text-base hover:text-primary">info@doctor-gadget.ru</a>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-primary mr-3" />
                  <span className="text-sm sm:text-base">г. Донецк, ул. Октября 16А</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-primary mr-3" />
                  <span className="text-sm sm:text-base">г. Донецк, ул. Полоцкая 17 (Майский рынок)</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-primary mr-3" />
                  <span className="text-sm sm:text-base">г. Донецк, ул. Горького 150 (Скоро открытие)</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-primary mr-3" />
                  <span className="text-sm sm:text-base">Пн-Вс: 09:00 - 17:00</span>
                </div>
              </div>
            </div>
            <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-lg">
              <div 
                id="yandexMap" 
                ref={mapContainerRef} 
                className="w-full h-full"
                aria-label="Карта с адресами сервисных центров"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Объявление типов для глобальных переменных
declare global {
  interface Window {
    ymaps: any;
  }
}
