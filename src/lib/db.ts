// IMPORTANT: Set DATABASE_URL BEFORE importing PrismaClient
// This ensures Prisma reads the correct connection string

// Construct DATABASE_URL from individual environment variables if DATABASE_URL is not set
// OR if DATABASE_URL is a Prisma Data Proxy URL (starts with prisma+)
const getDatabaseUrl = () => {
  // Check if DATABASE_URL exists and is NOT a Prisma Data Proxy URL
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('prisma+')) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !user || !password || !database) {
    const missing = [];
    if (!host) missing.push('DB_HOST');
    if (!user) missing.push('DB_USER');
    if (!password) missing.push('DB_PASSWORD');
    if (!database) missing.push('DB_NAME');
    
    throw new Error(
      `Missing required database environment variables: ${missing.join(', ')}. ` +
      `Please create a .env.local file with DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME, or set DATABASE_URL.`
    );
  }

  // URL encode password in case it contains special characters
  const encodedPassword = encodeURIComponent(password);

  return `mysql://${user}:${encodedPassword}@${host}:${port}/${database}`;
};

// Get the database URL and set it BEFORE importing Prisma
let databaseUrl: string;
try {
  databaseUrl = getDatabaseUrl();
  
  // CRITICAL: Always override DATABASE_URL with our constructed URL
  // This ensures Prisma uses direct MySQL connection, not Prisma Data Proxy
  process.env.DATABASE_URL = databaseUrl;
} catch (error) {
  console.error('[DB] Error constructing database URL:', error);
  throw error;
}

// Now import PrismaClient AFTER DATABASE_URL is set
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Explicitly set the datasource URL to ensure Prisma uses it
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: ['error'], // Only log errors
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

