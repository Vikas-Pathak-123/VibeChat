import request from "supertest";
import app from "../app";
import { createUser, tokenFor, createChatWith, createMessage } from "./helpers";

describe("PUT /api/message/:id/react", () => {
  it("adds a reaction from the requesting user", async () => {
    const alice = await createUser("alice@example.com", "Alice");
    const bob = await createUser("bob@example.com", "Bob");
    const chat = await createChatWith([alice._id, bob._id]);
    const message = await createMessage({ sender: alice._id, chat: chat._id });

    const res = await request(app)
      .put(`/api/message/${message._id}/react`)
      .set("Authorization", `Bearer ${tokenFor(bob)}`)
      .send({ emoji: "👍" });

    expect(res.status).toBe(200);
    expect(res.body.reactions).toHaveLength(1);
    expect(res.body.reactions[0]).toMatchObject({ emoji: "👍", userId: bob._id.toString() });
  });

  it("toggles the same emoji off on a second call from the same user", async () => {
    const alice = await createUser("alice@example.com", "Alice");
    const chat = await createChatWith([alice._id]);
    const message = await createMessage({ sender: alice._id, chat: chat._id });
    const token = tokenFor(alice);

    await request(app)
      .put(`/api/message/${message._id}/react`)
      .set("Authorization", `Bearer ${token}`)
      .send({ emoji: "🔥" });

    const res = await request(app)
      .put(`/api/message/${message._id}/react`)
      .set("Authorization", `Bearer ${token}`)
      .send({ emoji: "🔥" });

    expect(res.status).toBe(200);
    expect(res.body.reactions).toHaveLength(0);
  });

  it("does not clobber another user's reaction on the same message", async () => {
    const alice = await createUser("alice@example.com", "Alice");
    const bob = await createUser("bob@example.com", "Bob");
    const chat = await createChatWith([alice._id, bob._id]);
    const message = await createMessage({ sender: alice._id, chat: chat._id });

    await request(app)
      .put(`/api/message/${message._id}/react`)
      .set("Authorization", `Bearer ${tokenFor(alice)}`)
      .send({ emoji: "👍" });

    const res = await request(app)
      .put(`/api/message/${message._id}/react`)
      .set("Authorization", `Bearer ${tokenFor(bob)}`)
      .send({ emoji: "👍" });

    expect(res.status).toBe(200);
    expect(res.body.reactions).toHaveLength(2);
  });

  it("returns 400 (not 500) for a malformed message id", async () => {
    const alice = await createUser("alice@example.com", "Alice");

    const res = await request(app)
      .put(`/api/message/not-a-valid-id/react`)
      .set("Authorization", `Bearer ${tokenFor(alice)}`)
      .send({ emoji: "👍" });

    expect(res.status).toBe(400);
  });
});
