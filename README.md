# Проектная работа "WebLarek. Плохой сервер.", спринт 17

Аудит безопасности и устранение уязвимостей бэкенда WebLarek.

## Автор
- Имя: Кирилл
- Когорта: 42
- Курс: FullStack

## Репозиторий
https://github.com/Khodarevskii/bad-server


## Подготовка к работе
1. Склонировать репозиторий.
2. Запустить docker:
   ```bash
   docker compose up -d
   ```
3. Наполнить базу данных по инструкции из [.dump/README.md](.dump%2FREADME.md).
   После замены `md5` на `bcrypt` предзаполненные пароли пользователей нужно
   пересоздать — либо через регистрацию через интерфейс
   (`http://localhost/register`), либо обновить дамп.
4. Открыть `http://localhost/` — на странице должны быть продукты.
5. Авторизация — `http://localhost/login/`.
6. Админка — `http://localhost/admin/`.

## Что было сделано
Аудит и устранение уязвимостей по чек-листу.

### XSS
- Поле `comment` заказа санитизируется на бэкенде через `sanitize-html`
  (`controllers/order.ts`, функция `sanitizeUserHtml`).
- На фронтенде комментарий проходит дополнительную санитизацию через
  `dompurify` (`utils/sanitize-html.ts`) перед `dangerouslySetInnerHTML`
  в `admin-order-detail.tsx` и `profile-order-detail.tsx`.
- Отключён `X-Powered-By`, добавлены security-заголовки через `helmet`.

### CSRF
- Реализована защита по схеме double-submit cookie:
  - `middlewares/csrf.ts` — генерация cookie `csrfToken`, валидация
    заголовка `X-CSRF-Token` для POST/PATCH/PUT/DELETE.
  - `GET /auth/csrf` — эндпоинт для получения токена клиентом.
  - Refresh-cookie помечен `sameSite: 'strict'` и `httpOnly`.
- Фронтенд (`utils/weblarek-api.ts`) автоматически подгружает CSRF-токен
  и добавляет его в заголовок при изменяющих состояние запросах.

### NoSQL-инъекции
- Подключён `express-mongo-sanitize` для удаления операторов `$`/`.`
  из входных данных.
- Логин и регистрация явно проверяют, что `email`/`password` — строки.
- Фильтр `status` и `sortField` теперь принимают только значения из
  whitelisted-списка, чтобы запрос вида `?status[$gt]=` не работал.
- В контроллере заказов `req.params.orderNumber` приводится к числу
  и валидируется через `Number.isInteger`.
- Все идентификаторы (`/customers/:id`, `/order/:orderNumber`) проверяются
  через `Types.ObjectId.isValid` или `Number.isInteger` до запроса в БД.

### Переполнение буфера / лимиты
- `express.json({ limit: '10kb' })` и `express.urlencoded({ limit: '10kb' })`.
- `multer` ограничен `fileSize: 5 МБ`, `files: 1`, allowlist расширений и
  MIME-типов; имя файла генерируется через `crypto.randomBytes`, чтобы
  исключить path traversal через `originalname`.
- Все валидаторы Joi имеют `min/max` для строк и чисел, массив товаров
  заказа — `max(100)`.
- Параметры `page` и `limit` ограничиваются (`Math.min(..., 100)`),
  чтобы клиент не мог вытянуть весь BLOB-датасет.

### ReDoS
- Регэкспы для поиска по строке (`new RegExp(search)`) ранее принимали
  пользовательский ввод напрямую — теперь он пропускается через
  `escapeRegExp` и обрезается до 100 символов.
- Регулярное выражение телефона переписано на безопасный вариант без
  вложенных квантификаторов.

### DDoS
- `express-rate-limit`: глобально 100 req/min, на `/auth/login` и
  `/auth/register` — 20 req/min для защиты от брутфорса.
- Body-parser лимитирует размер запроса.
- Подняты CORS-настройки с `credentials` и фиксированным origin.

### Path Traversal
- `middlewares/serverStatic.ts` — декодирует путь, отсекает null-байты,
  делает `path.resolve` и проверяет, что результат остаётся в пределах
  базового каталога.
- `utils/movingFile.ts` — то же ограничение через `ensureWithin`.
- `multer` использует генерируемое имя, а не оригинальное.

### Хеширование паролей
- Заменено хеширование `md5` на `bcryptjs` (12 раундов).
  ⚠️ Существующих пользователей из дампа после этого изменения нужно
  пересоздать.

### Авторизация / эскалация привилегий
- `PATCH /auth/me` и `PATCH /customers/:id` теперь обновляют только
  whitelisted-поля (`name`, `email`, `phone`), что исключает изменение
  `roles`, `password` или `tokens` через тело запроса.
- На все эндпоинты `/customers/*` добавлен `roleGuardMiddleware(Admin)`.
- Исправлен `getCurrentUserRoles` (раньше передавал `req.body` в
  `findById` как projection — это позволяло манипулировать выборкой).

### Обработчик ошибок
- Сервер больше не отдаёт stack-trace и не логирует подробности 4xx,
  чтобы не утекали внутренние данные.

### Аудит npm
- `npm audit` — 0 уязвимостей и в `backend`, и в `frontend`.
- Удалена устаревшая зависимость `md5` (заменена на `bcryptjs`).
- Подняты `vite` до 7, `@vitejs/plugin-react` до 5, `vite-plugin-svgr`
  до 5, `mongoose` до 8.10.x, `validator` до 13.15.x, `express` до 4.21.x.
- Через `overrides` зафиксированы безопасные версии `lodash`,
  `brace-expansion`.

### Линтер и сборка
- `npm run lint` — без ошибок и предупреждений как в `backend`, так и
  во `frontend`.
- `npm run build` — успешно собирает обе части проекта.

## Запуск проверок
```bash
# Бэкенд
cd backend
npm install
npm run lint
npm run build

# Фронтенд
cd ../frontend
npm install
npm run lint
npm run build
```

## Нагрузочное тестирование
Apache Benchmark — пример:
```bash
ab -k -c 200 -n 5000 http://localhost/api/product
```
При включённом rate limiting часть запросов отдаст 429 — это ожидаемо.
