// src/tests/auth.test.js
import request from "supertest";
import app from "../Server.js";
import { prisma } from "../config/prismaClient.js"; // adjust path to your prisma client

afterEach(async () => {
  // Clean up test users created during tests
  await prisma.user.deleteMany({
    where: { email: { contains: "test@" } }, // only delete test accounts
  });
});

test("POST /auth/register should respond with 201", async () => {
  const res = await request(app)
    .post("/auth/register")
    .send({ email: "test@example.com", password: "secret123" });
  expect(res.statusCode).toBe(201);
});
