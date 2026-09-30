# VIB-23: Notification Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist chat notifications in MongoDB so the bell badge survives a refresh, with mark-read / mark-all-read / mute, replacing the in-memory Zustand notification array.

**Architecture:** `sendMessage` writes one `Notification` row per non-muted, non-sender chat member. A new `/api/notifications` router serves unread rows and read/mute mutations. The frontend treats notifications as server state (TanStack Query), invalidated by the existing `"message recieved"` socket event; the Zustand array is removed.

**Tech Stack:** Express, Mongoose, TypeScript (backend); React, TanStack Query, Zustand, Chakra UI, socket.io-client (frontend); Jest, Supertest, mongodb-memory-server (backend tests).

**Spec:** [docs/superpowers/specs/2026-09-30-notification-center-design.md](../specs/2026-09-30-notification-center-design.md)

## Global Constraints

- No Redux. Ticket's `vibechatApi.ts` / `notificationSlice.ts` map to `store/api/notificationApi.ts` + TanStack Query hooks (see spec table).
- Notification creation failure never fails `POST /api/message` — log and continue.
- `GET /api/notifications` returns only the caller's **unread** notifications, newest first, max 50.
- Frontend type is `AppNotification`, never `Notification` (DOM global).
- Muting is a single global user flag `muteNotifications` (default `false`); no per-chat mute.
- Backend tests use the existing harness (`backend/__tests__/setup.ts`, `helpers.ts`); run with `npm test` from the repo root.
- Frontend has no test harness; frontend tasks verify with `npx tsc --noEmit -p .` and `npm run lint` (run in `frontend/`), plus `npm run build` in the last task.

## Review Focus

- Recipient has the chat open when a message arrives → the notification row is created server-side, then must be marked read by the socket handler; the bell must not flash a badge for the chat they are looking at.
- Chat opened from the sidebar (not the bell) → its unread notifications must clear too, not only the single clicked item.
- Two users on one browser tab (logout → login) → the second user must never see the first user's cached notifications.
- Malformed ids in `/:id/read` and `/chat/:chatId/read` → 400, not 500 (pinned in Task 2).
- A user trying to mark someone else's notification read → 403 and row unchanged (pinned in Task 2).

---

## Task 1: Notification model + create notifications on message send

**Files:**
- Create: `backend/models/notificationModel.ts`
- Create: `backend/services/notificationService.ts`
- Modify: `backend/models/userModel.ts` (add `muteNotifications`)
- Modify: `backend/controllers/messageControllers.ts` (`sendMessage`)
- Test: `backend/__tests__/notificationCreation.test.ts`

**Interfaces:**
- Produces: `Notification` model (default export of `backend/models/notificationModel.ts`) with fields `recipient, sender, chat, message, type, isRead, createdAt, updatedAt`; `IUser.muteNotifications: boolean`; `createMessageNotifications({ messageId, chatId, senderId }): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `backend/__tests__/notificationCreation.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- notificationCreation`
Expected: FAIL — `Cannot find module '../models/notificationModel'`.

- [ ] **Step 3: Add the model, the user flag, the service, and wire `sendMessage`**

Create `backend/models/notificationModel.ts`:

```ts
import mongoose, { Document, Model } from "mongoose";
import { IUser } from "./userModel";
import { IChat } from "./chatModel";
import { IMessage } from "./messageModel";

export type NotificationType = "message";

export interface INotification extends Document {
  _id: string;
  recipient: mongoose.Types.ObjectId | IUser;
  sender: mongoose.Types.ObjectId | IUser;
  chat: mongoose.Types.ObjectId | IChat;
  message: mongoose.Types.ObjectId | IMessage;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new mongoose.Schema<INotification>(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    message: { type: mongoose.Schema.Types.ObjectId, ref: "Message", required: true },
    type: { type: String, enum: ["message"], default: "message" },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Every read path filters by recipient + unread, newest first
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification: Model<INotification> = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);
export default Notification;
```

In `backend/models/userModel.ts`, add to `IUser` after `picture: string;`:

```ts
  muteNotifications: boolean;
```

and to the schema after the `picture` field:

```ts
    muteNotifications: { type: Boolean, default: false },
```

Create `backend/services/notificationService.ts`:

```ts
import mongoose from "mongoose";
import Chat from "../models/chatModel";
import User from "../models/userModel";
import Notification from "../models/notificationModel";

type Id = string | mongoose.Types.ObjectId;

/**
 * Persist one unread "message" notification for every chat member except the
 * sender and anyone who muted notifications.
 *
 * The server can't know which chat a recipient has open, so it always creates
 * them; the client marks a chat's notifications read while that chat is open.
 */
export const createMessageNotifications = async (params: {
  messageId: Id;
  chatId: Id;
  senderId: Id;
}): Promise<void> => {
  const chat = await Chat.findById(params.chatId).select("users");
  if (!chat) return;

  const senderId = params.senderId.toString();
  const otherIds = chat.users
    .map((u) => (u as mongoose.Types.ObjectId).toString())
    .filter((id) => id !== senderId);
  if (otherIds.length === 0) return;

  const recipients = await User.find({
    _id: { $in: otherIds },
    muteNotifications: { $ne: true },
  }).select("_id");
  if (recipients.length === 0) return;

  await Notification.insertMany(
    recipients.map((r) => ({
      recipient: r._id,
      sender: params.senderId,
      chat: params.chatId,
      message: params.messageId,
      type: "message",
    }))
  );
};
```

In `backend/controllers/messageControllers.ts`, add the import:

```ts
import { createMessageNotifications } from "../services/notificationService";
```

and in `sendMessage`, replace

```ts
    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(message);
```

with

```ts
    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    // A notification failure must never fail the send itself
    await createMessageNotifications({
      messageId: message._id,
      chatId,
      senderId: req.user._id,
    }).catch((err: Error) =>
      console.error("[notifications] failed to create message notifications:", err.message)
    );

    res.json(message);
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- notificationCreation`
Expected: PASS, 3/3.

- [ ] **Step 5: Run the whole backend suite and commit**

Run: `npm test`
Expected: all suites pass (13 tests).

```bash
git add backend/models/notificationModel.ts backend/services/notificationService.ts backend/models/userModel.ts backend/controllers/messageControllers.ts backend/__tests__/notificationCreation.test.ts
git commit -m "VIB-23: Persist a notification per recipient when a message is sent"
```

---

## Task 2: Notification read endpoints

**Files:**
- Create: `backend/controllers/notificationControllers.ts`
- Create: `backend/routes/notificationRoutes.ts`
- Modify: `backend/app.ts` (mount router)
- Modify: `backend/__tests__/helpers.ts` (add `createNotification`)
- Test: `backend/__tests__/notifications.test.ts`

**Interfaces:**
- Consumes: `Notification` model from Task 1.
- Produces: `GET /api/notifications`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`, `PUT /api/notifications/chat/:chatId/read` (shapes in spec). `notificationControllers.ts` and `notificationRoutes.ts` are extended in Task 3.

- [ ] **Step 1: Add the test helper and write the failing tests**

Append to `backend/__tests__/helpers.ts` (and add `import Notification, { INotification } from "../models/notificationModel";` to its imports):

```ts
export const createNotification = async (params: {
  recipient: string | IUser["_id"];
  sender: string | IUser["_id"];
  chat: string | IChat["_id"];
  message: string | IMessage["_id"];
  isRead?: boolean;
}): Promise<INotification> => {
  return Notification.create({ ...params, type: "message", isRead: params.isRead ?? false });
};
```

Create `backend/__tests__/notifications.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- notifications.test`
Expected: FAIL — every request returns 404 (no `/api/notifications` route), except the 401 auth test which also gets 404.

- [ ] **Step 3: Implement controllers, routes, and mount**

Create `backend/controllers/notificationControllers.ts`:

```ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Notification from "../models/notificationModel";

const NOTIFICATION_LIMIT = 50;

//@description     Fetch the logged-in user's unread notifications (newest first)
//@route           GET /api/notifications
//@access          Protected
export const getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const notifications = await Notification.find({ recipient: req.user._id, isRead: false })
    .sort({ createdAt: -1, _id: -1 })
    .limit(NOTIFICATION_LIMIT)
    .populate("sender", "name picture email")
    .populate({ path: "chat", populate: { path: "users", select: "name picture email" } })
    .populate("message", "content messageType isDeleted");

  // Drop rows whose chat or sender no longer resolves — the client can't render them
  res.json(notifications.filter((n) => n.chat && n.sender));
});

//@description     Mark one notification read
//@route           PUT /api/notifications/:id/read
//@access          Protected
export const markNotificationRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid notification id");
  }

  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  if (notification.recipient.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to update this notification");
  }

  notification.isRead = true;
  await notification.save();
  res.json(notification);
});

//@description     Mark all of the logged-in user's notifications read
//@route           PUT /api/notifications/read-all
//@access          Protected
export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );
  res.json({ modifiedCount: result.modifiedCount });
});

//@description     Mark the logged-in user's notifications for one chat read
//@route           PUT /api/notifications/chat/:chatId/read
//@access          Protected
export const markChatNotificationsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  if (!mongoose.isValidObjectId(req.params.chatId)) {
    res.status(400);
    throw new Error("Invalid chat id");
  }

  const result = await Notification.updateMany(
    { recipient: req.user._id, chat: req.params.chatId, isRead: false },
    { isRead: true }
  );
  res.json({ modifiedCount: result.modifiedCount });
});
```

Create `backend/routes/notificationRoutes.ts`:

```ts
import express from "express";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markChatNotificationsRead,
} from "../controllers/notificationControllers";
import { protect } from "../Middleware/authMiddleware";

const router = express.Router();

router.route("/").get(protect, getNotifications);
router.route("/read-all").put(protect, markAllNotificationsRead);
router.route("/chat/:chatId/read").put(protect, markChatNotificationsRead);
router.route("/:id/read").put(protect, markNotificationRead);

export default router;
```

In `backend/app.ts`, add `import notificationRoutes from "./routes/notificationRoutes";` after the `messageRoutes` import, and `app.use("/api/notifications", notificationRoutes);` after the `/api/message` mount.

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- notifications.test`
Expected: PASS, 8/8.

- [ ] **Step 5: Run the whole backend suite and commit**

Run: `npm test`
Expected: all suites pass (21 tests).

```bash
git add backend/controllers/notificationControllers.ts backend/routes/notificationRoutes.ts backend/app.ts backend/__tests__/helpers.ts backend/__tests__/notifications.test.ts
git commit -m "VIB-23: Add notification list and mark-read endpoints"
```

---

## Task 3: Notification preference endpoints

**Files:**
- Modify: `backend/controllers/notificationControllers.ts`
- Modify: `backend/routes/notificationRoutes.ts`
- Test: `backend/__tests__/notificationPreferences.test.ts`

**Interfaces:**
- Consumes: `IUser.muteNotifications` and mute-aware `createMessageNotifications` from Task 1; router from Task 2.
- Produces: `GET /api/notifications/preferences` → `{ muteNotifications: boolean }`; `PUT /api/notifications/preferences` body `{ muteNotifications: boolean }` → same shape.

- [ ] **Step 1: Write the failing tests**

Create `backend/__tests__/notificationPreferences.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- notificationPreferences`
Expected: FAIL — `GET /preferences` returns 404 (no route); `PUT /preferences` returns 404.

- [ ] **Step 3: Implement**

Append to `backend/controllers/notificationControllers.ts` (and add `import User from "../models/userModel";`):

```ts
//@description     Get the logged-in user's notification preferences
//@route           GET /api/notifications/preferences
//@access          Protected
export const getNotificationPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  res.json({ muteNotifications: req.user.muteNotifications === true });
});

//@description     Update the logged-in user's notification preferences
//@route           PUT /api/notifications/preferences
//@access          Protected
export const updateNotificationPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const { muteNotifications } = req.body;
  if (typeof muteNotifications !== "boolean") {
    res.status(400);
    throw new Error("muteNotifications must be a boolean");
  }

  await User.findByIdAndUpdate(req.user._id, { muteNotifications });
  res.json({ muteNotifications });
});
```

In `backend/routes/notificationRoutes.ts`, import both and add after the `/read-all` route:

```ts
router
  .route("/preferences")
  .get(protect, getNotificationPreferences)
  .put(protect, updateNotificationPreferences);
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- notificationPreferences`
Expected: PASS, 3/3.

- [ ] **Step 5: Run the whole backend suite, typecheck the build, and commit**

Run: `npm test && npx tsc -p backend --noEmit`
Expected: all suites pass (24 tests); tsc exits 0.

```bash
git add backend/controllers/notificationControllers.ts backend/routes/notificationRoutes.ts backend/__tests__/notificationPreferences.test.ts
git commit -m "VIB-23: Add notification mute preference endpoints"
```

---

## Task 4: Frontend notification center (data layer, socket, bell, open-chat read)

**Files:**
- Create: `frontend/src/types/notification.types.ts`
- Create: `frontend/src/store/api/notificationApi.ts`
- Create: `frontend/src/hooks/useNotifications.ts`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/store/keys/queryKeys.ts`
- Modify: `frontend/src/store/index.ts`
- Modify: `frontend/src/store/chatStore.ts` (remove notifications)
- Modify: `frontend/src/store/socketStore.ts` (`"message recieved"`)
- Modify: `frontend/src/components/miscellaneous/SideDrawer.tsx`
- Modify: `frontend/src/components/SingleChat.tsx`

**Interfaces:**
- Consumes: endpoints from Tasks 2 and 3.
- Produces: `AppNotification`, `NotificationPreferences` types; `queryKeys.notifications.list()` / `.preferences()`; fetchers `fetchNotifications`, `markNotificationRead(id)`, `markAllNotificationsRead()`, `markChatNotificationsRead(chatId)`, `fetchNotificationPreferences()`, `updateNotificationPreferences(prefs)`; hooks `useNotificationsQuery`, `useMarkNotificationRead`, `useMarkAllNotificationsRead`, `useMarkChatNotificationsRead`.

- [ ] **Step 1: Types, key factory, fetchers**

Create `frontend/src/types/notification.types.ts`:

```ts
import { User } from "./user.types";
import { Chat } from "./chat.types";
import { Message } from "./message.types";

/**
 * A persisted in-app notification (GET /api/notifications).
 * Named AppNotification so it never shadows the DOM `Notification` global.
 */
export interface AppNotification {
  _id: string;
  recipient: string;
  sender: User;
  chat: Chat;
  message: Pick<Message, "_id" | "content" | "messageType" | "isDeleted">;
  type: "message";
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  muteNotifications: boolean;
}
```

Append to `frontend/src/types/index.ts`:

```ts
export type { AppNotification, NotificationPreferences } from "./notification.types";
```

In `frontend/src/store/keys/queryKeys.ts`, add after the `users` block:

```ts
  notifications: {
    list:        () => ["notifications", "list"]        as const,
    preferences: () => ["notifications", "preferences"] as const,
  },
```

Create `frontend/src/store/api/notificationApi.ts`:

```ts
import apiClient from "./apiClient";
import { AppNotification, NotificationPreferences } from "../../types";

/**
 * TanStack Query fetch functions for the Notification domain.
 */

export const fetchNotifications = async (): Promise<AppNotification[]> => {
  const { data } = await apiClient.get<AppNotification[]>("/api/notifications");
  return data;
};

export const markNotificationRead = async (notificationId: string): Promise<AppNotification> => {
  const { data } = await apiClient.put<AppNotification>(`/api/notifications/${notificationId}/read`);
  return data;
};

export const markAllNotificationsRead = async (): Promise<{ modifiedCount: number }> => {
  const { data } = await apiClient.put<{ modifiedCount: number }>("/api/notifications/read-all");
  return data;
};

export const markChatNotificationsRead = async (chatId: string): Promise<{ modifiedCount: number }> => {
  const { data } = await apiClient.put<{ modifiedCount: number }>(`/api/notifications/chat/${chatId}/read`);
  return data;
};

export const fetchNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const { data } = await apiClient.get<NotificationPreferences>("/api/notifications/preferences");
  return data;
};

export const updateNotificationPreferences = async (
  payload: NotificationPreferences
): Promise<NotificationPreferences> => {
  const { data } = await apiClient.put<NotificationPreferences>("/api/notifications/preferences", payload);
  return data;
};
```

Append to `frontend/src/store/index.ts`:

```ts
export * from "./api/notificationApi";
```

- [ ] **Step 2: Hooks**

Create `frontend/src/hooks/useNotifications.ts`:

```ts
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markChatNotificationsRead,
} from "../store/api/notificationApi";
import { queryClient } from "../store/queryClient";
import { queryKeys } from "../store/keys/queryKeys";
import { useAuthStore } from "../store/authStore";
import { AppNotification } from "../types";

/**
 * Notification hooks — the bell's server state (VIB-23).
 *
 * Unread notifications live in the DB and the TanStack cache, so the badge
 * survives a page refresh. Mark-read mutations drop rows from the cache
 * optimistically, then refetch to reconcile.
 */

const dropFromCache = (predicate: (n: AppNotification) => boolean): void => {
  queryClient.setQueryData<AppNotification[]>(queryKeys.notifications.list(), (old) =>
    old?.filter((n) => !predicate(n))
  );
};

const refetchNotifications = () =>
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });

export const useNotificationsQuery = () => {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: fetchNotifications,
    enabled: !!user,
  });
};

export const useMarkNotificationRead = () =>
  useMutation({
    mutationFn: markNotificationRead,
    onMutate: (notificationId: string) => dropFromCache((n) => n._id === notificationId),
    onSettled: refetchNotifications,
  });

export const useMarkAllNotificationsRead = () =>
  useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: () => dropFromCache(() => true),
    onSettled: refetchNotifications,
  });

export const useMarkChatNotificationsRead = () =>
  useMutation({
    mutationFn: markChatNotificationsRead,
    onMutate: (chatId: string) => dropFromCache((n) => n.chat._id === chatId),
    onSettled: refetchNotifications,
  });
```

- [ ] **Step 3: Remove the in-memory array; rewire the socket handler**

In `frontend/src/store/chatStore.ts`: delete `notifications: Message[];`, `addNotification`, `clearNotification`, `clearAllNotifications` from `ChatState` and their implementations and the `notifications: []` initial value; change the import to `import { Chat } from "../types";`; replace the doc-comment line `* - Pending notification messages (received via Socket.IO, cleared on chat open)` with `* - (Notifications are server state since VIB-23 — see hooks/useNotifications.ts)`.

In `frontend/src/store/socketStore.ts`, add `import { markChatNotificationsRead } from "./api/notificationApi";` and replace the `"message recieved"` handler body with:

```ts
        socket.on("message recieved", (newMessage: Message) => {
          const { selectedChat } = useChatStore.getState();
          const notificationsKey = queryKeys.notifications.list();

          if (selectedChat?._id === newMessage.chat._id) {
            // Active chat → invalidate TanStack Query cache so messages refetch
            queryClient.invalidateQueries({
              queryKey: queryKeys.messages.list(newMessage.chat._id),
            });
            // The server persisted a notification; the user is looking at this chat
            markChatNotificationsRead(newMessage.chat._id)
              .catch(() => undefined)
              .finally(() => queryClient.invalidateQueries({ queryKey: notificationsKey }));
          } else {
            // Background chat → refetch the persisted notifications for the bell
            queryClient.invalidateQueries({ queryKey: notificationsKey });
          }

          // Always invalidate chat list so latest message preview updates
          queryClient.invalidateQueries({ queryKey: queryKeys.chats.all() });
        });
```

Update the header comment line `* - Zustand chatStore (notifications, typing indicators)` to `* - Zustand chatStore (typing indicators)` and add `* - Notifications query (refetch; mark read when the chat is open)`.

- [ ] **Step 4: Bell in SideDrawer**

In `frontend/src/components/miscellaneous/SideDrawer.tsx`:

- Remove `import { getSender } from "../../config/ChatLogics";`.
- Add `import { useNotificationsQuery, useMarkNotificationRead, useMarkAllNotificationsRead } from "../../hooks/useNotifications";`.
- Replace `const { notifications, setSelectedChat, clearNotification } = useChatStore();` (currently split over two lines) with:

```tsx
  const { setSelectedChat }                     = useChatStore();
  const { data: notifications = [] }            = useNotificationsQuery();
  const { mutate: markRead }                    = useMarkNotificationRead();
  const { mutate: markAllRead }                 = useMarkAllNotificationsRead();
```

- In `logoutHandler`, after `logout();` add:

```tsx
    queryClient.clear(); // drop the previous user's cached chats/notifications
```

- Replace the bell badge and `MenuList` block with:

```tsx
              {notifications.length > 0 && (
                <Badge position="absolute" top="-1" right="-1"
                  colorScheme="red" borderRadius="full" fontSize="9px"
                  minW="16px" h="16px" px="3px" display="flex" alignItems="center" justifyContent="center">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </Badge>
              )}
            </MenuButton>
            <MenuList maxW="90vw">
              {!notifications.length && <MenuItem>🔔 No new messages</MenuItem>}
              {notifications.map((notif) => (
                <MenuItem key={notif._id} whiteSpace="normal"
                  onClick={() => {
                    setSelectedChat(notif.chat);
                    markRead(notif._id);
                  }}>
                  {notif.chat.isGroupChat
                    ? `📢 New message in ${notif.chat.chatName}`
                    : `💬 New message from ${notif.sender.name}`}
                </MenuItem>
              ))}
              {notifications.length > 0 && (
                <>
                  <MenuDivider />
                  <MenuItem fontSize="sm" color="text-secondary" onClick={() => markAllRead()}>
                    ✓ Mark all as read
                  </MenuItem>
                </>
              )}
            </MenuList>
```

- Update the header doc-comment line `* - Notifications / selectedChat: useChatStore (Zustand)` to `* - selectedChat: useChatStore (Zustand)` and add `* - Notifications: useNotificationsQuery + mark-read mutations (TanStack Query, DB-backed)`.

- [ ] **Step 5: Opening a chat reads its notifications (SingleChat)**

In `frontend/src/components/SingleChat.tsx`, add `import { useNotificationsQuery, useMarkChatNotificationsRead } from "../hooks/useNotifications";`, and after the join-room `useEffect` add:

```tsx
  // ── Opening a chat reads its notifications (also covers sidebar opens) ─────
  const { data: notifications = [] } = useNotificationsQuery();
  const { mutate: markChatRead }     = useMarkChatNotificationsRead();

  useEffect(() => {
    if (!selectedChat) return;
    if (notifications.some((n) => n.chat._id === selectedChat._id)) {
      markChatRead(selectedChat._id);
    }
  }, [selectedChat, notifications, markChatRead]);
```

- [ ] **Step 6: Verify**

Run (in `frontend/`): `npx tsc --noEmit -p . && npm run lint`
Expected: both exit 0, no output from tsc, no lint warnings. Also `grep -rn "addNotification\|clearNotification\|clearAllNotifications" src` → no matches.

- [ ] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "VIB-23: DB-backed notification bell with mark-read and mark-all-read"
```

---

## Task 5: Mute toggle in profile settings

**Files:**
- Modify: `frontend/src/hooks/useNotifications.ts`
- Modify: `frontend/src/components/miscellaneous/ProfileModal.tsx`

**Interfaces:**
- Consumes: `fetchNotificationPreferences`, `updateNotificationPreferences`, `queryKeys.notifications.preferences()` from Task 4.
- Produces: `useNotificationPreferences(enabled: boolean)`, `useUpdateNotificationPreferences()`.

- [ ] **Step 1: Preference hooks**

In `frontend/src/hooks/useNotifications.ts`, extend the fetcher import with `fetchNotificationPreferences, updateNotificationPreferences`, add `import { useToast } from "@chakra-ui/react";`, and append:

```ts
export const useNotificationPreferences = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: fetchNotificationPreferences,
    enabled,
  });

export const useUpdateNotificationPreferences = () => {
  const toast = useToast();
  return useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (prefs) => {
      queryClient.setQueryData(queryKeys.notifications.preferences(), prefs);
      toast({
        title: prefs.muteNotifications ? "Message notifications muted 🔕" : "Message notifications on 🔔",
        status: "success", duration: 2500, isClosable: true, position: "top",
      });
    },
    onError: () =>
      toast({ title: "Failed to update notification settings", status: "error", duration: 4000, isClosable: true, position: "top" }),
  });
};
```

- [ ] **Step 2: Switch in ProfileModal**

In `frontend/src/components/miscellaneous/ProfileModal.tsx`:

- Add `Switch, FormControl, FormLabel` to the `@chakra-ui/react` import.
- Add `import { useNotificationPreferences, useUpdateNotificationPreferences } from "../../hooks/useNotifications";`.
- After `const { mutate: updateProfile, isPending: saveLoading } = useUpdateProfileMutation();` add:

```tsx
  const { data: notificationPrefs }                        = useNotificationPreferences(isOpen && isOwnProfile);
  const { mutate: updatePrefs, isPending: prefsSaving }    = useUpdateNotificationPreferences();
```

- Between the Email `HStack` and the `<Divider borderColor="border-subtle" />`, add:

```tsx
              {/* Notification settings — own profile only */}
              {isOwnProfile && (
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel htmlFor="mute-notifications" mb={0} fontSize="sm" color="text-primary">
                    🔕 Mute message notifications
                  </FormLabel>
                  <Switch
                    id="mute-notifications" colorScheme="pink"
                    isChecked={notificationPrefs?.muteNotifications ?? false}
                    isDisabled={!notificationPrefs || prefsSaving}
                    onChange={(e) => updatePrefs({ muteNotifications: e.target.checked })}
                  />
                </FormControl>
              )}
```

- Add `* - Notification mute: useNotificationPreferences / useUpdateNotificationPreferences (TanStack Query)` to the component doc comment's state list.

- [ ] **Step 3: Verify**

Run (in `frontend/`): `npx tsc --noEmit -p . && npm run lint && npm run build`
Expected: tsc and lint exit 0 with no warnings; build ends with "Compiled successfully" (or "The build folder is ready to be deployed").

- [ ] **Step 4: Commit**

```bash
git add frontend/src
git commit -m "VIB-23: Mute message notifications toggle in profile settings"
```
