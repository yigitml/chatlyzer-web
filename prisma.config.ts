// prisma.config.ts
import 'dotenv/config';
import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Client generation during npm ci does not need database credentials.
    // Migration commands still require a real DATABASE_URL.
    url: process.env.DATABASE_URL,
  },
});
