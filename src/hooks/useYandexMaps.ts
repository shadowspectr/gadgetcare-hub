
import { useEffect } from 'react';

/**
 * Хук для загрузки API Яндекс.Карт
 * @param apiKey - Ключ API Яндекс.Карт
 */
export const useYandexMaps = (apiKey: string) => {
  useEffect(() => {
    // Проверяем, что скрипт еще не загружен
    if (document.getElementById('yandex-maps-script')) {
      return;
    }

    // Асинхронная загрузка скрипта Яндекс.Карт
    const loadYandexMaps = () => {
      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
      script.id = 'yandex-maps-script';
      script.async = true;
      document.body.appendChild(script);
    };
    
    // Загрузим карты после полной загрузки страницы
    if (document.readyState === 'complete') {
      loadYandexMaps();
    } else {
      window.addEventListener('load', loadYandexMaps);
      return () => window.removeEventListener('load', loadYandexMaps);
    }
  }, [apiKey]);
};
