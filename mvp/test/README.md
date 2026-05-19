# Test setup

## Prerequisites

A Postgres 16+ instance running on **port 5433** with database `toolia_test`. Two options:

### Option A: Docker (recommended for CI)

```bash
docker run -d --name toolia-test-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=toolia_test \
  -p 5433:5432 \
  postgres:16-alpine
```

### Option B: Native Postgres on macOS (fallback if Docker unavailable)

```bash
brew install postgresql@17
mkdir -p /tmp/toolia-test-pgdata
LC_ALL=en_US.UTF-8 /opt/homebrew/opt/postgresql@17/bin/initdb -D /tmp/toolia-test-pgdata
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D /tmp/toolia-test-pgdata -o "-p 5433" -l /tmp/toolia-test-pgdata/logfile start
/opt/homebrew/opt/postgresql@17/bin/createdb -p 5433 toolia_test
/opt/homebrew/opt/postgresql@17/bin/psql -p 5433 -d toolia_test -c "CREATE USER postgres WITH SUPERUSER PASSWORD 'postgres';"
```

After a machine restart you need to start the server again:
```bash
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D /tmp/toolia-test-pgdata -o "-p 5433" -l /tmp/toolia-test-pgdata/logfile start
```

## Local .env.test

`.env.test` is gitignored (contains DB connection string). Create it locally:

```bash
cat > mvp/.env.test << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/toolia_test
NODE_ENV=test
NEXTAUTH_SECRET=test-secret-not-for-prod
AUTH_SECRET=test-secret-not-for-prod
EOF
```

## Apply schema

```bash
cd mvp
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/toolia_test" \
  PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=yes \
  npx prisma migrate reset --force
```

(Prisma 7 requires the consent env var when run by automation.)

## Running tests

```bash
npm run test              # one-shot
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
```

## Writing tests

Use the helpers in `test/helpers/prisma.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "./helpers/prisma";

describe("my feature", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("does the thing", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    // ... test code ...
  });
});
```

`setup.ts` guards against accidentally running tests on a non-test DB by requiring `test` in the DATABASE_URL.
