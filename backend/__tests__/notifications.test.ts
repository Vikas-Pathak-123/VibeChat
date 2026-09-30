import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import Notification from "../models/notificationModel";
import { IUser } from "../models/userModel";
import {
  createUser, tokenFor, createChatWith, createMessage, createNotification,
} from "./helpers";

const auth = (user: IUser) => ({ Authorization: `Bearer ${tokenFor(user)}` });

/** alice sends one message into each of two chats with bob; bob gets a notification for each */
const seed = async () => {
  const alice = await createUser("alice@test.com", "Alice");
  const bob = await createUser("bob@test.com", "Bob");
  const chatA = await createChatWith([alice._id, bob._id]);
  const chatB = await createChatWith([alice._id, bob._id]);
  const msgA = await createMessage({ sender: alice._id, chat: chatA._id });
  const msgB = await createMessage({ sender: alice._id, chat: chatB._id });
  const notifA = await createNotification({ recipient: bob._id, sender: alice._id, chat: chatA._id, message: msgA._id });
  const notifB = await createNotification({ recipient: bob._id, sender: alice._id, chat: chatB._id, message: msgB._id });
  return { alice, bob, chatA, chatB, notifA, notifB };
};

describe("GET /api/notifications", () => {
  it("requires auth", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });

  it("returns only the caller's unread notifications, newest first, populated", async () => {
    const { alice, bob, chatA, notifA, notifB } = await seed();
    await createNotification({ recipient: bob._id, sender: alice._id, chat: chatA._id, message: notifA.message as any, isRead: true });
    await createNotification({ recipient: alice._id, sender: bob._id, chat: chatA._id, message: notifA.message as any });

    const res = await request(app).get("/api/notifications").set(auth(bob));

    expect(res.status).toBe(200);
    expect(res.body.map((n: any) => n._id)).toEqual([notifB._id.toString(), notifA._id.toString()]);
    expect(res.body[0].sender.name).toBe("Alice");
    expect(res.body[0].sender.password).toBeUndefined();
    expect(res.body[0].chat.users.map((u: any) => u.name).sort()).toEqual(["Alice", "Bob"]);
    expect(res.body[0].chat.users[0].password).toBeUndefined();
    expect(res.body[0].message.content).toBe("hello");
  });
});

describe("PUT /api/notifications/:id/read", () => {
  it("marks the caller's notification read and drops it from the unread list", async () => {
    const { bob, notifA, notifB } = await seed();

    const res = await request(app).put(`/api/notifications/${notifA._id}/read`).set(auth(bob));

    expect(res.status).toBe(200);
    expect(res.body.isRead).toBe(true);
    const list = await request(app).get("/api/notifications").set(auth(bob));
    expect(list.body.map((n: any) => n._id)).toEqual([notifB._id.toString()]);
  });

  it("returns 403 and leaves the row unread when the caller is not the recipient", async () => {
    const { alice, notifA } = await seed();

    const res = await request(app).put(`/api/notifications/${notifA._id}/read`).set(auth(alice));

    expect(res.status).toBe(403);
    expect((await Notification.findById(notifA._id))!.isRead).toBe(false);
  });

  it("returns 400 for a malformed id and 404 for an unknown one", async () => {
    const { bob } = await seed();

    const bad = await request(app).put("/api/notifications/not-an-id/read").set(auth(bob));
    expect(bad.status).toBe(400);

    const unknown = await request(app)
      .put(`/api/notifications/${new mongoose.Types.ObjectId()}/read`)
      .set(auth(bob));
    expect(unknown.status).toBe(404);
  });
});

describe("PUT /api/notifications/read-all", () => {
  it("marks every unread notification of the caller read and no one else's", async () => {
    const { alice, bob, chatA, notifA } = await seed();
    const aliceNotif = await createNotification({ recipient: alice._id, sender: bob._id, chat: chatA._id, message: notifA.message as any });

    const res = await request(app).put("/api/notifications/read-all").set(auth(bob));

    expect(res.status).toBe(200);
    expect(res.body.modifiedCount).toBe(2);
    expect(await Notification.countDocuments({ recipient: bob._id, isRead: false })).toBe(0);
    expect((await Notification.findById(aliceNotif._id))!.isRead).toBe(false);
  });
});

describe("PUT /api/notifications/chat/:chatId/read", () => {
  it("marks only the caller's notifications for that chat read", async () => {
    const { bob, chatA, notifA, notifB } = await seed();

    const res = await request(app).put(`/api/notifications/chat/${chatA._id}/read`).set(auth(bob));

    expect(res.status).toBe(200);
    expect(res.body.modifiedCount).toBe(1);
    expect((await Notification.findById(notifA._id))!.isRead).toBe(true);
    expect((await Notification.findById(notifB._id))!.isRead).toBe(false);
  });

  it("returns 400 for a malformed chat id", async () => {
    const { bob } = await seed();
    const res = await request(app).put("/api/notifications/chat/nope/read").set(auth(bob));
    expect(res.status).toBe(400);
  });
});
