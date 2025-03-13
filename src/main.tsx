
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Немедленное выполнение функции
(function() {
  // Проверяем, доступен ли DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  function initApp() {
    try {
      const rootElement = document.getElementById("root");
      if (!rootElement) {
        console.error('Failed to find the root element');
        return;
      }

      const root = createRoot(rootElement);

      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      
      console.log('Application initialized successfully');
    } catch (error) {
      console.error('Error initializing application:', error);
      // Показываем сообщение об ошибке на странице
      const rootElement = document.getElementById("root");
      if (rootElement) {
        rootElement.innerHTML = `
          <div style="padding: 20px; text-align: center;">
            <h2>Произошла ошибка при загрузке приложения</h2>
            <p>Пожалуйста, обновите страницу или свяжитесь с администратором.</p>
            <button onclick="window.location.reload()" style="padding: 8px 16px; margin-top: 10px;">
              Обновить страницу
            </button>
          </div>
        `;
      }
    }
  }
})();
