// tests/auth.test.js
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

afterEach(async () => {
  // Clean up test users/sessions created during tests
  const users = await prisma.user.findMany({ where: { email: { contains: "test@" } } });
  await prisma.session.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { email: { contains: "test@" } } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("POST /auth/register should respond with 201 and a token", async () => {
  const res = await request(app)
    .post("/auth/register")
    .send({ name: "Test User", email: "test@example.com", password: "Secret123!" });

  expect(res.statusCode).toBe(201);
  expect(res.body.success).toBe(true);
  expect(res.body.data.token).toBeDefined();
  expect(res.body.data.user.email).toBe("test@example.com");
  // Password hash must never be present in the response.
  expect(res.body.data.user.password).toBeUndefined();
  // Public registration must never grant anything above CLIENT, regardless
  // of what the caller sends.
  expect(res.body.data.user.role).toBe("CLIENT");
});

test("POST /auth/register ignores a client-supplied role", async () => {
  const res = await request(app)
    .post("/auth/register")
    .send({ name: "Test User", email: "test@example.com", password: "Secret123!", role: "ADMIN" });

  expect(res.statusCode).toBe(201);
  expect(res.body.data.user.role).toBe("CLIENT");
});

test("POST /auth/register with a weak password should respond with 400", async () => {
  const res = await request(app)
    .post("/auth/register")
    .send({ name: "Test User", email: "test@example.com", password: "weak" });

  expect(res.statusCode).toBe(400);
  expect(res.body.success).toBe(false);
});

test("POST /auth/login with valid credentials should respond with 200 and a token", async () => {
  await request(app)
    .post("/auth/register")
    .send({ name: "Test User", email: "test@example.com", password: "Secret123!" });

  const res = await request(app)
    .post("/auth/login")
    .send({ email: "test@example.com", password: "Secret123!" });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.token).toBeDefined();
  expect(res.body.data.user.password).toBeUndefined();
});

test("POST /auth/login is case-insensitive on email", async () => {
  await request(app)
    .post("/auth/register")
    .send({ name: "Test User", email: "test@example.com", password: "Secret123!" });

  const res = await request(app)
    .post("/auth/login")
    .send({ email: "TEST@EXAMPLE.COM", password: "Secret123!" });

  expect(res.statusCode).toBe(200);
  expect(res.body.data.token).toBeDefined();
});

test("POST /auth/login with wrong password should respond with 401", async () => {
  await request(app)
    .post("/auth/register")
    .send({ name: "Test User", email: "test@example.com", password: "Secret123!" });

  const res = await request(app)
    .post("/auth/login")
    .send({ email: "test@example.com", password: "WrongPassword1!" });

  expect(res.statusCode).toBe(401);
  expect(res.body.success).toBe(false);
});

test("POST /auth/login issues a real Session row so logout can revoke it", async () => {
  await request(app)
    .post("/auth/register")
    .send({ name: "Test User", email: "test@example.com", password: "Secret123!" });

  const login = await request(app)
    .post("/auth/login")
    .send({ email: "test@example.com", password: "Secret123!" });

  const user = await prisma.user.findUnique({ where: { email: "test@example.com" } });
  const sessions = await prisma.session.findMany({ where: { userId: user.id } });
  expect(sessions.length).toBeGreaterThan(0);

  const logout = await request(app)
    .post("/auth/logout")
    .set("Authorization", `Bearer ${login.body.data.token}`);
  expect(logout.statusCode).toBe(200);

  const revoked = await prisma.session.findUnique({ where: { id: sessions[0].id } });
  expect(revoked.revokedAt).not.toBeNull();

  // A revoked token must be rejected on the next authenticated request.
  const afterLogout = await request(app)
    .post("/auth/logout")
    .set("Authorization", `Bearer ${login.body.data.token}`);
  expect(afterLogout.statusCode).toBe(401);
});
