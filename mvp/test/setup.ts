import { beforeAll, afterAll } from "vitest";
import { config } from "dotenv";

config({ path: ".env.test", quiet: true });

beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error(
      "DATABASE_URL must contain 'test' in name. Refusing to run tests on non-test DB.",
    );
  }
});

afterAll(() => {
  // pulizia globale se necessario
});
