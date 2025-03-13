
import { useEffect, useState } from 'react';

interface YandexMapsState {
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Хук для загрузки API Яндекс.Карт
 * @param apiKey - Ключ API Яндекс.Карт
 */
export const useYandexMaps = (apiKey: string) => {
  const [state, setState] = useState<YandexMapsState>({
    isLoaded: false,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    // Проверяем, доступно ли API если скрипт уже загружен
    if (window.ymaps && window.ymaps.ready) {
      setState({ isLoaded: true, isLoading: false, error: null });
      return;
    }

    // Проверяем, что скрипт еще не загружается
    if (state.isLoading) {
      return;
    }

    const existingScript = document.getElementById('yandex-maps-script');
    if (existingScript) {
      // Если скрипт уже существует, но API еще не готово
      setState({ isLoaded: false, isLoading: true, error: null });
      
      // Проверим готовность API
      if (window.ymaps) {
        window.ymaps.ready(() => {
          setState({ isLoaded: true, isLoading: false, error: null });
          console.log('Yandex Maps API loaded from existing script');
        });
      }
      return;
    }

    // Асинхронная загрузка скрипта Яндекс.Карт
    const loadYandexMaps = () => {
      setState({ isLoaded: false, isLoading: true, error: null });
      
      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
      script.id = 'yandex-maps-script';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (window.ymaps) {
          window.ymaps.ready(() => {
            setState({ isLoaded: true, isLoading: false, error: null });
            console.log('Yandex Maps API loaded successfully');
          });
        }
      };
      
      script.onerror = (error) => {
        console.error('Error loading Yandex Maps script:', error);
        setState({ 
          isLoaded: false, 
          isLoading: false, 
          error: new Error('Failed to load Yandex Maps API') 
        });
      };
      
      document.body.appendChild(script);
    };
    
    // Загрузим карты сразу, не дожидаясь полной загрузки страницы
    loadYandexMaps();
    
    // Очистка при размонтировании
    return () => {
      // Не удаляем скрипт, чтобы не нарушить работу других компонентов
    };
  }, [apiKey]);

  return state;
};

// Объявление типов для глобальных переменных
declare global {
  interface Window {
    ymaps: any;
  }
}
