import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_WpZj2AYKxOd8@ep-weathered-sunset-adw2w1n0-pooler.c-2.us-east-1.aws.neon.tech/pausa-digital?sslmode=require&channel_binding=require",
  ssl: {
    rejectUnauthorized: false
  }
});
