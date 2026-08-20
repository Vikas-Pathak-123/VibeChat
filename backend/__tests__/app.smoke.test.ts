import request from "supertest";
import app from "../app";

describe("app", () => {
  it("responds on GET / outside production", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toBe("Api is running Successfully");
  });
});
