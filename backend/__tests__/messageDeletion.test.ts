import request from "supertest";
import app from "../app";
import { createUser, tokenFor, createChatWith, createMessage } from "./helpers";

describe("DELETE /api/message/:id", () => {
  it("allows the sender to delete their own message", async () => {
    const alice = await createUser("alice@example.com", "Alice");
    const chat = await createChatWith([alice._id]);
    const message = await createMessage({ sender: alice._id, chat: chat._id });

    const res = await request(app)
      .delete(`/api/message/${message._id}`)
      .set("Authorization", `Bearer ${tokenFor(alice)}`);

    expect(res.status).toBe(200);
    expect(res.body.isDeleted).toBe(true);
    expect(Array.isArray(res.body.chat.users)).toBe(true);
  });

  it("rejects a delete request from a non-sender with 403", async () => {
    const alice = await createUser("alice@example.com", "Alice");
    const bob = await createUser("bob@example.com", "Bob");
    const chat = await createChatWith([alice._id, bob._id]);
    const message = await createMessage({ sender: alice._id, chat: chat._id });

    const res = await request(app)
      .delete(`/api/message/${message._id}`)
      .set("Authorization", `Bearer ${tokenFor(bob)}`);

    expect(res.status).toBe(403);
  });

  it("persists isDeleted: true so a later fetch reflects the deletion", async () => {
    const alice = await createUser("alice@example.com", "Alice");
    const chat = await createChatWith([alice._id]);
    const message = await createMessage({ sender: alice._id, chat: chat._id, content: "secret" });

    await request(app)
      .delete(`/api/message/${message._id}`)
      .set("Authorization", `Bearer ${tokenFor(alice)}`);

    const res = await request(app)
      .get(`/api/message/${chat._id}`)
      .set("Authorization", `Bearer ${tokenFor(alice)}`);

    const fetched = res.body.find((m: any) => m._id === message._id.toString());
    expect(fetched.isDeleted).toBe(true);
  });
});
