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
  // Service rows must be gone first (Service.categoryId is ON DELETE
  // RESTRICT). FormField cascades from FormTemplate automatically, but is
  // cleared explicitly here for clarity.
  await prisma.formField.deleteMany();
  await prisma.formTemplate.deleteMany();
  await prisma.serviceCategory.deleteMany();
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
      email: 'maameabenaadjabeng@gmail.com',
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

  // ── 3. SCALP-FIRST™ consultation form + service categories ────────────
  // A representative subset of the client's actual SCALP-FIRST intake —
  // enough to demonstrate every supported field type. The full 57-question
  // version is entered/edited by admin via the form builder, not hardcoded
  // here — that's the whole point of making it admin-customizable.
  const scalpFirstForm = await prisma.formTemplate.create({
    data: {
      name: 'SCALP-FIRST™ New Loc Consultation & Loc System Assessment',
      description:
        'A precision intake for choosing the right loc system — hair, scalp, lifestyle, and maintenance capacity, required before any Starter Locs booking.',
      isActive: true,
      fields: {
        create: [
          // Section 1 — Client Information
          { section: 'Client Information', label: 'Full Name', fieldType: 'TEXT', required: true, order: 0 },
          { section: 'Client Information', label: 'Phone / WhatsApp', fieldType: 'TEXT', required: true, order: 1 },
          { section: 'Client Information', label: 'Email', fieldType: 'TEXT', required: true, order: 2 },
          { section: 'Client Information', label: 'Date of Consultation', fieldType: 'DATE', required: true, order: 3 },
          {
            section: 'Client Information', label: 'Age Range', fieldType: 'SINGLE_SELECT', required: true, order: 4,
            options: ['Under 18', '18–24', '25–34', '35–44', '45–54', '55+'],
          },
          // Section 2 — Your Loc Journey
          {
            section: 'Your Loc Journey', label: 'What is your primary reason for wanting locs?',
            fieldType: 'SINGLE_SELECT', required: true, order: 5,
            options: ['Personal expression', 'Convenience / easier hair management', 'Hair growth / length retention', 'Cultural connection', 'Spiritual reasons', 'Lifestyle change', 'Protective styling', 'I love the aesthetic', 'I want to stop chemically processing my hair', 'Other'],
          },
          {
            section: 'Your Loc Journey', label: 'Have you had locs before?',
            fieldType: 'SINGLE_SELECT', required: true, order: 6,
            options: ['No', 'Yes — once', 'Yes — multiple times'],
          },
          {
            section: 'Your Loc Journey', label: 'What do you currently dislike or struggle with about your hair?',
            fieldType: 'TEXTAREA', required: false, order: 7,
          },
          // Section 3 — Your Ideal Locs
          {
            section: 'Your Ideal Locs', label: 'What type of loc appearance are you most attracted to?',
            fieldType: 'SINGLE_SELECT', required: true, order: 8,
            options: ['Very small / micro', 'Small', 'Medium', 'Large', 'Very large / freeform', "I'm unsure"],
          },
          {
            section: 'Your Ideal Locs', label: 'How important is maximum styling versatility to you? (1 = not important, 5 = extremely important)',
            fieldType: 'SCALE', required: true, order: 9,
          },
          {
            section: 'Your Ideal Locs', label: 'Which loc systems are you currently considering?',
            fieldType: 'MULTI_SELECT', required: false, order: 10,
            options: ['Traditional Locs', 'Microlocs', 'Sisterlocks®', 'Freeform Locs', 'Semi-Freeform Locs', 'Interlocked Locs', 'Crochet Locs', "I don't know yet"],
          },
          // Section 4 — Hair History
          {
            section: 'Hair History', label: 'What is your natural hair texture?',
            fieldType: 'SINGLE_SELECT', required: true, order: 11,
            options: ['Fine', 'Medium', 'Coarse', 'Unsure'],
          },
          {
            section: 'Hair History', label: 'Does your hair break easily?',
            fieldType: 'SINGLE_SELECT', required: true, order: 12,
            options: ['Never', 'Occasionally', 'Frequently', 'Very frequently', 'Unsure'],
          },
          // Section 5 — Chemical & Hair Treatment History
          {
            section: 'Chemical & Hair Treatment History', label: 'Have you chemically treated your hair? Select all that apply.',
            fieldType: 'MULTI_SELECT', required: false, order: 13,
            options: ['Never', 'Relaxer', 'Texturizer', 'Permanent colour', 'Bleach', 'Keratin / smoothing treatment'],
          },
          // Section 6 — Scalp Tolerance Index
          {
            section: 'Scalp Tolerance Index™', label: 'How does your scalp usually respond to tight hairstyles?',
            fieldType: 'SINGLE_SELECT', required: true, order: 14,
            options: ['No discomfort', 'Mild discomfort', 'Noticeable soreness', 'Significant pain', 'I frequently develop bumps or irritation'],
          },
          {
            section: 'Scalp Tolerance Index™', label: 'Have you ever removed a hairstyle because it was too painful?',
            fieldType: 'SINGLE_SELECT', required: true, order: 15,
            options: ['No', 'Yes'],
          },
          {
            section: 'Scalp Tolerance Index™', label: 'Is there anything about your scalp or hair your loctician should know before working on it?',
            fieldType: 'TEXTAREA', required: false, order: 16,
          },
          // Section 9 — Lifestyle & Maintenance Capacity
          {
            section: 'Maintenance Capacity Index™', label: 'How much time are you realistically willing to spend maintaining your locs?',
            fieldType: 'SINGLE_SELECT', required: true, order: 17,
            options: ['Very little', 'A small amount', 'Moderate amount', 'Significant amount', 'I enjoy spending time on my hair'],
          },
          {
            section: 'Maintenance Capacity Index™', label: 'How frequently could you realistically attend professional maintenance appointments?',
            fieldType: 'SINGLE_SELECT', required: true, order: 18,
            options: ['Every 4 weeks', 'Every 4–6 weeks', 'Every 6–8 weeks', 'Every 8–12 weeks', 'Only when necessary', 'Unsure'],
          },
          // Section 10 — Longevity Objective
          {
            section: 'Longevity Objective™', label: 'How long do you intend to keep your locs?',
            fieldType: 'SINGLE_SELECT', required: true, order: 19,
            options: ["I'm experimenting", '1–2 years', '2–5 years', '5–10 years', 'Indefinitely', "I'm not sure yet"],
          },
          {
            section: 'Longevity Objective™', label: 'How important is long-term scalp preservation to you? (1 = low priority, 5 = non-negotiable)',
            fieldType: 'SCALE', required: true, order: 20,
          },
          // Section 13 — Budget & Commitment
          {
            section: 'Budget & Commitment', label: 'Which best describes your priority?',
            fieldType: 'SINGLE_SELECT', required: true, order: 21,
            options: ['Lowest initial cost', 'Balanced cost and maintenance', 'Investing more upfront for a highly customized system', 'Investing in the best long-term option regardless of initial cost'],
          },
          // Section 15 — Client Acknowledgement
          {
            section: 'Client Acknowledgement', label: 'Signature — I confirm the information provided is accurate to the best of my knowledge.',
            fieldType: 'SIGNATURE', required: true, order: 22,
          },
        ],
      },
    },
  });
  console.log('✓ Created SCALP-FIRST™ consultation form (23 fields)');

  const [starterLocsCategory, locsStylingCategory, retieServicesCategory] = await Promise.all([
    prisma.serviceCategory.create({
      data: {
        name: 'Starter Locs',
        slug: 'starter-locs',
        description: 'New loc installations and starter systems.',
        displayOrder: 1,
        formTemplateId: scalpFirstForm.id,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Locs Styling',
        slug: 'locs-styling',
        description: 'Styling services for established locs.',
        displayOrder: 2,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Retie Services',
        slug: 'retie-services',
        description: 'Retie and maintenance services for existing locs.',
        displayOrder: 3,
      },
    }),
  ]);
  console.log('✓ Created 3 service categories (Starter Locs requires the SCALP-FIRST form)');

  // ── 3b. Services (sub-options within each category) ───────────────────
  const [locRetwist, boxBraids, silkPress, , locStarter] = await Promise.all([
    prisma.service.create({
      data: {
        categoryId: retieServicesCategory.id,
        name: 'Loc Retwist',
        description: 'Full retwist and style for established locs.',
        duration: 90,
        price: 150.0,
        displayOrder: 0,
      },
    }),
    prisma.service.create({
      data: {
        categoryId: locsStylingCategory.id,
        name: 'Box Braids',
        description: 'Protective style, medium size, shoulder length.',
        duration: 240,
        price: 350.0,
        displayOrder: 0,
      },
    }),
    prisma.service.create({
      data: {
        categoryId: locsStylingCategory.id,
        name: 'Silk Press',
        description: 'Heat styling for a smooth, silky finish on natural hair.',
        duration: 120,
        price: 200.0,
        displayOrder: 1,
      },
    }),
    prisma.service.create({
      data: {
        categoryId: locsStylingCategory.id,
        name: 'Deep Conditioning Treatment',
        description: 'Moisture-restoring treatment for dry or damaged hair.',
        duration: 60,
        price: 100.0,
        displayOrder: 2,
      },
    }),
    prisma.service.create({
      data: {
        categoryId: starterLocsCategory.id,
        name: 'Loc Starter (Sisterlocks)',
        description: 'Consultation and installation for new sisterlocks. Requires the SCALP-FIRST consultation form.',
        duration: 300,
        price: 600.0,
        displayOrder: 0,
      },
    }),
  ]);
  console.log('✓ Created 5 services across 3 categories');

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
  console.log('  Admin:   maameabenaadjabeng@gmail.com');
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