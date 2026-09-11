# GREEN MALL: API-контракт для frontend MVP

Документ описывает публичный REST API backend-приложения GREEN MALL, необходимый frontend для отображения карты ТЦ, поиска магазинов и построения маршрутов.

## Общие сведения

- Локальный базовый URL: `http://localhost:3000`.
- Глобальный API-префикс: `/api`.
- Формат запросов и ответов: JSON.
- Описанные ниже endpoint'ы публичные и не требуют JWT-токена.
- Идентификаторы сущностей передаются как строки.
- Nullable-поля могут иметь значение `null`; frontend должен предусматривать значения по умолчанию.
- Даты и время в `generatedAt`, `createdAt` и `updatedAt` передаются в формате ISO 8601.
- Интерактивная Swagger-документация доступна по адресу `GET /api/docs`.

Сокращённые примеры ниже показывают поля, важные для frontend, и не всегда содержат все технические поля ответа.

## 1. Проверка состояния backend

### `GET /api/health`

Назначение: быстрая проверка доступности и работоспособности backend.

Параметры: отсутствуют.

Пример запроса:

```http
GET /api/health
```

```bash
curl http://localhost:3000/api/health
```

Пример ответа `200 OK`:

```json
{
  "status": "ok"
}
```

Frontend использует:

- `status` — значение `ok` означает, что backend отвечает.
- Endpoint подходит для health-check, экрана диагностики и проверки соединения перед загрузкой карты.

## 2. Frontend-ready сцена карты

### `GET /api/public/map/scene`

Назначение: получение полной frontend-ready сцены выбранного этажа ТЦ. Ответ объединяет параметры этажа, объекты карты, навигационный граф, категории и магазины, поэтому frontend может загрузить основную сцену одним запросом.

Endpoint возвращает только активные сущности. Магазины дополнительно должны иметь `isVisible = true`.

Параметры query:

| Параметр | Тип | Обязательный | Описание |
| --- | --- | --- | --- |
| `floorId` | `string` | нет | ID этажа. Если не передан, backend выбирает первый активный этаж по `sortOrder` и `number`. |

Пример запроса:

```http
GET /api/public/map/scene?floorId=cmr4yowvx000kw35sedq47bfx
```

```bash
curl "http://localhost:3000/api/public/map/scene?floorId=cmr4yowvx000kw35sedq47bfx"
```

Сокращённый пример ответа `200 OK`:

```json
{
  "floor": {
    "id": "cmr4yowvx000kw35sedq47bfx",
    "number": 1,
    "name": "Первый этаж",
    "width": 1600,
    "height": 900,
    "depth": 300,
    "unit": "px",
    "mapImageUrl": null,
    "mapAssetId": null,
    "modelAssetId": null,
    "metadata": {
      "coordinateSystem": "mall-local"
    }
  },
  "objects": [
    {
      "id": "map-object-sportmaster",
      "type": "STORE",
      "name": "Спортмастер",
      "floorId": "cmr4yowvx000kw35sedq47bfx",
      "storeId": "store-sportmaster",
      "categoryId": "category-sport",
      "x": 620,
      "y": 280,
      "z": 0,
      "width": 160,
      "height": 100,
      "rotationX": 0,
      "rotationY": 0,
      "rotationZ": 0,
      "scaleX": 1,
      "scaleY": 1,
      "scaleZ": 1,
      "externalObjectId": "STORE_SPORTMASTER",
      "polygonData": {
        "points": [[620, 280], [780, 280], [780, 380], [620, 380]]
      },
      "metadata": null,
      "sortOrder": 10
    }
  ],
  "routeNodes": [
    {
      "id": "route-node-entrance",
      "floorId": "cmr4yowvx000kw35sedq47bfx",
      "type": "ENTRANCE",
      "code": "MAIN_ENTRANCE",
      "name": "Главный вход",
      "x": 100,
      "y": 450,
      "z": 0,
      "rotationX": null,
      "rotationY": null,
      "rotationZ": null,
      "scaleX": null,
      "scaleY": null,
      "scaleZ": null,
      "mapObjectId": "map-object-main-entrance",
      "metadata": null,
      "sortOrder": 1
    }
  ],
  "routeEdges": [
    {
      "id": "route-edge-entrance-panel",
      "floorId": "cmr4yowvx000kw35sedq47bfx",
      "fromNodeId": "route-node-entrance",
      "toNodeId": "route-node-panel-1",
      "distance": 120,
      "weight": 120,
      "isBidirectional": true,
      "metadata": null
    }
  ],
  "categories": [
    {
      "id": "category-sport",
      "name": "Спорт",
      "slug": "sport",
      "description": null,
      "icon": null,
      "sortOrder": 10
    }
  ],
  "stores": [
    {
      "id": "store-sportmaster",
      "name": "Спортмастер",
      "slug": "sportmaster",
      "description": "Спортивные товары",
      "roomNumber": "1-15",
      "categoryId": "category-sport",
      "tenantId": "tenant-sportmaster",
      "floorId": "cmr4yowvx000kw35sedq47bfx",
      "mapObjectIds": ["map-object-sportmaster"],
      "routeNodeIds": ["route-node-sportmaster"],
      "primaryMapObjectId": "map-object-sportmaster",
      "primaryRouteNodeId": "route-node-sportmaster",
      "workingHours": null,
      "searchKeywords": "спорт одежда обувь"
    }
  ],
  "meta": {
    "schemaVersion": "green-mall-map-scene/v1",
    "generatedAt": "2026-07-15T12:00:00.000Z",
    "purpose": "Frontend-ready 2D/3D mall map scene payload with navigation graph."
  }
}
```

Frontend использует:

- `floor` — размеры и единицы сцены, фон 2D-карты, ссылки на будущие ассеты и настройки этажа.
- `objects` — визуальные области магазинов и инфраструктуры; связываются с магазинами через `storeId` и с 3D-объектами через `externalObjectId`.
- `routeNodes` — координаты точек навигационного графа; `mapObjectId` связывает точку с объектом карты.
- `routeEdges` — связи между точками; `isBidirectional` определяет допустимое направление движения.
- `categories` — подписи, фильтрация и группировка объектов и магазинов.
- `stores` — карточки магазинов и готовые связи `mapObjectIds`/`routeNodeIds`.
- `meta.schemaVersion` — версия контракта сцены; её полезно сохранять в диагностике frontend.

Если требуется конкретный этаж, frontend должен всегда передавать `floorId`. Если `floorId` не существует или этаж неактивен, backend возвращает `404 Floor not found`.

## 3. Поиск магазинов

### `GET /api/public/stores/search?query=...`

Назначение: поиск доступного пользователю магазина. Backend ищет без учёта регистра по названию, slug, описанию, ключевым словам и номеру помещения. В ответ попадают только магазины с `isActive = true` и `isVisible = true`.

Параметры query:

| Параметр | Тип | Обязательный | По умолчанию | Описание |
| --- | --- | --- | --- | --- |
| `query` | `string` | нет | пустая строка | Поисковая фраза. При отсутствии возвращается список активных видимых магазинов. |
| `page` | `number` | нет | `1` | Номер страницы, начиная с 1. |
| `limit` | `number` | нет | `20` | Размер страницы от 1 до 50. |

Пример запроса:

```http
GET /api/public/stores/search?query=спорт&page=1&limit=20
```

```bash
curl "http://localhost:3000/api/public/stores/search?query=%D1%81%D0%BF%D0%BE%D1%80%D1%82&page=1&limit=20"
```

Сокращённый пример ответа `200 OK`:

```json
[
  {
    "id": "store-sportmaster",
    "name": "Спортмастер",
    "slug": "sportmaster",
    "roomNumber": "1-15",
    "category": {
      "id": "category-sport",
      "name": "Спорт",
      "slug": "sport"
    },
    "description": "Спортивные товары",
    "primaryMapObjectId": "map-object-sportmaster",
    "mapObjectIds": ["map-object-sportmaster"],
    "primaryRouteNodeId": "route-node-sportmaster",
    "routeNodeIds": ["route-node-sportmaster"],
    "searchKeywords": "спорт одежда обувь"
  }
]
```

Frontend использует:

- `id`, `name`, `slug`, `description`, `roomNumber`, `category` — вывод результата поиска и карточки магазина.
- `slug` или `id` — передача выбранного магазина в `/api/public/routes/to-store`.
- `primaryMapObjectId` — подсветка основного объекта магазина на карте.
- `mapObjectIds` — подсветка всех объектов магазина, если их несколько.
- `primaryRouteNodeId` — целевая точка навигации, вычисленная backend.
- `routeNodeIds` — все активные маршрутные точки, связанные с объектами магазина.
- `searchKeywords` — вспомогательное поле; основную поисковую логику выполняет backend.

Пустой результат возвращается как `[]`.

## 4. Маршрут до магазина

### `GET /api/public/routes/to-store`

Назначение: построение маршрута от стартовой навигационной точки до выбранного магазина. Frontend не требуется самостоятельно находить конечный `RouteNode`: backend определяет активный узел магазина типа `STORE_ANCHOR` и строит маршрут по активному графу.

Параметры query:

| Параметр | Тип | Обязательный | Описание |
| --- | --- | --- | --- |
| `fromNodeId` | `string` | да | ID стартового route node, например точки панели или входа. |
| `storeId` | `string` | условно | ID магазина. |
| `storeSlug` | `string` | условно | Slug магазина. Рекомендуемый идентификатор для URL frontend. |
| `storeCode` | `string` | условно | Код связанного route node либо slug магазина. |
| `floorId` | `string` | нет | Ограничивает поиск целевой точки и построение маршрута указанным этажом. |

Нужно передать один из параметров `storeId`, `storeSlug` или `storeCode`. Рекомендуется передавать только один идентификатор. Если передано несколько, текущий приоритет: `storeId`, затем `storeSlug`, затем `storeCode`.

Пример запроса:

```http
GET /api/public/routes/to-store?fromNodeId=route-node-entrance&storeSlug=sportmaster&floorId=cmr4yowvx000kw35sedq47bfx
```

```bash
curl "http://localhost:3000/api/public/routes/to-store?fromNodeId=route-node-entrance&storeSlug=sportmaster&floorId=cmr4yowvx000kw35sedq47bfx"
```

Сокращённый пример ответа `200 OK`:

```json
{
  "fromNode": {
    "id": "route-node-entrance",
    "name": "Главный вход",
    "type": "ENTRANCE",
    "floorId": "cmr4yowvx000kw35sedq47bfx",
    "x": 100,
    "y": 450,
    "z": 0
  },
  "targetStore": {
    "id": "store-sportmaster",
    "name": "Спортмастер",
    "slug": "sportmaster",
    "roomNumber": "1-15",
    "primaryMapObjectId": "map-object-sportmaster",
    "primaryRouteNodeId": "route-node-sportmaster"
  },
  "toNode": {
    "id": "route-node-sportmaster",
    "name": "Спортмастер",
    "type": "STORE_ANCHOR",
    "x": 620,
    "y": 330,
    "z": 0
  },
  "nodes": [
    { "id": "route-node-entrance", "name": "Главный вход" },
    { "id": "route-node-panel-1", "name": "Панель навигации 1" },
    { "id": "route-node-sportmaster", "name": "Спортмастер" }
  ],
  "edges": [
    {
      "id": "route-edge-entrance-panel",
      "fromNodeId": "route-node-entrance",
      "toNodeId": "route-node-panel-1",
      "distance": 120,
      "weight": 120,
      "isBidirectional": true
    }
  ],
  "totalDistance": 280,
  "totalWeight": 280,
  "routePath": [
    {
      "nodeId": "route-node-entrance",
      "type": "ENTRANCE",
      "name": "Главный вход",
      "code": "MAIN_ENTRANCE",
      "x": 100,
      "y": 450,
      "z": 0,
      "floorId": "cmr4yowvx000kw35sedq47bfx",
      "floorNumber": 1,
      "mapObjectId": "map-object-main-entrance",
      "sortOrder": 1
    },
    {
      "nodeId": "route-node-sportmaster",
      "type": "STORE_ANCHOR",
      "name": "Спортмастер",
      "code": "STORE_SPORTMASTER",
      "x": 620,
      "y": 330,
      "z": 0,
      "floorId": "cmr4yowvx000kw35sedq47bfx",
      "floorNumber": 1,
      "mapObjectId": "map-object-sportmaster",
      "sortOrder": 20
    }
  ],
  "routeSegments": [
    {
      "edgeId": "route-edge-entrance-panel",
      "fromNodeId": "route-node-entrance",
      "toNodeId": "route-node-panel-1",
      "from": { "x": 100, "y": 450, "z": 0 },
      "to": { "x": 220, "y": 450, "z": 0 },
      "distance": 120,
      "weight": 120,
      "isBidirectional": true,
      "floorId": "cmr4yowvx000kw35sedq47bfx",
      "label": null
    }
  ],
  "instructions": [
    {
      "order": 1,
      "type": "START",
      "title": "Начните маршрут от: Главный вход",
      "description": "Начальная точка маршрута.",
      "nodeId": "route-node-entrance",
      "x": 100,
      "y": 450,
      "z": 0
    },
    {
      "order": 3,
      "type": "ARRIVE",
      "title": "Вы прибыли: Спортмастер",
      "description": "Конечная точка маршрута.",
      "nodeId": "route-node-sportmaster",
      "x": 620,
      "y": 330,
      "z": 0
    }
  ],
  "meta": {
    "schemaVersion": "green-mall-route-to-store-v2",
    "generatedAt": "2026-07-15T12:00:00.000Z",
    "purpose": "Frontend-ready route from navigation node to selected store",
    "rendering": {
      "supports2D": true,
      "supports3D": true,
      "coordinateSystem": "mall-local",
      "usesXYZ": true
    }
  }
}
```

Frontend использует:

- `targetStore` — выбранный магазин и его основные связи с картой.
- `routePath` — основной упорядоченный массив точек для polyline/line geometry в 2D или 3D. Для отрисовки линии обычно достаточно координат `x`, `y`, `z` в этом массиве.
- `routeSegments` — упорядоченные сегменты с информацией о рёбрах, направлениях, длине и весе.
- `instructions` — готовые шаги маршрута для текстовой панели интерфейса.
- `nodes` и `edges` — полные сущности найденного маршрута, если frontend нужны дополнительные свойства графа.
- `totalDistance` — суммарная длина маршрута; используется для отображения расстояния.
- `totalWeight` — суммарная стоимость пути, по которой выбирался кратчайший маршрут.
- `meta.rendering` — возможности и система координат ответа.

Основные ошибки:

- `400 Bad Request` — не передан ни один идентификатор магазина.
- `404 Store not found` — активный видимый магазин не найден.
- `404 Store route node not found` — у магазина нет подходящего активного узла `STORE_ANCHOR`.
- `404 From route node not found` — стартовый узел не найден или неактивен.
- `404 Route not found` — между точками нет доступного пути.

## 5. Граф маршрутов этажа

### `GET /api/public/floors/:floorId/route-graph`

Назначение: получение активного навигационного графа конкретного этажа. Endpoint полезен редактору/визуализатору графа и frontend, которому нужны полные сущности узлов и рёбер отдельно от сцены.

Параметры path:

| Параметр | Тип | Обязательный | Описание |
| --- | --- | --- | --- |
| `floorId` | `string` | да | ID активного этажа. |

Пример запроса:

```http
GET /api/public/floors/cmr4yowvx000kw35sedq47bfx/route-graph
```

```bash
curl http://localhost:3000/api/public/floors/cmr4yowvx000kw35sedq47bfx/route-graph
```

Сокращённый пример ответа `200 OK`:

```json
{
  "floor": {
    "id": "cmr4yowvx000kw35sedq47bfx",
    "number": 1,
    "name": "Первый этаж",
    "width": 1600,
    "height": 900,
    "depth": 300,
    "unit": "px",
    "modelAssetId": null,
    "metadata": null,
    "isActive": true
  },
  "nodes": [
    {
      "id": "route-node-entrance",
      "floorId": "cmr4yowvx000kw35sedq47bfx",
      "type": "ENTRANCE",
      "name": "Главный вход",
      "code": "MAIN_ENTRANCE",
      "x": 100,
      "y": 450,
      "z": 0,
      "mapObjectId": "map-object-main-entrance",
      "metadata": null,
      "sortOrder": 1,
      "isActive": true
    }
  ],
  "edges": [
    {
      "id": "route-edge-entrance-panel",
      "floorId": "cmr4yowvx000kw35sedq47bfx",
      "fromNodeId": "route-node-entrance",
      "toNodeId": "route-node-panel-1",
      "distance": 120,
      "weight": 120,
      "isBidirectional": true,
      "metadata": null,
      "isActive": true
    }
  ]
}
```

Frontend использует:

- `floor` — контекст и размеры этажа.
- `nodes` — вершины графа и их координаты.
- `edges` — соединения вершин; направление задаётся `fromNodeId`, `toNodeId` и `isBidirectional`.
- `distance` — физическая/визуальная длина сегмента, если задана.
- `weight` — стоимость сегмента для алгоритма маршрутизации; если отсутствует, backend использует `distance`, затем значение `1`.
- `metadata` — дополнительные параметры узла или ребра, включая необязательную подпись сегмента.

Если этаж не найден или неактивен, backend возвращает `404 Floor not found`.

## Поля, подготовленные для 2D/3D-карты

### Координаты `x`, `y`, `z`

- `x` и `y` задают положение в локальной системе координат этажа и используются для 2D-карты.
- `z` задаёт высоту/глубину точки в 3D-сцене.
- У `routeNodes` в scene-ответе `x` и `y` обязательны, а `z` может быть `null`.
- В `routePath` и `routeSegments` backend всегда отдаёт числовой `z`; отсутствующее значение преобразуется в `0`.
- Для прямой отрисовки маршрута frontend должен использовать упорядоченные координаты из `routePath`.

### Размеры `width`, `height`, `depth`

- `floor.width` и `floor.height` задают рабочую область этажа.
- `floor.depth` задаёт глубину будущей 3D-сцены.
- `objects[].width` и `objects[].height` задают размеры объекта карты.
- Поле `floor.unit` определяет единицы измерения, например `px`, `meter` или `cm`.
- Nullable-размеры требуют согласованных значений по умолчанию на frontend.

### Поворот `rotationX`, `rotationY`, `rotationZ`

- Опциональные значения поворота объекта или route node по трём осям.
- До фиксации формата 3D-импорта frontend должен читать правила единиц угла из `metadata`; если значение отсутствует, применяется поворот `0`.

### Масштаб `scaleX`, `scaleY`, `scaleZ`

- Опциональные коэффициенты масштаба по трём осям.
- Если значение равно `null`, frontend рекомендуется использовать `1`.

### `polygonData` / `geometry`

- В публичном API геометрия объекта карты называется `polygonData`.
- Внутри backend/БД это значение хранится в поле `geometry`.
- Формат — произвольный JSON; текущий типичный вариант: `{ "points": [[x, y], ...] }`.
- Frontend не должен ожидать, что `polygonData` присутствует у каждого объекта.

### `externalObjectId`

- Стабильный внешний идентификатор объекта карты.
- Предназначен для сопоставления backend-сущности `MapObject` с именем/ID mesh, node или другого объекта будущей 3D-сцены.
- Frontend может построить индекс `externalObjectId -> sceneObject` после загрузки модели.

### `mapAssetId`

- ID будущего ассета 2D-карты этажа.
- Возвращается в `floor` endpoint'а `/api/public/map/scene`.
- Сейчас поле может быть `null`; сам механизм загрузки ассетов является отдельным этапом.

### `modelAssetId`

- ID будущего ассета 3D-модели этажа.
- Может использоваться frontend для выбора GLB/GLTF/FBX-ресурса после реализации файлового API.
- Сейчас поле может быть `null`.

### `metadata`

- Произвольный JSON с дополнительными настройками этажа, объекта, узла или ребра.
- Подходит для параметров отображения, материалов, слоёв, видимости, подписей и настроек импорта, которые не требуют отдельного обязательного поля контракта.
- Frontend должен обрабатывать неизвестные ключи толерантно и не считать `metadata` обязательным.

## Подготовка к будущему импорту из Autodesk 3ds Max

Импорт 3D-моделей на текущем этапе не реализуется. Backend уже хранит базовые поля, необходимые для связи объектов цифровой карты с будущей 3D-сценой:

- `externalObjectId` можно использовать для сопоставления `MapObject` с объектом внутри экспортированной 3D-сцены.
- `modelAssetId` и `mapAssetId` можно использовать для связи этажа с будущими ассетами 3D-модели и 2D-карты.
- `x`, `y`, `z`, rotation и scale позволяют хранить базовое преобразование объектов и маршрутных точек.
- `metadata` можно использовать для дополнительных параметров 3D-отображения и импорта без немедленного расширения основного контракта.
- `/api/public/map/scene` уже объединяет сцену и навигационный граф в одном frontend-ready ответе.

Загрузку GLB/GLTF/FBX, хранение файлов и импорт модели из Autodesk 3ds Max следует реализовать отдельным этапом после подключения frontend и фиксации правил экспорта: единиц измерения, осей координат, origin/pivot, именования объектов и формата материалов.

## Что готово для frontend MVP

- Backend отдаёт карту ТЦ и параметры активного этажа.
- Backend отдаёт активные объекты карты и их связи с магазинами и категориями.
- Backend отдаёт активные и видимые магазины.
- Backend поддерживает поиск магазинов.
- Backend строит маршрут от route node до выбранного магазина.
- Backend возвращает координаты, упорядоченный `routePath`, сегменты и инструкции для отрисовки маршрута.
- Backend уже содержит базовые поля для будущей 2D/3D-интеграции.

