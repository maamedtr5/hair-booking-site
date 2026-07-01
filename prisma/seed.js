// prisma/seed.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log(' Seeding all models safely...');

  // 1. Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin1@locsallure.com' },
    update: {},
    create: {
      name: 'Admin Kwame',
      email: 'admin1@locsallure.com',
      password: 'hashedpassword',
      role: 'ADMIN',
      admin: {
        create: {
          department: 'Management',
          permissions: { canManageStaff: true, canViewReports: true },
        },
      },
    },
    include: { admin: true },
  });

  // 2. Services (createMany with skipDuplicates)
  await prisma.service.createMany({
    data: [
      { name: 'Braids', description: 'Protective braiding styles', duration: 120, price: 150 },
      { name: 'Locs Maintenance', description: 'Retwist and grooming of locs', duration: 90, price: 100 },
      { name: 'Hair Coloring', description: 'Professional hair dye application', duration: 60, price: 80 },
    ],
    skipDuplicates: true,
  });

  // 3. Staff (via User)
  const userAma = await prisma.user.upsert({
    where: { email: 'ama.staff@locsallure.com' },
    update: {},
    create: {
      name: 'Ama Mensah',
      email: 'ama.staff@locsallure.com',
      password: 'hashedpassword',
      role: 'STAFF',
      staff: { create: { bio: 'Braiding specialist' } },
    },
    include: { staff: true },
  });

  const userKojo = await prisma.user.upsert({
    where: { email: 'kojo.staff@locsallure.com' },
    update: {},
    create: {
      name: 'Kojo Owusu',
      email: 'kojo.staff@locsallure.com',
      password: 'hashedpassword',
      role: 'STAFF',
      staff: { create: { bio: 'Locs maintenance expert' } },
    },
    include: { staff: true },
  });

  // 4. Client (via User)
  const userAbena = await prisma.user.upsert({
    where: { email: 'abena.client@locsallure.com' },
    update: {},
    create: {
      name: 'Abena Asante',
      email: 'abena.client@locsallure.com',
      password: 'hashedpassword',
      role: 'CLIENT',
      client: { create: { phone: '+233555123456', address: 'Madina Estates' } },
    },
    include: { client: true },
  });

  // 5. Appointment + Slot
  const appointment = await prisma.appointment.create({
    data: {
      serviceId: 1,
      staffId: userAma.staff.id,
      date: new Date('2026-07-01T10:00:00Z'),
      status: 'CONFIRMED',
      slots: {
        create: {
          startTime: new Date('2026-07-01T10:00:00Z'),
          endTime: new Date('2026-07-01T12:00:00Z'),
        },
      },
    },
    include: { slots: true },
  });

  // 6. Booking
  const booking = await prisma.booking.create({
    data: {
      appointmentId: appointment.id,
      clientId: userAbena.client.id,
      status: 'CONFIRMED',
    },
  });

  // 7. Payment
  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: 150,
      currency: 'GHS',
      method: 'MOBILE_MONEY',
      provider: 'PAYSTACK',
      status: 'SUCCESS',
      transactionRef: 'TXN123456',
      externalId: 'PAYSTACK_ABC123',
    },
  });

  // 8. Review
  await prisma.review.create({
    data: {
      clientId: userAbena.client.id,
      serviceId: 1,
      staffId: userAma.staff.id,
      rating: 5,
      comment: 'Ama did an amazing job with my braids!',
    },
  });

  // 9. Promocode (upsert)
  await prisma.promocode.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: '10% off first booking',
      discount: 10,
      type: 'PERCENTAGE',
      validFrom: new Date('2026-07-01T00:00:00Z'),
      validUntil: new Date('2026-12-31T23:59:59Z'),
      isActive: true,
    },
  });

  // 10. Notification
  await prisma.notification.create({
    data: {
      userId: userAbena.id,
      message: 'Your appointment is confirmed!',
      type: 'APPOINTMENT',
      status: 'SENT',
    },
  });

  // 11. Waitlist
  await prisma.waitlist.create({
    data: {
      clientId: userAbena.client.id,
      serviceId: 2,
      preferredDate: new Date('2026-07-15T09:00:00Z'),
      status: 'PENDING',
    },
  });

  // 12. Form
  await prisma.form.create({
    data: {
      clientId: userAbena.client.id,
      bookingId: booking.id,
      title: 'Hair Care Preferences',
      fields: { preferredProducts: 'Shea Butter, Coconut Oil', allergies: 'None' },
    },
  });

  // 13. Settings (upsert)
  await prisma.settings.upsert({
    where: { key: 'working_hours' },
    update: { value: { open: '09:00', close: '18:00' } },
    create: {
      key: 'working_hours',
      value: { open: '09:00', close: '18:00' },
      description: 'Salon operating hours',
    },
  });

  // 14. Report
  await prisma.report.create({
    data: {
      title: 'Monthly Bookings Report - June 2026',
      data: {
        totalBookings: 25,
        totalRevenue: 3750,
        topService: 'Braids',
        topStaff: 'Ama Mensah',
      },
    },
  });

  console.log(' All models seeded successfully with correct upsert/createMany usage');
}

main()
  .catch((e) => console.error('❌ Error seeding data:', e))
  .finally(async () => await prisma.$disconnect());
