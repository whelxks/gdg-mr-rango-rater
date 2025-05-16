import { createClient } from "@libsql/client";

// db link: https://app.turso.tech/whelxks/databases/chatbot-rating/drizzle
export const db = createClient({
    url: import.meta.env.VITE_TURSO_DATABASE_URL,
    authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
  });