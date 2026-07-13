import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let instance: PostgresJsDatabase<typeof schema> | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (!instance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    instance = drizzle(postgres(connectionString), { schema });
  }
  return instance;
}

// Lazy proxy: connects on first real query, not on import, so builds and
// tooling that merely import this module don't require DATABASE_URL to be set.
export const db: PostgresJsDatabase<typeof schema> = new Proxy(
  {},
  {
    get(_target, prop, receiver) {
      return Reflect.get(getDb(), prop, receiver);
    },
  }
) as PostgresJsDatabase<typeof schema>;

export * from "./schema";
