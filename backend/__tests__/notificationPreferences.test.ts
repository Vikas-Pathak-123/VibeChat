import request from "supertest";
import app from "../app";
import User from "../models/userModel";
import Notification from "../models/notificationModel";
import { createUser, tokenFor, createChatWith } from "./helpers";

describe("notification preferences", () => {
  it("defaults to not muted", async () => {
    const bob = await createUser("bob@test.com", "Bob");
    const res = await request(app)
      .get("/api/notifications/preferences")
      .set("Authorization", `Bearer ${tokenFor(bob)}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ muteNotifications: false });
  });

  it("persists a mute and stops new notifications for that user", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    const bob = await createUser("bob@test.com", "Bob");
    const chat = await createChatWith([alice._id, bob._id]);

    const put = await request(app)
      .put("/api/notifications/preferences")
      .set("Authorization", `Bearer ${tokenFor(bob)}`)
      .send({ muteNotifications: true });
    expect(put.status).toBe(200);
    expect(put.body).toEqual({ muteNotifications: true });
    expect((await User.findById(bob._id))!.muteNotifications).toBe(true);

    const get = await request(app)
      .get("/api/notifications/preferences")
      .set("Authorization", `Bearer ${tokenFor(bob)}`);
    expect(get.body).toEqual({ muteNotifications: true });

    await request(app)
      .post("/api/message")
      .set("Authorization", `Bearer ${tokenFor(alice)}`)
      .send({ content: "psst", chatId: chat._id });
    expect(await Notification.countDocuments({ recipient: bob._id })).toBe(0);
  });

  it("rejects a non-boolean value", async () => {
    const bob = await createUser("bob@test.com", "Bob");
    const res = await request(app)
      .put("/api/notifications/preferences")
      .set("Authorization", `Bearer ${tokenFor(bob)}`)
      .send({ muteNotifications: "yes" });
    expect(res.status).toBe(400);
    expect((await User.findById(bob._id))!.muteNotifications).toBe(false);
  });
});
