# GREEN MALL Backend

Backend API for the GREEN MALL digital navigation, advertising and analytics platform.

## Stack

- Node.js
- NestJS
- TypeScript
- REST API
- Swagger/OpenAPI
- class-validator
- class-transformer

Prisma and PostgreSQL are intentionally not connected at this stage.

## Installation

```bash
npm install
```

## PostgreSQL

Start PostgreSQL with Docker Compose:

```bash
docker compose up -d postgres
```

The local connection string is configured in `.env`:

```text
DATABASE_URL="postgresql://green_mall:green_mall_password@localhost:5433/green_mall?schema=public"
```

## Prisma

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate
```

Open Prisma Studio:

```bash
npm run prisma:studio
```

Run seed:

```bash
npm run prisma:seed
```

## Run

```bash
npm run start:dev
```

The backend starts on `http://localhost:3000` by default.

## Build

```bash
npm run build
```

## Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok"
}
```

## Swagger

Open:

```text
http://localhost:3000/api/docs
```

## Auth

Seed creates a test super administrator:

```text
email: admin@greenmall.local
password: Admin12345!
```

Login endpoint:

```text
POST /api/auth/login
```

Current user endpoint:

```text
GET /api/auth/me
```

Use the returned `accessToken` as a Bearer token in Swagger or API clients.
