// prisma/seed.js
//
// Dev/staging seed data for Locs Allure. Wipes and repopulates the tables
// it touches, in FK-safe order — safe to re-run any time you want a clean
// slate. DO NOT run this against a production database.
//
// Usage:
//   npx prisma db seed
// (requires the "prisma.seed" entry in package.json — see bottom of this file)

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const hash = (plain) => bcrypt.hash(plain, 10);

// Helper: next occurrence of a given weekday (1=Mon..6=Sat) at a given hour,
// so seeded appointments always land inside business hours in the future.
function nextBusinessDateTime(daysFromNow, hour) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log('Seeding Locs Allure database...\n');

  // ── 1. Clean slate (children first, respecting FKs) ──────────────────
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.waitlist.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.form.deleteMany();
  await prisma.intakeForm.deleteMany();
  await prisma.consentForm.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.promocode.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.service.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.client.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.user.deleteMany();
  console.log('✓ Cleared existing data');

  // ── 2. Users + role rows ──────────────────────────────────────────────
  const defaultPassword = await hash('Password123!');

  await prisma.user.create({
    data: {
      name: 'Abena Owusu',
      email: 'admin@locsallure.com',
      password: defaultPassword,
      role: 'ADMIN',
      admin: { create: { department: 'Operations', permissions: { manageUsers: true, manageBookings: true, viewReports: true } } },
    },
  });

  const staffUser1 = await prisma.user.create({
    data: {
      name: 'Efua Mensah',
      email: 'efua.stylist@locsallure.com',
      password: defaultPassword,
      role: 'STAFF',
      staff: { create: { bio: 'Loc specialist with 8 years of experience in retwisting, styling, and natural hair care.' } },
    },
    include: { staff: true },
  });

  const staffUser2 = await prisma.user.create({
    data: {
      name: 'Kwame Boateng',
      email: 'kwame.stylist@locsallure.com',
      password: defaultPassword,
      role: 'STAFF',
      staff: { create: { bio: 'Braiding and protective styles expert, known for intricate box braid patterns.' } },
    },
    include: { staff: true },
  });

  const clientUser1 = await prisma.user.create({
    data: {
      name: 'Adjoa Asante',
      email: 'adjoa.client@example.com',
      password: defaultPassword,
      role: 'CLIENT',
      client: { create: { phone: '+233241234567', address: 'Madina Estates, Accra' } },
    },
    include: { client: true },
  });

  const clientUser2 = await prisma.user.create({
    data: {
      name: 'Kojo Appiah',
      email: 'kojo.client@example.com',
      password: defaultPassword,
      role: 'CLIENT',
      client: { create: { phone: '+233209876543', address: 'East Legon, Accra' } },
    },
    include: { client: true },
  });

  const clientUser3 = await prisma.user.create({
    data: {
      name: 'Ama Darko',
      email: 'ama.client@example.com',
      password: defaultPassword,
      role: 'CLIENT',
      client: { create: { phone: '+233551122334' } },
    },
    include: { client: true },
  });

  console.log('✓ Created 1 admin, 2 staff, 3 clients (all passwords: Password123!)');

  // ── 3. Services ────────────────────────────────────────────────────────
  const [locRetwist, boxBraids, silkPress, , locStarter] = await Promise.all([
    prisma.service.create({
      data: {
        name: 'Loc Retwist',
        description: 'Full retwist and style for established locs.',
        duration: 90,
        price: 150.0,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Box Braids',
        description: 'Protective style, medium size, shoulder length.',
        duration: 240,
        price: 350.0,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Silk Press',
        description: 'Heat styling for a smooth, silky finish on natural hair.',
        duration: 120,
        price: 200.0,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Deep Conditioning Treatment',
        description: 'Moisture-restoring treatment for dry or damaged hair.',
        duration: 60,
        price: 100.0,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Loc Starter (Sisterlocks)',
        description: 'Consultation and installation for new sisterlocks.',
        duration: 300,
        price: 600.0,
      },
    }),
  ]);
  console.log('✓ Created 5 services');

  // ── 4. Appointments + Bookings (a spread of statuses) ─────────────────
  const appt1 = await prisma.appointment.create({
    data: {
      serviceId: locRetwist.id,
      staffId: staffUser1.staff.id,
      date: nextBusinessDateTime(3, 10),
      status: 'CONFIRMED',
      notes: 'Prefers medium-tension retwist.',
    },
  });
  const booking1 = await prisma.booking.create({
    data: { appointmentId: appt1.id, clientId: clientUser1.client.id, userId: clientUser1.id, status: 'CONFIRMED' },
  });
  await prisma.payment.create({
    data: {
      bookingId: booking1.id,
      amount: locRetwist.price,
      currency: 'GHS',
      method: 'MOBILE_MONEY',
      provider: 'PAYSTACK',
      status: 'SUCCESS',
      transactionRef: 'seed_txn_001',
    },
  });

  const appt2 = await prisma.appointment.create({
    data: {
      serviceId: boxBraids.id,
      staffId: staffUser2.staff.id,
      date: nextBusinessDateTime(5, 11),
      status: 'PENDING',
    },
  });
  await prisma.booking.create({
    data: { appointmentId: appt2.id, clientId: clientUser2.client.id, userId: clientUser2.id, status: 'PENDING' },
  });

  const appt3 = await prisma.appointment.create({
    data: {
      serviceId: silkPress.id,
      staffId: staffUser1.staff.id,
      date: nextBusinessDateTime(-7, 14), // in the past → good for testing "completed" states
      status: 'COMPLETED',
    },
  });
  const booking3 = await prisma.booking.create({
    data: { appointmentId: appt3.id, clientId: clientUser3.client.id, userId: clientUser3.id, status: 'COMPLETED' },
  });
  await prisma.payment.create({
    data: {
      bookingId: booking3.id,
      amount: silkPress.price,
      currency: 'GHS',
      method: 'CASH',
      provider: 'CASH',
      status: 'SUCCESS',
    },
  });

  console.log('✓ Created 3 appointments with bookings (confirmed, pending, completed)');

  // ── 5. Slots (availability for the booked appointments) ───────────────
  await prisma.slot.createMany({
    data: [
      { appointmentId: appt1.id, startTime: appt1.date, endTime: new Date(appt1.date.getTime() + locRetwist.duration * 60000), isBooked: true },
      { appointmentId: appt2.id, startTime: appt2.date, endTime: new Date(appt2.date.getTime() + boxBraids.duration * 60000), isBooked: true },
    ],
  });
  console.log('✓ Created slots for booked appointments');

  // ── 6. Promocode ────────────────────────────────────────────────────────
  await prisma.promocode.create({
    data: {
      code: 'WELCOME20',
      description: '20% off for first-time clients',
      discount: 20,
      type: 'PERCENTAGE',
      validFrom: new Date(),
      validUntil: nextBusinessDateTime(90, 23),
      isActive: true,
    },
  });
  console.log('✓ Created promocode WELCOME20');

  // ── 7. Reviews ───────────────────────────────────────────────────────────
  await prisma.review.create({
    data: {
      clientId: clientUser3.client.id,
      serviceId: silkPress.id,
      staffId: staffUser1.staff.id,
      rating: 5,
      comment: 'Efua did an amazing job, my hair has never looked this smooth!',
    },
  });
  console.log('✓ Created 1 review');

  // ── 8. Waitlist ────────────────────────────────────────────────────────
  await prisma.waitlist.create({
    data: {
      clientId: clientUser2.client.id,
      serviceId: locStarter.id,
      preferredDate: nextBusinessDateTime(14, 10),
      status: 'PENDING',
    },
  });
  console.log('✓ Created 1 waitlist entry');

  // ── 9. Notifications ─────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: clientUser1.id,
        message: 'Your Loc Retwist appointment is confirmed for ' + appt1.date.toDateString() + '.',
        type: 'APPOINTMENT',
        status: 'SENT',
        read: false,
      },
      {
        userId: clientUser3.id,
        message: 'Thanks for visiting Locs Allure! Leave a review and get 10% off your next booking.',
        type: 'PROMOTION',
        status: 'SENT',
        read: true,
      },
    ],
  });
  console.log('✓ Created 2 notifications');

  // ── 10. Settings ─────────────────────────────────────────────────────
  await prisma.settings.create({
    data: {
      key: 'business_hours',
      value: {
        monday: '9:00-18:00',
        tuesday: '9:00-18:00',
        wednesday: '9:00-18:00',
        thursday: '9:00-18:00',
        friday: '9:00-18:00',
        saturday: '9:00-18:00',
        sunday: 'closed',
      },
      description: 'Salon operating hours',
    },
  });
  await prisma.settings.create({
    data: {
      key: 'cancellation_policy',
      value: { hoursBeforeAppointment: 24, feePercentage: 20 },
      description: 'Cancellation window and fee',
    },
  });
  console.log('✓ Created settings');

  console.log('\nDone. Login with any seeded email + password "Password123!":');
  console.log('  Admin:  maameabenaadjabeng@gmail.com');
  console.log('  Staff:   efua.stylist@locsallure.com / kwame.stylist@locsallure.com');
  console.log('  Clients: adjoa.client@example.com / kojo.client@example.com / ama.client@example.com');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });