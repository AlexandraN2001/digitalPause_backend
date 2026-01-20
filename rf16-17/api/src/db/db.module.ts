import { Module } from "@nestjs/common";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

@Module({
  providers: [
    {
      provide: Pool,
      useFactory: () => {
        return new Pool({
          connectionString: process.env.DATABASE_URL,
        });
      },
    },
  ],
  exports: [Pool],
})
export class DbModule {}
