import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Contact = () => {
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
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ваше имя
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm sm:text-base"
                  placeholder="Иван Иванов"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Телефон
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm sm:text-base"
                  placeholder="+7 (999) 999-99-99"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сообщение
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm sm:text-base"
                  rows={4}
                  placeholder="Опишите проблему..."
                />
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90">
                Отправить заявку
              </Button>
            </form>
          </div>
          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Контактная информация</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-primary mr-3" />
                  <span className="text-sm sm:text-base">+7 (999) 999-99-99</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-primary mr-3" />
                  <span className="text-sm sm:text-base">info@doctor-gadget.ru</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-primary mr-3" />
                  <span className="text-sm sm:text-base">г. Москва, ул. Примерная, д. 1</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-primary mr-3" />
                  <span className="text-sm sm:text-base">Пн-Вс: 10:00 - 20:00</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-200 h-48 sm:h-64 rounded-lg">
              {/* Here you would integrate a real map */}
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm sm:text-base">
                Карта сервисных центров
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};