import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from './generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
   throw new Error('DATABASE_URL is not set');
}

const connection = new URL(databaseUrl);

const adapter = new PrismaMariaDb({
   host: connection.hostname,
   port: Number(connection.port || 3306),
   user: decodeURIComponent(connection.username),
   password: decodeURIComponent(connection.password),
   database: connection.pathname.slice(1),
   connectionLimit: 5,
});

export const prisma = new PrismaClient({ adapter });
