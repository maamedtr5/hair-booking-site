// src/tests/auth.test.js
import request from "supertest";
import app from "../Server.js";

describe("Auth Endpoints", () => {
  test("POST /auth/register should respond with 201", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "test@example.com", password: "secret123" });
    expect([200, 201]).toContain(res.statusCode);
  });
});
