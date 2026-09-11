# GREEN MALL: технический аудит backend MVP

Дата аудита: 15 июля 2026 года.

## 1. Область аудита

Проверено текущее состояние NestJS backend-проекта `green-mall-backend`: подключённые модули, REST-контроллеры, DTO, сервисы, Prisma schema, Swagger-конфигурация и frontend-ready контракты карты и маршрутов.

Аудит не включает изменение бизнес-логики, Prisma schema, миграций, seed, окружения или данных.

## 2. Краткий вывод

Backend содержит работоспособное навигационное MVP-ядро:

- JWT-аутентификацию, пользователей и роли;
- справочники этажей, категорий, арендаторов и магазинов;
- объекты цифровой карты;
- навигационный граф из RouteNode и RouteEdge;
- построение кратчайшего маршрута;
- frontend-ready сцену этажа;
- поиск магазина и построение маршрута до магазина;
- защищённый admin CRUD для основных сущностей карты;
- Swagger/OpenAPI по адресу `/api/docs`.

Основные незавершённые зоны полного backend-продукта: управление FileAsset, загрузка и импорт ассетов, межэтажная маршрутизация, панели, акции, реклама, аналитика и автоматизированные тесты.

## 3. Технологическая основа

| Компонент | Текущее состояние |
| --- | --- |
| Runtime | Node.js |
| Framework | NestJS |
| Язык | TypeScript, strict mode |
| API | REST, глобальный префикс `/api` |
| Документация | Swagger/OpenAPI `/api/docs` |
| Валидация | Глобальный `ValidationPipe`, whitelist, запрет неизвестных полей, transform |
| Авторизация | JWT Bearer, Passport JWT, ролевые guards |
| База данных | PostgreSQL |
| ORM | Prisma |
| CORS | Включён, источник задаётся через `CORS_ORIGIN` либо `*` |

## 4. Готовые backend-модули

### Auth, Users и Roles

Реализовано:

- `POST /api/auth/login`;
- `GET /api/auth/me`;
- JWT Bearer-аутентификация;
- bcrypt-хеширование паролей;
- `JwtAuthGuard`, `RolesGuard`, декораторы ролей и текущего пользователя;
- admin CRUD пользователей;
- получение списка ролей;
- проверка `isActive` пользователя при JWT-аутентификации.

Основные роли: `SUPER_ADMIN`, `MALL_ADMIN`, `CONTENT_MANAGER`, `ADS_MANAGER`, `ANALYTICS_VIEWER`.

### Floors

Реализовано:

- public-список и получение активного этажа;
- admin CRUD;
- уникальный `number`;
- мягкое отключение через `isActive = false`;
- фильтрация и пагинация;
- параметры 2D/3D-сцены;
- проверка существования `mapAssetId` и `modelAssetId` при их назначении.

Поддерживаемые поля сцены: `width`, `height`, `depth`, `unit`, `mapImageUrl`, `mapAssetId`, `modelAssetId`, `metadata`.

### Categories

Реализовано:

- public-список и получение активной категории;
- admin CRUD;
- уникальный slug;
- автоматическая генерация slug из названия;
- поиск, фильтрация по этажу и `isActive`;
- мягкое отключение.

### Tenants

Вспомогательный модуль арендаторов магазинов подключён и содержит защищённый admin CRUD. Он используется как организационная сущность магазина и не содержит функциональности управления арендой.

### Stores

Реализовано:

- public-список и получение активного видимого магазина;
- отдельный публичный поиск;
- admin CRUD;
- уникальный slug;
- связи с Tenant, Category и Floor;
- `searchKeywords`, контакты, режим работы и visibility;
- мягкое отключение;
- admin-управление `mapObjectIds` и производными `routeNodeIds`;
- `primaryMapObjectId` и `primaryRouteNodeId`;
- транзакционная проверка существования и согласованности связанных MapObject и RouteNode;
- проверка совпадения этажей Store, MapObject и RouteNode.

Primary-связи реализованы поверх существующих связей и служебной области `metadata.greenMall`, без дополнительных колонок Store.

### MapObjects

Реализовано:

- public и admin CRUD;
- типы магазинов и инфраструктуры из `MapObjectType`;
- привязка к Floor, Store и Category;
- координаты и размеры;
- 3D transform-поля;
- мягкое отключение;
- фильтры по этажу, магазину, категории, типу и активности;
- `externalObjectId` для сопоставления с объектом будущей 3D-сцены;
- `polygonData` как публичное/API-поле для Prisma-поля `geometry`;
- `geometry` как входной alias admin API;
- проверка согласованности этажей объекта, магазина и связанных маршрутных точек.

### RouteNodes

Реализовано:

- public и admin CRUD;
- типы точек из `RouteNodeType`;
- координаты `x`, `y`, `z`;
- rotation и scale;
- `code`, `metadata`, `sortOrder`;
- связь с Floor и опциональная связь с MapObject;
- проверка существования Floor и MapObject;
- проверка совпадения этажа RouteNode и MapObject;
- мягкое отключение.

### RouteEdges

Реализовано:

- public и admin CRUD;
- направленные и двунаправленные связи;
- `distance`, `weight`, `metadata`;
- проверка существования from/to RouteNode;
- запрет ребра из узла в тот же узел;
- проверка принадлежности обоих узлов выбранному этажу;
- положительные целочисленные `distance` и `weight`;
- мягкое отключение.

### Routes

Реализован Dijkstra algorithm по активным RouteNode и RouteEdge.

Логика стоимости ребра:

1. Используется `weight`, если он задан.
2. Иначе используется `distance`.
3. Иначе используется значение `1`.

Учитывается `isBidirectional`: двунаправленное ребро доступно в обе стороны, направленное — только от `fromNodeId` к `toNodeId`.

Ответ маршрута содержит:

- исходный и конечный узлы;
- упорядоченные `nodes` и `edges`;
- `totalDistance` и `totalWeight`;
- frontend-ready `routePath`;
- `routeSegments`;
- инструкции `START`, `MOVE`, `ARRIVE`;
- rendering metadata для 2D/3D.

## 5. Работающие public endpoints

Все пути ниже учитывают глобальный префикс `/api` и не требуют JWT.

| Endpoint | Назначение | Ключевой результат |
| --- | --- | --- |
| `GET /api/health` | Проверка доступности backend | `{ "status": "ok" }` |
| `GET /api/public/map/scene` | Frontend-ready сцена выбранного или первого активного этажа | `floor`, `objects`, `routeNodes`, `routeEdges`, `categories`, `stores`, `meta` |
| `GET /api/public/stores/search` | Поиск активных и видимых магазинов | Карточки магазинов, map object и route node IDs |
| `GET /api/public/floors/{floorId}/route-graph` | Активный граф конкретного этажа | `floor`, `nodes`, `edges` |
| `GET /api/public/routes/build` | Маршрут между двумя RouteNode | Полный маршрут и frontend-ready геометрия |
| `GET /api/public/routes/to-store` | Маршрут от RouteNode до выбранного магазина | Маршрут, `targetStore`, route path и инструкции |

### Параметры основных endpoint'ов

`GET /api/public/map/scene`:

- `floorId` — optional; без него выбирается первый активный этаж.

`GET /api/public/stores/search`:

- `query` — optional поисковая строка;
- `page` — optional, по умолчанию 1;
- `limit` — optional, по умолчанию 20, максимум 50.

`GET /api/public/routes/build`:

- `fromNodeId` — required;
- `toNodeId` — required;
- `floorId` — optional.

`GET /api/public/routes/to-store`:

- `fromNodeId` — required;
- один из `storeId`, `storeSlug`, `storeCode` — required;
- `floorId` — optional.

Дополнительно доступны public endpoints списков Floors, Categories, Stores, MapObjects, RouteNodes и RouteEdges, а также `/api/public/map` и `/api/public/floors/{floorId}/scene`.

## 6. Существующие admin endpoints

Admin endpoints защищены JWT и RoleGuard. Для модулей карты разрешены роли `SUPER_ADMIN`, `MALL_ADMIN`, `CONTENT_MANAGER`.

### Floors

- `GET /api/admin/floors`;
- `GET /api/admin/floors/{id}`;
- `POST /api/admin/floors`;
- `PATCH /api/admin/floors/{id}`;
- `DELETE /api/admin/floors/{id}` — мягкое отключение.

### Categories

- `GET /api/admin/categories`;
- `GET /api/admin/categories/{id}`;
- `POST /api/admin/categories`;
- `PATCH /api/admin/categories/{id}`;
- `DELETE /api/admin/categories/{id}` — мягкое отключение.

### Stores

- `GET /api/admin/stores`;
- `GET /api/admin/stores/{id}`;
- `POST /api/admin/stores`;
- `PATCH /api/admin/stores/{id}`;
- `DELETE /api/admin/stores/{id}` — мягкое отключение.

### MapObjects

- `GET /api/admin/map-objects`;
- `GET /api/admin/map-objects/{id}`;
- `POST /api/admin/map-objects`;
- `PATCH /api/admin/map-objects/{id}`;
- `DELETE /api/admin/map-objects/{id}` — мягкое отключение.

### RouteNodes

- `GET /api/admin/route-nodes`;
- `GET /api/admin/route-nodes/{id}`;
- `POST /api/admin/route-nodes`;
- `PATCH /api/admin/route-nodes/{id}`;
- `DELETE /api/admin/route-nodes/{id}` — мягкое отключение.

### RouteEdges

- `GET /api/admin/route-edges`;
- `GET /api/admin/route-edges/{id}`;
- `POST /api/admin/route-edges`;
- `PATCH /api/admin/route-edges/{id}`;
- `DELETE /api/admin/route-edges/{id}` — мягкое отключение.

Также существуют admin endpoints Users, Roles и Tenants.

## 7. Готовность к будущей 2D/3D-интеграции

### Floor

Уже подготовлены:

- `width`, `height`, `depth`;
- `unit`;
- `mapImageUrl`;
- `mapAssetId` для 2D-карты;
- `modelAssetId` для модели этажа;
- `metadata` для параметров сцены и системы координат.

### MapObject

Уже подготовлены:

- `x`, `y`, `z`;
- `width`, `height`;
- `rotationX`, `rotationY`, `rotationZ`;
- `scaleX`, `scaleY`, `scaleZ`;
- `externalObjectId`;
- `polygonData` в API и соответствующее Prisma-поле `geometry`;
- входной admin alias `geometry`;
- `metadata`.

`externalObjectId` может сопоставлять backend MapObject с mesh/node внутри будущей GLB/GLTF/FBX-сцены.

### RouteNode

Уже подготовлены:

- `x`, `y`, `z`;
- `rotationX`, `rotationY`, `rotationZ`;
- `scaleX`, `scaleY`, `scaleZ`;
- `mapObjectId`;
- `code`;
- `metadata`.

### RouteEdge и отрисовка маршрута

RouteEdge формирует проверенный граф. Route API возвращает `routePath` и `routeSegments` с координатами XYZ, поэтому frontend может строить 2D polyline или 3D line geometry без самостоятельного обхода графа.

### FileAsset

Prisma-модель `FileAsset` уже существует и содержит:

- имя файла и original name;
- MIME type и размер;
- URL, path и provider;
- metadata;
- uploadedBy relation;
- связи с картой этажа, моделью этажа, логотипами, обложками, акциями и рекламными креативами.

Текущие ограничения:

- FileAssetModule и admin CRUD отсутствуют;
- реальной загрузки и хранения файлов нет;
- у FileAsset отсутствует `isActive`, поэтому корректный soft delete потребует отдельного изменения schema и миграции;
- MapObject не имеет прямого `modelAssetId`/FileAsset relation; сейчас связь отдельного объекта с 3D-сценой предполагается через `externalObjectId` и `metadata`.

## 8. Что пока не реализовано

### Ассеты и 3D

- загрузка файлов;
- FileAsset admin CRUD;
- хранение файлов на локальном диске или в object storage;
- импорт GLB/GLTF/FBX;
- автоматический импорт данных из Autodesk 3ds Max;
- обработка геометрии, материалов и текстур;
- direct MapObject-to-model asset relation;
- визуальный редактор 2D/3D-карты.

### Frontend

- frontend-приложение;
- визуализация карты и маршрута;
- панель администратора;
- редактор навигационного графа.

### Продуктовые backend-модули

В Prisma schema существуют модели Panel, Promotion, AdCampaign, AdCreative и AnalyticsEvent, но соответствующие NestJS-модули и API сейчас не подключены.

Не реализованы:

- управление навигационными панелями;
- акции и промо-контент;
- рекламный кабинет и управление кампаниями;
- сбор и агрегация аналитики посетителей;
- аналитические отчёты и экспорт;
- эксплуатационный мониторинг панелей.

### Качество и эксплуатация

- в `package.json` нет команд unit/e2e test;
- автоматические unit, integration и e2e tests не обнаружены;
- нет CI pipeline;
- нет versioning/rollback данных карты;
- нет bulk import/export карты и графа;
- нет audit log административных изменений;
- нет rate limiting и документированной production security-конфигурации CORS.

### Ограничение маршрутизации

Текущий граф и проверки RouteEdge ориентированы на один этаж: оба узла ребра должны иметь тот же `floorId`, что и ребро. Типы ELEVATOR, ESCALATOR и STAIRS подготовлены, но единый межэтажный маршрут через вертикальные переходы пока не представлен отдельной связью.

## 9. Оценка готовности

Оценка является инженерной и отражает готовность backend-функций, а не готовность всего продукта к production.

| Область | Оценка | Обоснование |
| --- | ---: | --- |
| Навигационное MVP-ядро | **85%** | Карта, поиск, граф, Dijkstra, маршрут до магазина и frontend-ready route path готовы. Не хватает межэтажной маршрутизации и автоматических тестов. |
| Admin API цифровой карты | **85%** | Основной CRUD и проверка связей готовы. Не хватает FileAsset API, bulk import/export, versioning, audit log и визуального редактора. |
| Готовность к 2D/3D-ассетам | **60%** | Координаты, transform, externalObjectId и связи ассетов этажа готовы. Нет FileAsset API, загрузки, импорта моделей и прямой связи MapObject с моделью. |
| Общий backend полного проекта | **60%** | Навигационное ядро сформировано, но панели, акции, реклама, аналитика, отчёты и production-инфраструктура ещё не реализованы. |

## 10. Рекомендуемый порядок следующих backend-этапов

1. Согласовать жизненный цикл FileAsset и добавить `isActive`, затем реализовать admin CRUD без upload.
2. Добавить автоматические e2e tests для public маршрутов и negative tests admin-валидации.
3. Спроектировать межэтажные связи и правила вертикальной маршрутизации.
4. Зафиксировать контракт импорта GLB/GLTF: единицы, оси, origin, naming и externalObjectId.
5. Реализовать Panels и эксплуатационный статус устройств.
6. Реализовать Promotions и рекламные кампании.
7. Реализовать ingestion и агрегацию AnalyticsEvent.

## 11. Итог

Backend уже пригоден как основа frontend MVP цифровой карты одного этажа: он отдаёт сцену, магазины и навигационный граф, выполняет поиск и строит frontend-ready маршрут. Admin API позволяет управлять основной картографической моделью с проверкой ссылочной и этажной согласованности.

До production-ready состояния и полного объёма проекта остаются инфраструктура ассетов, межэтажная навигация, автоматизированное тестирование, панели, рекламно-промоциональные и аналитические модули.

