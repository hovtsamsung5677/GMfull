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

Основные незавершённые зоны полного backend-продукта: загрузка и импорт ассетов, runtime-мониторинг панелей, агрегированная аналитика, отчёты и production-инфраструктура.

## 3. Технологическая основа

| Компонент    | Текущее состояние                                                           |
| ------------ | --------------------------------------------------------------------------- |
| Runtime      | Node.js                                                                     |
| Framework    | NestJS                                                                      |
| Язык         | TypeScript, strict mode                                                     |
| API          | REST, глобальный префикс `/api`                                             |
| Документация | Swagger/OpenAPI `/api/docs`                                                 |
| Валидация    | Глобальный `ValidationPipe`, whitelist, запрет неизвестных полей, transform |
| Авторизация  | JWT Bearer, Passport JWT, ролевые guards                                    |
| База данных  | PostgreSQL                                                                  |
| ORM          | Prisma                                                                      |
| CORS         | Включён, источник задаётся через `CORS_ORIGIN` либо `*`                     |

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

| Endpoint                                       | Назначение                                                  | Ключевой результат                                                             |
| ---------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `GET /api/health`                              | Проверка доступности backend                                | `{ "status": "ok" }`                                                           |
| `GET /api/public/map/scene`                    | Frontend-ready сцена выбранного или первого активного этажа | `floor`, `objects`, `routeNodes`, `routeEdges`, `categories`, `stores`, `meta` |
| `GET /api/public/stores/search`                | Поиск активных и видимых магазинов                          | Карточки магазинов, map object и route node IDs                                |
| `GET /api/public/floors/{floorId}/route-graph` | Активный граф конкретного этажа                             | `floor`, `nodes`, `edges`                                                      |
| `GET /api/public/routes/build`                 | Маршрут между двумя RouteNode                               | Полный маршрут и frontend-ready геометрия                                      |
| `GET /api/public/routes/to-store`              | Маршрут от RouteNode до выбранного магазина                 | Маршрут, `targetStore`, route path и инструкции                                |

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

Текущее состояние и ограничения:

- FileAsset Admin API реализован как реестр внешних файлов по URL без загрузки и хранения бинарных данных;
- модель поддерживает `kind` и `isActive`, а DELETE выполняет защищённую мягкую деактивацию;
- реальной загрузки и хранения файлов нет;
- MapObject не имеет прямого `modelAssetId`/FileAsset relation; сейчас связь отдельного объекта с 3D-сценой предполагается через `externalObjectId` и `metadata`.

## 8. Что пока не реализовано

### Ассеты и 3D

- загрузка файлов;
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

Для `Panel` реализован защищённый административный API конфигурации:

- `GET /api/admin/panels` с поиском по code/name, фильтрами floor/status/isActive, стабильной сортировкой и пагинацией;
- `GET /api/admin/panels/:id`, `POST`, `PATCH` и идемпотентный soft-disable через `DELETE /api/admin/panels/:id`;
- активная Panel обязана иметь существующие Floor и уникальный RouteNode типа `PANEL` на том же этаже;
- PATCH проверяет итоговое объединённое состояние и различает пропущенные nullable-поля и явный `null`;
- `code` нормализуется в lowercase kebab-case, а name — по пробельным символам;
- response использует безопасные краткие проекции Floor/RouteNode и возвращает runtime-поля `status`, `appVersion`, `lastSeenAt` только для чтения;
- чтение и изменение разрешены только `SUPER_ADMIN` и `MALL_ADMIN`;
- Swagger и изолированный e2e suite покрывают CRUD, RBAC, фильтры, связи, merged PATCH и сохранение исторических AdSlot/AnalyticsEvent ссылок.

Heartbeat, автоматическое определение ONLINE/OFFLINE, обновление `lastSeenAt`/`appVersion`, alerts и эксплуатационный мониторинг Panel пока не реализованы.

Для моделей `AdCampaign`, `AdCreative` и `AdSlot` подготовлен schema-level lifecycle:

- nullable `deletedAt`;
- nullable audit-связи `createdById` и `updatedById` с User через `ON DELETE SET NULL`;
- индексы lifecycle/audit-полей;
- database constraints для периода Campaign, положительного `impressionLimit` и согласованности `targetType` с целевыми полями.

Для `AdCampaign` реализован защищённый административный NestJS API:

- `GET /api/admin/ad-campaigns` с поиском, фильтрами и пагинацией;
- `GET /api/admin/ad-campaigns/:id`;
- `POST`, `PATCH` и soft delete через `DELETE /api/admin/ad-campaigns/:id`;
- ролевая модель AdCampaign Admin API:
  - `SUPER_ADMIN` — чтение и запись;
  - `MALL_ADMIN` — чтение и запись;
  - `ADS_MANAGER` — чтение и запись;
  - `ANALYTICS_VIEWER` — доступа нет;
  - `CONTENT_MANAGER` — доступа нет;
- проверка target-полей, Tenant, Store, Promotion, периода, приоритета и лимита показов;
- заполнение `createdById` и `updatedById` из JWT;
- явные Swagger response DTO и изолированные e2e-тесты.

Роль `ANALYTICS_VIEWER` предназначена для будущего API рекламной аналитики и не имеет доступа к административному каталогу Campaign.

Для `AdCreative` реализован защищённый административный API:

- `GET /api/admin/ad-campaigns/:campaignId/creatives` с поиском, фильтрами, стабильной сортировкой и пагинацией;
- `POST /api/admin/ad-campaigns/:campaignId/creatives`;
- `GET`, `PATCH` и soft delete через `DELETE /api/admin/ad-creatives/:id`;
- роли `SUPER_ADMIN`, `MALL_ADMIN`, `ADS_MANAGER` и `CONTENT_MANAGER` имеют доступ на чтение и запись;
- `ANALYTICS_VIEWER` и остальные роли доступа не имеют;
- кампания должна существовать и не быть soft-deleted, но может быть выключенной: материалы разрешено готовить заранее;
- активный Creative обязан ссылаться на активный FileAsset типа `IMAGE`;
- неактивный draft может не иметь ассета либо ссылаться на существующий неактивный `IMAGE`;
- PATCH проверяет итоговое объединённое состояние, поддерживает явный `null` для nullable-полей и сохраняет пропущенные поля;
- DELETE устанавливает `isActive=false`, `deletedAt` и `updatedById`, не удаляя Campaign или FileAsset;
- `createdById` и `updatedById` заполняются из JWT;
- admin response формируется отдельной безопасной проекцией без FileAsset path/provider/uploadedById/metadata, Campaign metadata и password hash;
- Swagger DTO описывают nullable scalar-поля явно; изолированные e2e-тесты покрывают роли, связи, active/draft lifecycle, фильтры, merged PATCH, soft delete и безопасную проекцию.

`CONTENT_MANAGER` может управлять рекламными материалами Creative, но по-прежнему не имеет доступа к AdCampaign Admin API. Это разделяет подготовку контента и управление параметрами рекламных кампаний.

Для `AdSlot` реализован реестр рекламных мест и защищённый административный API:

- модель хранит уникальный стабильный `code`, название, описание, тип `AdPlacement`, приоритет сортировки, состояние публикации и metadata;
- слот может быть глобальным (`panelId=null`) или связанным с существующей навигационной панелью; удаление Panel обнуляет связь через `ON DELETE SET NULL`;
- `GET /api/admin/ad-slots` поддерживает поиск, фильтры по placement, Panel и активности, стабильную сортировку и пагинацию;
- `GET /api/admin/ad-slots/:id`, `POST`, `PATCH` и soft delete через `DELETE /api/admin/ad-slots/:id`;
- `code` нормализуется в lowercase kebab-case и остаётся зарезервированным после soft delete;
- `createdById` и `updatedById` заполняются из JWT, а admin response использует безопасные краткие проекции Panel и User;
- чтение и изменение разрешены только ролям `SUPER_ADMIN`, `MALL_ADMIN` и `ADS_MANAGER`; `CONTENT_MANAGER` и `ANALYTICS_VIEWER` доступа не имеют;
- Swagger и изолированные e2e-тесты покрывают CRUD, RBAC, ссылки на Panel, фильтры, merged PATCH, soft delete и lifecycle-связи.

Для `AdCampaignAssignment` реализованы модель и защищённый административный API:

- Campaign назначается на Slot с обязательным совпадением `AdPlacement`;
- поддерживаются list/get/create/update и soft delete;
- активность и lifecycle Campaign/Slot проверяются при административном изменении;
- повторная пара Campaign/Slot защищена unique constraint;
- audit-поля заполняются из JWT, а доступ разрешён `SUPER_ADMIN`, `MALL_ADMIN` и `ADS_MANAGER`.

Для runtime-рекламы реализован публичный endpoint `GET /api/public/ads/slots/:slotCode`:

- выбирается не более одной рекламы по активным Slot, Assignment, Campaign, Creative и FileAsset;
- период Campaign использует включительную границу `startsAt` и исключительную `endsAt`;
- Campaign сортируются по `priority DESC`, `createdAt DESC`, `id ASC`, Creative — по `sortOrder ASC`, `createdAt DESC`, `id ASC`;
- nullable `impressionLimit` применяется как глобальный lifetime-лимит Campaign по всем Slot, Creative и source;
- расходом лимита считаются только сохранённые `AnalyticsEvent` типа `AD_IMPRESSION`; `AD_CLICK` лимит не расходует;
- исчерпанная Campaign пропускается, после чего выбирается следующий кандидат в том же детерминированном порядке;
- ответ содержит безопасные проекции Slot, Creative, FileAsset и target; при отсутствии кандидата возвращается `200` с `ad=null`;
- получение рекламы само по себе не считается показом, не создаёт AnalyticsEvent и не резервирует quota;
- enforcement является event-based soft cap: между delivery и последующим tracking возможен concurrency overshoot, поэтому строгая верхняя граница количества показов не гарантируется; reservation/persisted-counter архитектура не реализована.

Для `AD_IMPRESSION` и `AD_CLICK` реализован публичный ingestion `POST /api/public/ads/events`:

- JWT не требуется; разрешены только источники `PANEL` и `MOBILE`;
- backend проверяет структурную связь Slot, Campaign, Creative и Assignment, но не отбрасывает запоздалое событие из-за последующего изменения lifecycle;
- `PANEL` требует существующий `panelId` и совпадение с panel-bound Slot;
- `clientEventId` обеспечивает race-safe идемпотентность через unique constraint;
- AnalyticsEvent хранит nullable-связь с AdSlot и индекс `(adSlotId, createdAt)`;
- public response является минимальным acknowledgement без внутренних analytics-полей.

Для visitor/navigation аналитики реализован отдельный публичный ingestion `POST /api/public/analytics/events`:

- JWT не требуется; разрешены источники `PANEL` и `MOBILE`, а `ADMIN` отклоняется;
- endpoint принимает session, search, category/store/promotion interaction, route, mobile/panel usage и data-load error события из утверждённого v1-контракта;
- `AD_IMPRESSION` и `AD_CLICK` остаются только в рекламном ingestion, а `QR_SCANNED` пока не принимается;
- обязательные subject-поля проверяются по типу события, а переданные Panel, Store, Category и Promotion проверяются на существование без lifecycle-фильтрации уже произошедшего события;
- `PANEL` требует `panelId`, но ingestion не изменяет `Panel.status`, `lastSeenAt` или `appVersion` и не реализует heartbeat;
- `clientEventId` обеспечивает race-safe идемпотентность с ответами `201` для нового события, `200` для идентичного replay и `409` для конфликтующей identity;
- `sessionId`, `deviceData` и `payload` сохраняются в существующих полях AnalyticsEvent, а public response остаётся минимальным acknowledgement.

Для рекламной аналитики реализован защищённый read-only API:

- `GET /api/admin/analytics/ads/summary` агрегирует показы, клики и CTR;
- `GET /api/admin/analytics/ads/breakdown` группирует те же метрики по Campaign, Creative, Slot или Panel и возвращает безопасные краткие проекции;
- источником данных служат только существующие `AnalyticsEvent` типов `AD_IMPRESSION` и `AD_CLICK`, без persisted counters и materialized views;
- фильтры по периоду `[from, to)`, Campaign, Creative, Slot, Panel и источнику можно комбинировать;
- доступ имеют `SUPER_ADMIN`, `MALL_ADMIN`, `ADS_MANAGER` и `ANALYTICS_VIEWER`; `CONTENT_MANAGER` доступа не имеет.

Пока не реализованы расписание Assignment, расширенная ротация по runtime-счётчикам, строгая hard-cap reservation архитектура, расширенные рекламные отчёты и экспорт, а также полный Analytics Admin API за пределами рекламных показов/кликов.

Не реализованы:

- Assignment scheduling, строгая quota reservation и расширенная ротация рекламных кампаний;
- QR ingestion, visitor/navigation aggregation и dashboards;
- расширенные аналитические отчёты и экспорт;
- эксплуатационный мониторинг панелей.

### Качество и эксплуатация

- в `package.json` настроена команда `test:e2e`, а критические admin/public контракты покрыты изолированными e2e suites;
- GitHub Actions workflow выполняет Prisma migrations, сборку и e2e regression с отдельным PostgreSQL service container;
- отдельного unit-test слоя пока нет;
- нет versioning/rollback данных карты;
- нет bulk import/export карты и графа;
- нет audit log административных изменений;
- нет rate limiting и документированной production security-конфигурации CORS.

### Межэтажная маршрутизация v1

Граф поддерживает одноэтажные рёбра `WALKWAY` и межэтажные переходы `ELEVATOR`, `ESCALATOR` и `STAIRS`. Вертикальные рёбра связывают активные узлы соответствующего типа на разных этажах, а Dijkstra строит единый маршрут через несколько этажей, если `floorId` не задан. При переданном `floorId` сохраняется прежний режим маршрута в пределах одного этажа. Ответ маршрута версии v3 содержит тип ребра, исходный и целевой этажи, а граф этажа включает относящиеся к нему вертикальные переходы.

## 9. Оценка готовности

Оценка является инженерной и отражает готовность backend-функций, а не готовность всего продукта к production.

| Область                       |  Оценка | Обоснование                                                                                                                                            |
| ----------------------------- | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Навигационное MVP-ядро        | **90%** | Карта, поиск, межэтажный граф, Dijkstra, маршрут до магазина и frontend-ready route path готовы. Не реализованы accessibility-профили и runtime-доступность вертикальных переходов. |
| Admin API цифровой карты      | **85%** | Основной CRUD, FileAsset registry и проверка связей готовы. Не хватает bulk import/export, versioning, audit log и визуального редактора.              |
| Готовность к 2D/3D-ассетам    | **60%** | Координаты, transform, externalObjectId, FileAsset API и связи ассетов этажа готовы. Нет загрузки, импорта моделей и прямой связи MapObject с моделью. |
| Общий backend полного проекта | **60%** | Навигационное ядро и административная конфигурация Panel сформированы, но runtime-мониторинг, полная аналитика, отчёты и production-инфраструктура ещё не реализованы. |

## 10. Рекомендуемый порядок следующих backend-этапов

1. Реализовать загрузку FileAsset и интеграцию с выбранным object storage отдельным инфраструктурным этапом.
2. Добавить автоматические e2e tests для public маршрутов и negative tests admin-валидации.
3. Зафиксировать контракт импорта GLB/GLTF: единицы, оси, origin, naming и externalObjectId.
4. Отдельно реализовать heartbeat, автоматический runtime-статус и эксплуатационный мониторинг Panel.
5. Расширить visitor/navigation аналитику агрегациями, отчётами, dashboards и экспортом отдельными этапами.
6. Спроектировать QR/share runtime contract и отдельный ingestion для `QR_SCANNED`.

## 11. Итог

Backend уже пригоден как основа frontend MVP цифровой карты: он отдаёт сцену, магазины и навигационный граф, выполняет поиск и строит frontend-ready маршруты внутри этажа и между этажами. Admin API позволяет управлять основной картографической моделью с проверкой ссылочной и этажной согласованности.

До production-ready состояния и полного объёма проекта остаются инфраструктура ассетов, runtime-мониторинг панелей, полная аналитика и эксплуатационная инфраструктура.
