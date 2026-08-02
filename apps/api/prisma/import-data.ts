import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { validateDataset } from '../src/data-import/dataset';
import { importDataset } from '../src/data-import/import-dataset';

const nodeEnvironment = process.env.NODE_ENV ?? 'development';

loadEnvironment({
  path: [`.env.${nodeEnvironment}`, '.env'],
  quiet: true,
});

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to import data');
  }

  const inputPath = resolve(
    process.cwd(),
    process.argv[2] ?? 'prisma/data/import.json',
  );
  const fileContents = await readFile(inputPath, 'utf8');
  const input: unknown = JSON.parse(fileContents);
  const dataset = validateDataset(input);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const summary = await importDataset(prisma, dataset);
    console.log('Hotel-Yab data import completed:', summary);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
