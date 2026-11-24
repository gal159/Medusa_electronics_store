# Elektronikos komponentų internetinė parduotuvė

Baigiamasis darbas (Vilniaus kolegija, EIF, Programų sistemos). Internetinė parduotuvė, kurioje galima konfigūruoti mikrovaldiklių projektų rinkinius, tikrinti komponentų suderinamumą pagal technines taisykles ir užsisakyti rinkinį.

- **Backend:** Medusa v2 (`apps/backend`), Node.js, TypeScript, PostgreSQL.
- **Storefront:** Next.js App Router + Tailwind (`apps/storefront`).
- **Admin:** Medusa Admin (`http://localhost:9000/app`).
- **Monorepo:** npm workspaces + Turborepo.

## Reikalavimai

| Įrankis | Versija | Pastaba |
|---|---|---|
| Node.js | 22.23+ (testuota su 24.19) | https://nodejs.org |
| npm | 11+ | ateina su Node |
| PostgreSQL | 15+ (testuota su 17) | Windows: `winget install PostgreSQL.PostgreSQL.17` |
| Git | bet kuri | |

Redis neprivalomas: dev aplinkoje Medusa naudoja atminties pakaitalą.

## Diegimas nuo nulio

1. **Klonuoti ir įdiegti priklausomybes** (iš repo šaknies):
   ```bash
   npm install
   ```

2. **Sukurti duomenų bazę.** PostgreSQL turi veikti (Windows paslauga `postgresql-x64-17`).
   ```bash
   createdb -U postgres -h localhost -E UTF8 medusa_electronics
   ```
   Windows be `createdb` kelyje: `"C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres -h localhost -E UTF8 medusa_electronics`.

3. **Backend `.env`.** Nukopijuokite `apps/backend/.env.template` į `apps/backend/.env` ir užpildykite:
   ```
   DATABASE_URL=postgres://postgres:<slaptažodis>@localhost:5432/medusa_electronics
   JWT_SECRET=<ilga atsitiktinė eilutė>
   COOKIE_SECRET=<ilga atsitiktinė eilutė>
   ```
   Likę kintamieji (CORS adresai) tinka numatytieji.

4. **Migracijos ir pradiniai parduotuvės duomenys** (regionas „Lietuva“/EUR, Vilniaus sandėlis, pristatymo variantai, komponentų kategorijos, publishable API raktas). Vykdoma vieną kartą, kartoti saugu:
   ```bash
   cd apps/backend
   npx medusa db:migrate
   ```

5. **Admin naudotojas:**
   ```bash
   npx medusa user -e admin@example.com -p <slaptažodis>
   ```

6. **Komponentų katalogas** (28 realūs komponentai; skriptas idempotentiškas, kartoti saugu):
   ```bash
   npx medusa exec ./src/scripts/seed-components.ts
   ```
   Arba iš repo šaknies: `npm run backend:seed`.

6a. **Techninės specifikacijos** (įtampos, srovės, I2C adresai, bėgeliai iš datasheet; idempotentiškas):
   ```bash
   npx medusa exec ./src/scripts/seed-component-specs.ts
   ```

6b. **Vienos prekės atnaujinimas pagal kodą.** Seed'ai esamų prekių nekeičia (kad nebūtų perrašyti admin'e padaryti pakeitimai). Pataisius prekės pavadinimą / aprašymą `seed-components.ts` ar specifikaciją `component-spec-data.ts`, perkelkite tik tą prekę (variantai, kainos ir nuotraukos neliečiami):
   ```bash
   npx medusa exec ./src/scripts/sync-catalog-entry.ts led-dimeris-vienos-spalvos
   ```

7. **Storefront `.env.local`.** Nukopijuokite `apps/storefront/.env.template` į `apps/storefront/.env.local`. Publishable API raktą paimkite iš admin'o (Settings → Publishable API Keys) arba iš DB:
   ```bash
   psql -U postgres -h localhost -d medusa_electronics -tAc "select token from api_key where type='publishable' and revoked_at is null"
   ```

## Paleidimas

Iš repo šaknies, dviejuose terminaluose:

```bash
npm run backend:dev
```

```bash
npm run storefront:dev
```

| Kas | Adresas |
|---|---|
| Backend API | http://localhost:9000 (`/health` → `OK`) |
| Admin | http://localhost:9000/app |
| Storefront | http://localhost:8000/lt |

Pirmą kartą paleidus backend'ą, Medusa automatiškai užpildo paieškos indeksą (`[Search] Seeded "product"` žurnale); kol tai neįvyko, katalogas storefront'e gali būti tuščias kelias sekundes.

Kiti naudingi skriptai (šaknyje): `npm run lint`, `npm run build`.

### Testai (`apps/backend`)

| Komanda | Kas | Reikia |
|---|---|---|
| `npm test` | 79 vienetų testai: taisyklės R1–R8, variklis, 13 etaloninių rinkinių, validatoriai | nieko |
| `npm run test:integration:http` | 12 HTTP testų su tikra Medusa ir atskira testine DB | PostgreSQL ir `.env.test` (nukopijuoti `.env.test.template`, įrašyti DB slaptažodį) |
| `npx medusa exec ./src/scripts/measure-validation.ts` | NFR-1: patikros trukmė 20 komponentų rinkiniui | užpildyta DB |

E2E (`apps/storefront`): `npm run test:e2e` – 4 konfigūratoriaus scenarijai per Chromium. Pirmą kartą: `npx playwright install chromium`. Jei backend ir storefront neveikia, Playwright juos paleidžia pats; reikia užpildytos DB. Ataskaita: `npx playwright show-report`.

## Admin API: techninės specifikacijos

Autentifikacija kaip ir kitiems `/admin/*` maršrutams (sesija arba `Authorization: Bearer <token>` iš `POST /auth/user/emailpass`).

| Metodas | Kelias | Paskirtis |
|---|---|---|
| GET | `/admin/component-specs?product_id=&category=&limit=&offset=` | sąrašas arba vieno produkto specifikacija |
| POST | `/admin/component-specs` | sukurti ir susieti su produktu (`product_id`, `category`, `datasheet_url`, `interfaces[]`, `power_rails[]`, `mcu`) |
| GET | `/admin/component-specs/:id` | viena specifikacija |
| POST | `/admin/component-specs/:id` | atnaujinti; perduoti sąrašai (`interfaces`, `power_rails`, `mcu`) pakeičiami visi |
| DELETE | `/admin/component-specs/:id` | nutraukti link'ą ir ištrinti |

Admin'e produkto puslapyje specifikaciją rodo widget'as „Techninė specifikacija“.

## Store API: rinkiniai ir patikra

Reikia `x-publishable-api-key` antraštės (kaip visiems `/store/*`).

| Metodas | Kelias | Paskirtis |
|---|---|---|
| POST | `/store/kits/validate` | `{ items: [{ variant_id, quantity }] }` → patikros ataskaita su rezultatais (R1–R9), paaiškinimais ir pasiūlymais (tarp jų „pakeisti variantą“: `replaceItemId` → `replaceWithVariantId`) |
| GET | `/store/kit-presets` | rinkinių šablonai (pvz., „LED rinkinys“) su pozicijomis ir numatytaisiais pasirinkimais; aprašyti `apps/backend/src/lib/kit-presets.ts` |
| POST | `/store/kits` | patikrinti ir išsaugoti rinkinį |
| GET | `/store/kits/:id` | rinkinys su eilutėmis ir paskutine patikra |
| POST | `/store/kits/:id/add-to-cart` | `{ cart_id }`: rinkinio eilutės į krepšelį su `metadata.kit_id` |

Storefront'e konfigūratorius: http://localhost:8000/lt/configurator.

Užsakymas su rinkiniu, kuriame yra suderinamumo klaidų, blokuojamas `completeCartWorkflow` `validate` hook'e (`apps/backend/src/workflows/hooks/validate-cart-kits.ts`). Demonstracija be UI:

```bash
cd apps/backend && npx medusa exec ./src/scripts/demo-blocked-checkout.ts
```

## Projekto struktūra

```
apps/
  backend/                  # Medusa
    medusa-config.ts
    src/
      lib/                  # component-categories.ts, component-spec-data.ts (datasheet vertės), region-store-policies.ts
      migration-scripts/    # initial-data-seed.ts (parduotuvės pradiniai duomenys)
      scripts/              # seed-components.ts (katalogas), seed-component-specs.ts (specifikacijos)
      modules/
        component-spec/     # DML modeliai + servisas (techniniai duomenys)
        compatibility/
          engine/           # grynas TS: types, engine, rules/R1..R9, __tests__
          snapshot.ts       # DB -> KitSnapshot
        kit/                # Kit, KitItem (išsaugoti rinkiniai)
      links/                # product <-> component-spec
      workflows/            # component-spec/, validate-kit.ts, kit/
      api/admin/component-specs/, api/store/kits/
      admin/widgets/        # component-spec-widget.tsx
  storefront/               # Next.js
    src/app/[countryCode]/(main)/configurator/
    src/modules/configurator/   # templates, components, types
    src/lib/data/kits.ts, configurator.ts
```

## Žinomos problemos (Windows)

- PowerShell'e `npm run …` meta `npm.ps1 cannot be loaded because running scripts is disabled` (PSSecurityException). Vieną kartą leiskite lokalius skriptus savo naudotojui:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```
  Arba naudokite `npm.cmd run …`, Git Bash ar cmd, kur šios politikos nėra.
- `npm install` kartais nutrūksta su `ECONNRESET`: pakartokite komandą.
- Jei `psql`/`createdb` nerandami, pridėkite `C:\Program Files\PostgreSQL\17\bin` į `PATH`.
- Winget įdiegtas PostgreSQL turi numatytąjį `postgres` naudotojo slaptažodį `postgres`; pakeiskite jį, jei DB pasiekiama ne tik iš šio kompiuterio.

## Šalinimas

1. Sustabdyti dev serverius (`Ctrl+C`).
2. `dropdb -U postgres -h localhost medusa_electronics`.
3. Ištrinti projekto aplanką (visos priklausomybės yra `node_modules/` jame).
