import 'dotenv/config';
import fs from 'fs';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from './generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
   throw new Error('DATABASE_URL is not set');
}

const connection = new URL(databaseUrl);

// Prisma's `sslcert` / `sslaccept` URL params aren't read by the MariaDB
// driver, so translate them into driver SSL options here. As with the Prisma
// CLI, a relative `sslcert` path is resolved from the prisma/ folder.
function sslOptions() {
   const sslcert = connection.searchParams.get('sslcert');
   if (!sslcert) return undefined;
   return {
      ca: fs.readFileSync(
         new URL(sslcert, new URL('./prisma/', import.meta.url))
      ),
      rejectUnauthorized:
         connection.searchParams.get('sslaccept') !== 'accept_invalid_certs',
      // Without this the driver verifies the cert against "localhost".
      servername: connection.hostname,
   };
}

const adapter = new PrismaMariaDb({
   host: connection.hostname,
   port: Number(connection.port || 3306),
   user: decodeURIComponent(connection.username),
   password: decodeURIComponent(connection.password),
   database: connection.pathname.slice(1),
   connectionLimit: 5,
   ssl: sslOptions(),
});

export const prisma = new PrismaClient({ adapter });
