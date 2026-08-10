import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnvironment } from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client';
import { UserRole } from '../src/generated/prisma/enums';

const nodeEnvironment = process.env.NODE_ENV ?? 'development';
loadEnvironment({ path: [`.env.${nodeEnvironment}`, '.env'], quiet: true });

const identifier = process.argv[2]?.trim();
const requestedRole = process.argv[3]?.trim().toUpperCase() as
  UserRole | undefined;
if (
  !identifier ||
  !requestedRole ||
  !Object.values(UserRole).includes(requestedRole)
) {
  throw new Error(
    'Usage: pnpm user:set-role <mobile-or-username> <USER|MODERATOR|ADMIN>',
  );
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  const mobile = normalizeMobileIfPossible(identifier);
  const user = await prisma.user.findFirst({
    where: mobile ? { mobile } : { username: identifier.toLowerCase() },
    select: { id: true, mobile: true, username: true },
  });
  if (!user) throw new Error('User not found');
  await prisma.user.update({
    where: { id: user.id },
    data: { role: requestedRole },
  });
  console.log(`Updated ${user.username ?? user.mobile} to ${requestedRole}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

function normalizeMobileIfPossible(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('0098')
    ? digits.slice(4)
    : digits.startsWith('98')
      ? digits.slice(2)
      : digits.startsWith('0')
        ? digits.slice(1)
        : digits;
  return /^9\d{9}$/.test(local) ? `+98${local}` : null;
}
