# Project Notes

Quick reference for the trade project. Keep it terse and always up to date.

## Stack
- **Frontend** (`frontend/`): Next.js 16 (App Router, server components) + React 19 + Tailwind v4 + shadcn/ui + TanStack Query v5 + Zod + lucide-react. Font: Plus Jakarta Sans.
- **Backend** (`backend/`): NestJS 11 + TypeORM 1.0 + PostgreSQL. JWT auth, bcryptjs, archiver (zip download).
- **Shared contract**: `process.env.NEXT_PUBLIC_API_URL` on the frontend (default `http://localhost:4000`).

## Frontend design system
- All visual styling lives in `app/globals.css` (tokens) + `components/system/*` (primitives). Pages compose primitives — no hardcoded colors or radii in pages/components.
- Surface model: `frame` (full-screen maroon) → `rail` (raised sidebar block) → `surface` (cards) → `popover` (dialogs).
- Accent: coral pink (`#f47e8a`) used for CTAs and highlights.
- Layout: `AppShell` (full-bleed) → `DashboardFrame` (rail + main) → `LeftRail` (vertically on `lg`, horizontally on mobile).
- Sidebar nav items live in `components/sidebar-layout.tsx`.

## API contract
> All routes are prefixed with `/api`.

### Public

| Method | Path             | Auth   | Body / Query                                  | Returns                              |
|--------|------------------|--------|-----------------------------------------------|--------------------------------------|
| POST   | `/auth/register` | -      | `{ username, password, role? }`               | `{ token, user }`                    |
| POST   | `/auth/login`    | -      | `{ username, password }`                      | `{ token, user }`                    |
| GET    | `/pokemon`       | -      | `?search=<text>&type=<Type\|All>` *(optional)* | `Pokedex[]` (server-side filtered) |
| POST   | `/pokemon/validate` | -   | `{ species, level, shiny, ... }`              | `{ valid, report }`                  |
| GET    | `/admin/pricing` | -      | -                                             | `{ retailPrice, wholesalePrice, wholesaleThreshold }` |

### Authenticated (`Authorization: Bearer <token>`)

| Method | Path                  | Auth   | Body / Query | Returns |
|--------|-----------------------|--------|--------------|---------|
| POST   | `/orders`             | user   | `{ customerName, contactInfo, pokemons[] }` | `{ orderId, totalPrice }` |
| GET    | `/orders/my-orders`   | user   | -            | `Order[]` |
| GET    | `/cart`               | user   | -            | `CartItem[]` |
| POST   | `/cart/items`         | user   | `CartConfig` | `CartItem` |
| DELETE | `/cart/items/:id`     | user   | -            | `{ success: true }` |
| DELETE | `/cart`               | user   | -            | `{ success: true }` |

### Admin only

| Method | Path                                | Auth | Body / Query | Returns |
|--------|-------------------------------------|------|--------------|---------|
| GET    | `/admin/orders`                     | admin | -           | `Order[]` |
| PATCH  | `/admin/orders/:id/status`          | admin | `{ status: "PENDING" \| "COMPLETED" \| "CANCELLED" }` | `Order` |
| GET    | `/admin/orders/:id/download`        | admin | -           | `application/zip` stream |
| PUT    | `/admin/pricing`                    | admin | `{ retailPrice, wholesalePrice, wholesaleThreshold }` | `PricingConfig` |

### Pokedex search semantics
- `search` matches `name` (case-insensitive, `LIKE`) **OR** `natDex` cast to text. Empty/whitespace returns everything.
- `type` matches `typeOne` **OR** `typeTwo` (case-insensitive equality). Pass `All` (or omit) to skip the type filter.
- No pagination: the full match set is returned (intended for the `Pokédex Nhà Vô Địch` view on the home page).
- Each `Pokedex` row may also include `spriteUrl` (string \| null) — when present, the frontend uses it directly so regional forms (Alolan, etc.) show the correct artwork instead of the base form.

### Pokedex / validate auto-fallback
- `POST /api/pokemon/validate` forwards the body to the C# microservice at `MICROSERVICE_URL/api/validate` with an extra `forceEvent: false` flag.
- If the first attempt returns a `report` containing the string "Unable to match an encounter", the backend retries once with `forceEvent: true` and returns the retry's result. A successful retry's report is suffixed with `(Đã fallback về dạng Event.)` so the user can see what happened.
- The C# microservice must accept and honour the `forceEvent` flag (fall back to the encounter-event database when set).

### Backfilling `sprite_url` for existing rows
- The new `pokemon_dex.sprite_url` column is `NULL` for rows that were seeded before the column existed. The frontend falls back to a `pokemon/{natDex}.png` URL for those, which is wrong for regional forms.
- Run `node backend/backfill-sprites.js` to populate `sprite_url` for all rows that are still `NULL`. The script is idempotent and safe to re-run.
- Set `BACKFILL_FORCE=1` to re-resolve every row (useful after changing the sprite-resolution logic).
- Set `BACKFILL_DELAY_MS=N` to change the per-request throttle (default `150`, matches `seed-dex.js`).
- Env vars (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) match `seed-dex.js`.

### Cart shape
```ts
interface CartConfig {
  speciesId: number;        // National Dex number, used as the C# service key
  speciesName: string;
  speciesSpriteUrl?: string | null;
  shiny: boolean;
  level: number;            // 1..100
  gender: "M" | "F" | "U";
  ability: string;
  nature: string;
  heldItem: string;
  moves: string[];          // up to 4, empty strings allowed
  ivs: Record<string, number>;
  evs: Record<string, number>;
  trainerName: string;
  trainerTid: number;       // 0..999999
  trainerSid: number;       // 0..999999
}

interface CartItem {
  id: number;               // server-assigned
  userId: number;
  config: CartConfig;
  createdAt: string;
  updatedAt: string;
}
```

### Order shape
```ts
interface Order {
  id: number;
  customerName: string;
  contactInfo: string;
  totalPrice: string;       // backend stores as decimal string
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  items: OrderItem[];
}
```

## Scripts

### Frontend
- `npm run dev` — start Next.js dev server.
- `npm run lint` — ESLint (no warnings allowed in CI).
- `npx tsc --noEmit` — TypeScript strict check.

### Backend
- `npm run start:dev` — NestJS watch mode.
- `npm run build` — compile to `dist/`.
- `npm run lint` — ESLint. (Current baseline has pre-existing `any` warnings in `auth/` and `shop/` — not blocking, tracked separately.)

## Known follow-ups
- (none open)
