// tests/booking.test.js
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

let adminToken;

beforeAll(async () => {
  // GET /bookings is staff/admin-only (see bookingRoutes.js), so the test
  // needs a real authenticated admin — public /auth/register always forces
  // role: CLIENT, so this creates the admin user directly.
  const hashed = await bcrypt.hash("TestPass123!", 10);
  await prisma.user.create({
    data: {
      name: "Test Admin",
      email: "test-admin@example.com",
      password: hashed,
      role: "ADMIN",
    },
  });

  const res = await request(app)
    .post("/auth/login")
    .send({ email: "test-admin@example.com", password: "TestPass123!" });

  adminToken = res.body.data?.token;
});

afterEach(async () => {
  // Clean up test bookings created during tests (Booking has no `email`
  // field itself — it lives on the related client's user).
  await prisma.booking.deleteMany({
    where: { client: { user: { email: { contains: "test@" } } } },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: "test-admin@" } } });
  await prisma.$disconnect();
});

test("GET /bookings without auth should respond with 401", async () => {
  const res = await request(app).get("/bookings");
  expect(res.statusCode).toBe(401);
});

test("GET /bookings as admin should respond with 200", async () => {
  const res = await request(app)
    .get("/bookings")
    .set("Authorization", `Bearer ${adminToken}`);
  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
  expect(Array.isArray(res.body.data)).toBe(true);
});
