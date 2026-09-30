import request from "supertest";
import app from "../app";
import Notification from "../models/notificationModel";
import User from "../models/userModel";
import { createUser, tokenFor, createChatWith } from "./helpers";

describe("POST /api/message creates notifications", () => {
  it("creates one unread notification per other member and none for the sender", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    const bob = await createUser("bob@test.com", "Bob");
    const carol = await createUser("carol@test.com", "Carol");
    const chat = await createChatWith([alice._id, bob._id, carol._id]);

    const res = await request(app)
      .post("/api/message")
      .set("Authorization", `Bearer ${tokenFor(alice)}`)
      .send({ content: "hi all", chatId: chat._id });

    expect(res.status).toBe(200);
    const notifs = await Notification.find({}).lean();
    expect(notifs).toHaveLength(2);
    expect(notifs.map((n) => n.recipient.toString()).sort()).toEqual(
      [bob._id.toString(), carol._id.toString()].sort()
    );
    for (const n of notifs) {
      expect(n.sender.toString()).toBe(alice._id.toString());
      expect(n.chat.toString()).toBe(chat._id.toString());
      expect(n.message.toString()).toBe(res.body._id);
      expect(n.type).toBe("message");
      expect(n.isRead).toBe(false);
    }
  });

  it("skips recipients who muted notifications", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    const bob = await createUser("bob@test.com", "Bob");
    const carol = await createUser("carol@test.com", "Carol");
    await User.updateOne({ _id: bob._id }, { muteNotifications: true });
    const chat = await createChatWith([alice._id, bob._id, carol._id]);

    await request(app)
      .post("/api/message")
      .set("Authorization", `Bearer ${tokenFor(alice)}`)
      .send({ content: "hi", chatId: chat._id });

    const notifs = await Notification.find({}).lean();
    expect(notifs.map((n) => n.recipient.toString())).toEqual([carol._id.toString()]);
  });

  it("still sends the message when every other member is muted", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    const bob = await createUser("bob@test.com", "Bob");
    await User.updateOne({ _id: bob._id }, { muteNotifications: true });
    const chat = await createChatWith([alice._id, bob._id]);

    const res = await request(app)
      .post("/api/message")
      .set("Authorization", `Bearer ${tokenFor(alice)}`)
      .send({ content: "anyone?", chatId: chat._id });

    expect(res.status).toBe(200);
    expect(res.body.content).toBe("anyone?");
    expect(await Notification.countDocuments({})).toBe(0);
  });
});
