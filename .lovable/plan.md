
# План: Восстановление доступа и добавление Google авторизации

## Ситуация

В базе данных уже существует пользователь с email `marcericcid@gmail.com`, но у него нет роли администратора. Сейчас роль admin есть только у `admi1@example.com` и `admin@example.com`.

## Что будет сделано

### 1. Восстановление доступа к админ-панели

**Действия с базой данных:**
- Назначить роль `admin` пользователю `marcericcid@gmail.com`
- Очистить старые тестовые аккаунты (`admin@example.com`, `admi1@example.com`) и их роли

После этого вы сможете войти через стандартную форму авторизации на `/auth` используя email `marcericcid@gmail.com` и ваш существующий пароль.

### 2. Добавление авторизации через Google

Lovable Cloud уже поддерживает Google OAuth без дополнительной настройки. Добавлю кнопку "Войти через Google" на страницу авторизации.

**Изменения в коде:**
- Настрою Google OAuth через Lovable Cloud
- Обновлю страницу `/auth` - добавлю кнопку "Войти через Google"
- Добавлю автоматическое создание роли admin для первого пользователя Google

### 3. Улучшение страницы авторизации

- Новый дизайн с логотипом "Доктор Гаджет"
- Кнопка "Войти через Google" (быстрый вход одним кликом)
- Стандартная форма email/пароль (как альтернатива)
- Ссылка "Забыли пароль?" для восстановления

## Схема авторизации

```text
+------------------+     +------------------+
|  Страница /auth  |     |   Lovable Cloud  |
|                  |     |                  |
|  [Google]  ------+---> |  OAuth Provider  |
|                  |     |                  |
|  [Email/Pass] ---+---> |  Supabase Auth   |
+------------------+     +--------+---------+
                                  |
                                  v
                         +--------+---------+
                         |    user_roles    |
                         |                  |
                         |  Проверка роли   |
                         |  admin/employee  |
                         +--------+---------+
                                  |
                                  v
                         +------------------+
                         |  Админ-панель    |
                         |  /admin          |
                         +------------------+
```

## Результат

1. Вы сможете войти в админ-панель через Google (1 клик) или email/пароль
2. Ваш аккаунт `marcericcid@gmail.com` получит роль администратора
3. Старые тестовые аккаунты будут удалены

## Технические детали

**Миграция базы данных:**
```sql
-- Назначить роль admin пользователю marcericcid@gmail.com
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM profiles
WHERE email = 'marcericcid@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Удалить тестовые аккаунты
DELETE FROM user_roles WHERE user_id IN (
  SELECT id FROM profiles 
  WHERE email IN ('admin@example.com', 'admi1@example.com')
);
DELETE FROM profiles 
WHERE email IN ('admin@example.com', 'admi1@example.com');
```

**Обновление Auth.tsx:**
- Интеграция с `lovable.auth.signInWithOAuth('google')`
- Новый UI с двумя вариантами входа
- Обработка ошибок и сообщений

