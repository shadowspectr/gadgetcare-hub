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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });
  const [deviceImage, setDeviceImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isLoaded, error } = useYandexMaps('2bfced98-a423-4e40-a34e-168c0237a61c');
  const [mapInitialized, setMapInitialized] = useState(false);

  useEffect(() => {
    if (isLoaded && window.ymaps && mapContainerRef.current && !mapInitialized) {
      try {
        console.log('Initializing Yandex Map...');
        
        const map = new window.ymaps.Map(mapContainerRef.current, {
          center: [47.962202, 37.881363],
          zoom: 14,
          controls: ['zoomControl', 'geolocationControl']
        });

        const placemark1 = new window.ymaps.Placemark([47.962202, 37.881363], {
          balloonContent: 'г. Донецк, ул. Октября 16А',
          hintContent: 'Доктор Гаджет'
        }, {
          preset: 'islands#blueRepairShopIcon'
        });

        const placemark2 = new window.ymaps.Placemark([47.989628, 37.901449], {
          balloonContent: 'г. Донецк, ул. Полоцкая 17 (Майский рынок)',
          hintContent: 'Доктор Гаджет'
        }, {
          preset: 'islands#blueRepairShopIcon'
        });

        const placemark3 = new window.ymaps.Placemark([48.003971, 37.806587], {
          balloonContent: 'г. Донецк, ул. Горького 150 (Скоро открытие)',
          hintContent: 'Доктор Гаджет'
        }, {
          preset: 'islands#blueRepairShopIcon'
        });

        map.geoObjects.add(placemark1).add(placemark2).add(placemark3);
        
        setMapInitialized(true);
        console.log('Map initialized successfully');
      } catch (error) {
        console.error('Ошибка при инициализации карты:', error);
      }
    }
  }, [isLoaded, mapInitialized]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Ошибка загрузки карты",
        description: "Не удалось загрузить Яндекс.Карты. Пожалуйста, попробуйте позже.",
        variant: "destructive",
      });
      console.error('Ошибка загрузки Яндекс.Карт:', error);
    }
  }, [error, toast]);

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
    
    try {
      let imageUrl = null;
      
      if (deviceImage) {
        const fileName = `device_images/${Date.now()}_${deviceImage.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('contact_uploads')
          .upload(fileName, deviceImage, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('contact_uploads')
          .getPublicUrl(fileName);
          
        imageUrl = urlData.publicUrl;
      }
      
      const { error } = await supabase.functions.invoke('send-telegram', {
        body: {
          ...formData,
          imageUrl
        }
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
                className="w-full h-full bg-gray-100"
                aria-label="Карта с адресами сервисных центров"
              >
                {!isLoaded && !error && (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    Загрузка карты...
                  </div>
                )}
                {error && (
                  <div className="w-full h-full flex items-center justify-center text-red-500">
                    Не удалось загрузить карту
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
