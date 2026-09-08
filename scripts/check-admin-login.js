// Read-only diagnostic — makes NO changes to the database.
// Usage: node scripts/check-admin-login.js you@example.com
//
// v2: also prints which database host this script is actually connected
// to (masked), because `npx prisma db seed` auto-loads .env via the
// Prisma CLI, but a plain `node scripts/whatever.js` does NOT — if
// nothing in the import chain loads dotenv, DATABASE_URL can be
// undefined or fall back to something else here, even though the seed
// command worked fine.

import { prisma } from '../src/lib/prisma.js';

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  console.log('\n❌ DATABASE_URL is UNDEFINED in this process.');
  console.log('   This script was run without loading your .env file — that is');
  console.log('   almost certainly why it can\'t find users the seed script just created.');
  console.log('   `npx prisma db seed` auto-loads .env via the Prisma CLI; plain');
  console.log('   `node scripts/*.js` does not, unless something imports dotenv first.\n');
  process.exit(1);
}

// Mask credentials, show only the host/db so it's safe to paste
const masked = rawUrl.replace(/\/\/[^@]+@/, '//<redacted>@');
console.log(`\nConnecting to: ${masked}`);

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/check-admin-login.js <email>');
  process.exit(1);
}

const normalizedEmail = email.toLowerCase().trim();
const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

if (!user) {
  console.log(`No user found with email "${normalizedEmail}" on the host above.\n`);
  process.exit(0);
}

console.log(`User found: id=${user.id}, role=${user.role}, email=${user.email}`);

const looksLikeBcrypt = /^\$2[aby]\$\d{2}\$/.test(user.password || '');

if (looksLikeBcrypt) {
  console.log('Password field IS a valid bcrypt hash — the format is correct.\n');
} else {
  console.log('Password field is NOT a valid bcrypt hash — this is the bug.\n');
}

await prisma.$disconnect();