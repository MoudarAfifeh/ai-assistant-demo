import 'dotenv/config';
import fs from 'fs';
import tls from 'tls';
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
      // The driver re-checks the hostname after the handshake using
      // getPeerCertificate(). Bun returns an empty object there, so that
      // re-check always fails under Bun. The TLS handshake has already
      // verified the CA and hostname (rejectUnauthorized + servername), so
      // only skip the re-check when there is no certificate data to check.
      checkServerIdentity: (host: string, cert: tls.PeerCertificate) =>
         cert && Object.keys(cert).length
            ? tls.checkServerIdentity(host, cert)
            : undefined,
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
