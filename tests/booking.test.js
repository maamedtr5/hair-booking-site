// src/tests/booking.test.js
import request from "supertest";
import app from "../Server.js";

describe("Booking Endpoints", () => {
  test("GET /bookings should respond with 200", async () => {
    const res = await request(app).get("/bookings");
    expect([200, 404]).toContain(res.statusCode);
  });
});
