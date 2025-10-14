import { Phone, Mail, MapPin, Clock, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useYandexMaps } from "@/hooks/useYandexMaps";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Contact = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [mapUrl, setMapUrl] = useState<string>("");
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });
  const [deviceImage, setDeviceImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchMapUrl = async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "yandex_map_url")
        .maybeSingle();

      if (data?.value) {
        setMapUrl(data.value);
      }
    };

    fetchMapUrl();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Ошибка",
          description: "Размер изображения не должен превышать 5МБ",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.match('image/*')) {
        toast({
          title: "Ошибка",
          description: "Пожалуйста, загрузите изображение",
          variant: "destructive",
        });
        return;
      }
      
      setDeviceImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const clearImageSelection = () => {
    setDeviceImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingStep("Подготовка данных");
    
    try {
      const requestData = {
        ...formData,
        imageBase64: imagePreview
      };
      
      setLoadingStep("Отправка данных");
      
      const { data, error } = await supabase.functions.invoke('send-telegram', {
        body: requestData
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
      clearImageSelection();
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заявку. Пожалуйста, попробуйте позже.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingStep("");
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
    <section id="contact" className="py-12 sm:py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
          <div className="space-y-6 sm:space-y-8 animate-fade-in">
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
              
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Фото устройства (необязательно)
                </Label>
                <div className="mt-1 flex items-center gap-4">
                  <Input
                    type="file"
                    id="device-image"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full text-sm sm:text-base"
                    disabled={isLoading}
                  />
                  {imagePreview && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={clearImageSelection}
                      disabled={isLoading}
                    >
                      Удалить
                    </Button>
                  )}
                </div>
                {imagePreview && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-2">Предпросмотр:</p>
                    <div className="relative w-40 h-40 border rounded-md overflow-hidden">
                      <img 
                        src={imagePreview} 
                        alt="Предпросмотр фото устройства" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Максимальный размер файла: 5МБ</p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {loadingStep ? loadingStep : 'Отправка...'}
                  </span>
                ) : 'Отправить заявку'}
              </Button>
            </form>
          </div>
          <div className="space-y-6 sm:space-y-8 animate-slide-in">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg hover-lift border border-gray-100">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 text-primary">Контактная информация</h3>
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
            <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
              {mapUrl ? (
                <iframe
                  src={mapUrl}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allowFullScreen
                  style={{ position: 'relative' }}
                  title="Яндекс Карта"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                  Карта не настроена. Добавьте ссылку на карту в админ панели.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
