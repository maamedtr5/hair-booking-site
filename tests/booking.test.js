// src/tests/booking.test.js
import request from "supertest";
import app from "../Server.js";
import { prisma } from "../config/prismaClient.js";

afterEach(async () => {
  // Clean up test bookings created during tests
  await prisma.booking.deleteMany({
    where: { client: { email: { contains: "test@" } } }, // delete only test bookings
  });
});

test("GET /bookings should respond with 200", async () => {
  const res = await request(app).get("/bookings");
  expect(res.statusCode).toBe(200);
});
