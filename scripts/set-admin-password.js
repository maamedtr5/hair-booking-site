// scripts/set-admin-password.js
//
// Creates an admin account if it doesn't exist, or safely resets its
// password (and guarantees ADMIN role + an admin profile row) if it does.
// Never touches any other table — unlike prisma/seed.js, this makes NO
// destructive changes and is safe to run against production.
//
// Usage:
//   node scripts/set-admin-password.js <email> <password> [name]
//
// Example:
//   node scripts/set-admin-password.js enamavemegah@gmail.com "Xk9#mQ2vL8pR4tN7wZ3y" "Enam Avemegah"

import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma.js';

const [, , emailArg, passwordArg, nameArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.log('Usage: node scripts/set-admin-password.js <email> <password> [name]');
  console.log('Creates the admin if it does not exist, or resets its password (and');
  console.log('ensures ADMIN role + an admin profile) if it does. Makes no other changes.');
  process.exit(1);
}

if (passwordArg.length < 12) {
  console.log('\n❌ Refusing a password under 12 characters for an admin account.');
  console.log('   Generate a real random one, e.g.:');
  console.log('   PowerShell: -join ((48..57)+(65..90)+(97..122)+(33,35,36,37,38) | Get-Random -Count 20 | % {[char]$_})\n');
  process.exit(1);
}

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.log('\n❌ DATABASE_URL is undefined in this process.');
  console.log('   You are very likely not pointed at the database you think you are —');
  console.log('   confirm which .env / DATABASE_URL is active before proceeding.\n');
  process.exit(1);
}

// Mask credentials, show only host/db — confirm you're hitting the RIGHT
// database (production vs. dev) before this makes any change.
const masked = rawUrl.replace(/\/\/[^@]+@/, '//<redacted>@');
console.log(`\nConnecting to: ${masked}`);
console.log('⚠️  Confirm this is the database you intend to modify.\n');

const email = emailArg.toLowerCase().trim();
const name = nameArg?.trim() || 'Admin';

async function main() {
  const hashedPassword = await bcrypt.hash(passwordArg, 10);

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { admin: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: hashedPassword,
        role: 'ADMIN',
        // If this user existed under a different role (or as an admin
        // whose Admin row somehow never got created), ensure the profile
        // row exists too — without this, role: 'ADMIN' alone wouldn't be
        // enough for admin-only routes/relations that expect it.
        ...(existing.admin
          ? {}
          : {
              admin: {
                create: {
                  department: 'Operations',
                  permissions: { manageUsers: true, manageBookings: true, viewReports: true },
                },
              },
            }),
      },
    });
    console.log(`✓ Updated existing user (id=${existing.id}, email=${email})`);
    console.log(`  Password reset. Role ensured ADMIN.${existing.admin ? '' : ' Admin profile created.'}`);
  } else {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        admin: {
          create: {
            department: 'Operations',
            permissions: { manageUsers: true, manageBookings: true, viewReports: true },
          },
        },
      },
    });
    console.log(`✓ Created new admin — id=${created.id}, email=${created.email}, name=${created.name}`);
  }

  console.log('\nDone. This password was only ever typed by you, just now.');
  console.log('Store it in a password manager — not in chat history, email, or a plaintext file.\n');
}

main()
  .catch((err) => {
    console.error('Failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
