# VIB-22: Messaging Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add message reactions, sender-only message deletion, and image sharing to VibeChat, on top of the existing Zustand + TanStack Query + Socket.IO stack.

**Architecture:** Two new protected REST endpoints (`PUT /api/message/:id/react`, `DELETE /api/message/:id`) follow the existing controller/route pattern. Both broadcast over Socket.IO using the same client-emits-after-REST-success relay shape as `"new message"`. Image sharing reuses the existing unsigned client-direct-to-Cloudinary upload pattern (no new backend endpoint) and stores the resulting URL in the existing `content` field with `messageType: "image"`. A new Jest + Supertest + mongodb-memory-server harness (first backend tests in this repo) covers the two new endpoints; this requires extracting the Express `app` out of `server.ts` into its own importable module.

**Tech Stack:** Express, Mongoose, TypeScript, Socket.IO (backend); React, Zustand, TanStack Query, Chakra UI, socket.io-client (frontend); Jest, ts-jest, Supertest, mongodb-memory-server (new, backend tests); emoji-picker-react (new, frontend).

**Spec:** [docs/superpowers/specs/2026-08-20-messaging-enhancements-design.md](../specs/2026-08-20-messaging-enhancements-design.md)

## Global Constraints

- No new backend upload endpoint for images — client uploads directly to Cloudinary using the existing unsigned preset (`upload_preset: "VibeChat"`, `cloud_name: "difmt49ax"`), same as `Signup.tsx` / `ProfileModal.tsx`.
- No new lightbox library — full-size image view uses Chakra's existing `Modal`.
- Reactions: toggle-only. A user reacting with an emoji they've already used on that message removes it; no separate "remove" UI.
- Deletion is a soft delete (`isDeleted: true`); `content` is left in place in the DB and is never scrubbed server-side.
- Socket relay excludes the **acting user** (whoever performed the REST call), not `message.sender` — those differ for reactions/deletion, unlike `"new message"`.
- Cache updates use TanStack Query invalidate-and-refetch on the receiving end (consistent with `"message recieved"`), never hand-patching from socket payloads.
- Backend test coverage is scoped to the two new endpoints only — no broader backend test suite, no frontend component tests (per spec's Testing section).
- The two inline bug fixes ship in the task that already touches their file: the `messageControllers.ts` `pic`→`picture` fix ships in Task 3 (Reactions endpoint), the `server.ts` `socket.off("setup")`→`socket.on("disconnect")` fix ships in Task 4 (Reactions socket relay).

---

## Task 1: Test infrastructure — Jest, Supertest, mongodb-memory-server, extracted `app.ts`

The Express app is currently built inline inside `server.ts`'s `startServer()`, which also calls `connectDB()` and `app.listen()` — there's no way to import just the app for Supertest without starting a real server or hitting a real database. This task extracts a plain `app.ts` module and points `server.ts` at it, then wires up the test harness against a smoke test.

**Files:**
- Create: `backend/app.ts`
- Create: `jest.config.cjs`
- Create: `backend/tsconfig.jest.json`
- Create: `backend/__tests__/setup.ts`
- Create: `backend/__tests__/helpers.ts`
- Create: `backend/__tests__/app.smoke.test.ts`
- Modify: `backend/server.ts`
- Modify: `package.json` (root)

**Interfaces:**
- Produces: `backend/app.ts` default-exports a plain Express `app` (no `listen()`, no `connectDB()` call) — every later backend test task imports this. `backend/__tests__/helpers.ts` exports `createUser(email, name?)`, `tokenFor(user)`, `createChatWith(userIds)`, `createMessage({sender, chat, content?})` — every later test task uses these.

- [ ] **Step 1: Install test dependencies**

Run from the repo root (single shared `node_modules` — `backend/package.json` only sets `"type": "commonjs"`, all backend deps live in the root `package.json`):

```bash
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest mongodb-memory-server
```

- [ ] **Step 2: Write the failing smoke test**

Create `backend/__tests__/app.smoke.test.ts`:

```ts
import request from "supertest";
import app from "../app";

describe("app", () => {
  it("responds on GET / outside production", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toBe("Api is running Successfully");
  });
});
```

- [ ] **Step 3: Add the Jest config, test tsconfig, and Mongo test setup**

Create `backend/tsconfig.jest.json` (overrides the `node16` module setting from the main backend tsconfig — Jest's CJS runtime needs a plain `commonjs` transform output):

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node"
  }
}
```

Create `jest.config.cjs` at the repo root (`.cjs` extension is required — the root `package.json` has `"type": "module"`, so a plain `.js` file here would be parsed as ESM and `module.exports` would fail):

```js
/** @type {import('jest').Config} */
module.exports = {
  rootDir: "backend",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.jest.json" }],
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  testTimeout: 30000,
};
```

Create `backend/__tests__/setup.ts`:

```ts
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-jwt-secret";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
```

Create `backend/__tests__/helpers.ts`:

```ts
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/userModel";
import Chat, { IChat } from "../models/chatModel";
import Message, { IMessage } from "../models/messageModel";

export const createUser = async (email: string, name = "Test User"): Promise<IUser> => {
  return User.create({ name, email, password: "password123" });
};

export const tokenFor = (user: IUser): string => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, { expiresIn: "1d" });
};

export const createChatWith = async (userIds: (string | IUser["_id"])[]): Promise<IChat> => {
  return Chat.create({ chatName: "test chat", isGroupChat: false, users: userIds });
};

export const createMessage = async (params: {
  sender: string | IUser["_id"];
  chat: string | IChat["_id"];
  content?: string;
}): Promise<IMessage> => {
  return Message.create({
    sender: params.sender,
    chat: params.chat,
    content: params.content ?? "hello",
  });
};
```

- [ ] **Step 4: Run the test suite and verify it fails**

Run: `npx jest --config jest.config.cjs`
Expected: FAIL — `Cannot find module '../app' from '__tests__/app.smoke.test.ts'` (`backend/app.ts` doesn't exist yet).

- [ ] **Step 5: Extract `app.ts` from `server.ts`**

Create `backend/app.ts` — this is everything from the current `server.ts` that builds the Express app, minus `connectDB()`, `app.listen()`, and the Socket.IO setup:

```ts
import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import userRoutes from "./routes/userRoutes";
import chatRoutes from "./routes/chatRoutes";
import messageRoutes from "./routes/messageRoutes";
import { notFound, errorHandler } from "./Middleware/errorMiddleware";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (_req: Request, res: Response) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (_req: Request, res: Response) => {
    res.send("Api is running Successfully");
  });
}

// --------------------------deployment------------------------------

app.use(notFound);
app.use(errorHandler);

export default app;
```

Replace `backend/server.ts` in full with:

```ts
import colors from "colors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import app from "./app";
import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "./types/socket.types";
import { IUser } from "./models/userModel";
import { printLogo } from "./config/logo";

dotenv.config();

const startServer = async () => {
  // Print multicolor startup logo with animation
  await printLogo();

  connectDB();

  const PORT = process.env.PORT || 4000;
  const server = app.listen(PORT, () => {
    console.log(colors.yellow(`Server running at port ${PORT}`));
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    pingTimeout: 60000,
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("Connected to socket.io");
    let socketUserData: IUser | null = null;

    socket.on("setup", (userData) => {
      socketUserData = userData;
      socket.join(userData._id);
      socket.emit("connected");
    });

    socket.on("join chat", (room) => {
      socket.join(room);
      console.log("User Joined Room: " + room);
    });
    socket.on("typing", (room) => socket.in(room).emit("typing"));
    socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

    socket.on("new message", (newMessageRecieved) => {
      const chat = newMessageRecieved.chat;

      if (!chat.users) return console.log("chat.users not defined");

      chat.users.forEach((user) => {
        if (user._id === newMessageRecieved.sender._id) return;

        socket.in(user._id).emit("message recieved", newMessageRecieved);
      });
    });

    socket.on("disconnect", () => {
      console.log("USER DISCONNECTED");
      if (socketUserData) {
        socket.leave(socketUserData._id);
      }
    });
  });
};

startServer();
```

(This step also lands the `socket.off("setup", ...)` → `socket.on("disconnect", ...)` bug fix, since it's impossible to move this block without touching that line — see Global Constraints for why it's not deferred to Task 4. Task 4 will add the `"message reaction"` handler alongside it.)

- [ ] **Step 6: Run the test suite and verify it passes**

Run: `npx jest --config jest.config.cjs`
Expected: PASS — 1 test passed.

- [ ] **Step 7: Wire up the root `test` script**

Edit `package.json` (root) — replace the placeholder `"test"` script:

```json
"test": "jest --config jest.config.cjs",
```

(was `"test": "echo \"Error: no test specified\" && exit 1"`)

- [ ] **Step 8: Full verification and commit**

Run: `npm test` (from root) — expect the same 1 passing test.
Run: `npx tsc -p backend --noEmit` — expect no errors.

```bash
git add backend/app.ts backend/server.ts backend/tsconfig.jest.json backend/__tests__ jest.config.cjs package.json package-lock.json
git commit -m "VIB-22: Add Jest/Supertest test harness, extract app.ts from server.ts"
```

---

## Task 2: Data model — reactions, soft delete, image message type

**Files:**
- Modify: `backend/models/messageModel.ts`
- Modify: `frontend/src/types/message.types.ts`
- Modify: `frontend/src/types/index.ts`

**Interfaces:**
- Produces: `IReaction { emoji: string; userId: ObjectId | IUser }` and `IMessage` gains `messageType: "text" | "image"`, `reactions: IReaction[]`, `isDeleted: boolean` (backend). `Reaction { emoji: string; userId: string }` and `Message` gains the same three fields, mirrored for the frontend (`frontend/src/types/message.types.ts`), with `Reaction` re-exported from the `frontend/src/types` barrel — Task 5 imports it from there.

- [ ] **Step 1: Extend the backend message model**

Replace `backend/models/messageModel.ts` in full:

```ts
import mongoose, { Document, Model } from "mongoose";
import { IUser } from "./userModel";
import { IChat } from "./chatModel";

export interface IReaction {
  emoji: string;
  userId: mongoose.Types.ObjectId | IUser;
}

export interface IMessage extends Document {
  _id: string;
  sender: mongoose.Types.ObjectId | IUser;
  content: string;
  chat: mongoose.Types.ObjectId | IChat;
  messageType: "text" | "image";
  reactions: IReaction[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reactionSchema = new mongoose.Schema<IReaction>(
  {
    emoji: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema<IMessage>(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    messageType: { type: String, enum: ["text", "image"], default: "text" },
    reactions: { type: [reactionSchema], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const Message: Model<IMessage> = mongoose.model<IMessage>("Message", messageSchema);
export default Message;
```

- [ ] **Step 2: Mirror the type on the frontend**

Replace `frontend/src/types/message.types.ts` in full:

```ts
import { User } from "./user.types";
import { Chat } from "./chat.types";

export interface Reaction {
  emoji: string;
  userId: string;
}

/**
 * Represents a single chat message.
 */
export interface Message {
  _id: string;
  sender: User;
  content: string;
  chat: Chat;
  messageType: "text" | "image";
  reactions: Reaction[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Export `Reaction` from the frontend types barrel**

In `frontend/src/types/index.ts`, add the new type export alongside the existing ones:

```ts
export type { User } from "./user.types";
export type { Chat } from "./chat.types";
export type { Message, Reaction } from "./message.types";
```

- [ ] **Step 4: Typecheck both sides**

Run: `npx tsc -p backend --noEmit`
Expected: no errors (nothing references the new fields yet, so nothing can be inconsistent).

Run: `npx tsc --noEmit -p frontend` (from repo root) or `cd frontend && npx tsc --noEmit`
Expected: no errors — the new fields are additive and TS doesn't require existing consumers to read them; nothing constructs a raw `Message` object literal outside API responses.

- [ ] **Step 5: Commit**

```bash
git add backend/models/messageModel.ts frontend/src/types/message.types.ts frontend/src/types/index.ts
git commit -m "VIB-22: Add reactions, isDeleted, messageType to the message model"
```

---

## Task 3: Backend — `PUT /api/message/:id/react` + `pic`→`picture` bug fix

**Files:**
- Modify: `backend/controllers/messageControllers.ts`
- Modify: `backend/routes/messageRoutes.ts`
- Test: `backend/__tests__/messageReactions.test.ts`

**Interfaces:**
- Consumes: `IMessage`/`IReaction` from Task 2. `createUser`, `tokenFor`, `createChatWith`, `createMessage` from `backend/__tests__/helpers.ts` (Task 1).
- Produces: `reactToMessage` controller, exported for the route. Route `PUT /api/message/:id/react` (protected), body `{ emoji: string }`, returns the updated, sender-populated message as JSON.

- [ ] **Step 1: Write the failing tests**

Create `backend/__tests__/messageReactions.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx jest --config jest.config.cjs messageReactions`
Expected: FAIL — `PUT /api/message/:id/react` returns 404 (route doesn't exist yet).

- [ ] **Step 3: Implement the controller and fix the `pic` bug**

In `backend/controllers/messageControllers.ts`, fix all three `pic` references (the populated field is `picture` on `IUser`, not `pic` — see Global Constraints) and add `reactToMessage`. Replace the file in full:

```ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Chat from "../models/chatModel";
import User from "../models/userModel";
import Message from "../models/messageModel";

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
export const allMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name picture email")
      .populate("chat");
    res.json(messages);
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
export const sendMessage = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
  };

  try {
    let message: any = await Message.create(newMessage);

    message = await message.populate("sender", "name picture");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name picture email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(message);
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Toggle a reaction on a message
//@route           PUT /api/Message/:id/react
//@access          Protected
export const reactToMessage = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { emoji } = req.body;
  const { id } = req.params;

  if (!emoji) {
    return res.sendStatus(400);
  }

  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const message = await Message.findById(id);
  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  const userId = req.user._id.toString();
  const existingIndex = message.reactions.findIndex(
    (r) => r.emoji === emoji && r.userId.toString() === userId
  );

  if (existingIndex >= 0) {
    message.reactions.splice(existingIndex, 1);
  } else {
    message.reactions.push({ emoji, userId: req.user._id as unknown as mongoose.Types.ObjectId });
  }

  await message.save();

  const populated = await message.populate("sender", "name picture email");
  res.json(populated);
});
```

In `backend/routes/messageRoutes.ts`, add the react route:

```ts
import express from "express";
import { allMessages, sendMessage, reactToMessage } from "../controllers/messageControllers";
import { protect } from "../Middleware/authMiddleware";

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.route("/:id/react").put(protect, reactToMessage);

export default router;
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx jest --config jest.config.cjs messageReactions`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Full backend verification and commit**

Run: `npx jest --config jest.config.cjs` (full suite) — expect all green.
Run: `npx tsc -p backend --noEmit` — expect no errors.

```bash
git add backend/controllers/messageControllers.ts backend/routes/messageRoutes.ts backend/__tests__/messageReactions.test.ts
git commit -m "VIB-22: Add PUT /api/message/:id/react; fix pic->picture populate bug"
```

---

## Task 4: Reactions socket relay

**Files:**
- Modify: `backend/types/socket.types.ts`
- Modify: `backend/server.ts`
- Modify: `frontend/src/store/socketStore.ts`

**Interfaces:**
- Consumes: `Message` type from Task 2 (frontend). `emitReaction` is called by SingleChat in Task 5 after a successful react mutation.
- Produces: `ReactionUpdatePayload { message: SocketMessage; actorId: string }` type. `useSocketStore().emitReaction(message: Message): void` — Task 5 depends on this exact name and signature.

Reactions and deletion need to relay to everyone in the chat **except whoever just performed the action** — not `message.sender`, since the actor and the message's original sender are different people whenever anyone reacts to (or deletes) someone else's message. The existing `"new message"` handler's `newMessageRecieved.sender._id` exclusion only works there because the actor and sender happen to be the same person for a brand-new message. So the new events carry an explicit `actorId` field rather than reusing that shortcut.

- [ ] **Step 1: Add the reaction event types**

Replace `backend/types/socket.types.ts` in full:

```ts
import { IUser } from "../models/userModel";

/** Shape of a populated message as sent over the socket (matches frontend Message type) */
export interface SocketMessage {
  _id: string;
  sender: { _id: string; name: string; picture?: string; email?: string };
  content: string;
  chat: { _id: string; users: { _id: string }[] };
  messageType: "text" | "image";
  reactions: { emoji: string; userId: string }[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload for a reaction add/remove relay — actorId is who performed the action, not message.sender */
export interface ReactionUpdatePayload {
  message: SocketMessage;
  actorId: string;
}

/** Events the client sends to the server */
export interface ClientToServerEvents {
  setup: (userData: IUser) => void;
  "join chat": (room: string) => void;
  typing: (room: string) => void;
  "stop typing": (room: string) => void;
  "new message": (message: SocketMessage) => void;
  "message reaction": (payload: ReactionUpdatePayload) => void;
}

/** Events the server sends to the client */
export interface ServerToClientEvents {
  connected: () => void;
  typing: () => void;
  "stop typing": () => void;
  "message recieved": (message: SocketMessage) => void;
  "message reaction": (payload: ReactionUpdatePayload) => void;
}
```

- [ ] **Step 2: Relay the event in `server.ts`**

In `backend/server.ts`, inside `io.on("connection", ...)`, add the new handler right after the existing `"new message"` handler (before `socket.on("disconnect", ...)`):

```ts
    socket.on("message reaction", (payload) => {
      const chat = payload.message.chat;

      if (!chat.users) return console.log("chat.users not defined");

      chat.users.forEach((user) => {
        if (user._id === payload.actorId) return;

        socket.in(user._id).emit("message reaction", payload);
      });
    });
```

- [ ] **Step 3: Add the emit method and listener to `socketStore.ts`**

In `frontend/src/store/socketStore.ts`:

Add the import:
```ts
import { useAuthStore } from "./authStore";
```

Add to the `SocketState` interface, after `emitNewMessage`:
```ts
  emitReaction: (message: Message) => void;
```

Add to the store body, after the `socket.on("message recieved", ...)` block (still inside `connect`, before the typing-indicator listeners):
```ts
        // ── Reaction update ──────────────────────────────────────────────────
        socket.on("message reaction", ({ message }) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.messages.list(message.chat._id),
          });
        });
```

Add the action, after `emitNewMessage` in the returned object:
```ts
      emitReaction: (message: Message) => {
        const actorId = useAuthStore.getState().user?._id;
        if (!actorId) return;
        get().socket?.emit("message reaction", { message, actorId });
      },
```

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc -p backend --noEmit` — expect no errors.
Run: `cd frontend && npx tsc --noEmit` — expect no errors (`emitReaction` isn't called yet, so nothing depends on it failing to compile).
Run: `npx jest --config jest.config.cjs` — expect the existing suite still green (this task doesn't add backend tests; the relay only runs inside a live socket connection, which the REST-focused Supertest harness doesn't exercise).

```bash
git add backend/types/socket.types.ts backend/server.ts frontend/src/store/socketStore.ts
git commit -m "VIB-22: Relay reaction updates over socket"
```

---

## Task 5: Frontend — reactions UI

**Files:**
- Modify: `frontend/src/store/api/messageApi.ts`
- Modify: `frontend/src/components/SingleChat.tsx`
- Modify: `frontend/src/components/ScrollableChat.tsx`
- Modify: `frontend/package.json` (new dependency)

**Interfaces:**
- Consumes: `emitReaction` from `useSocketStore` (Task 4). `reactions: Reaction[]` field on `Message` (Task 2).
- Produces: `reactToMessage(params: { messageId: string; emoji: string }): Promise<Message>` in `messageApi.ts`. `ScrollableChat` gains a required `onReact: (messageId: string, emoji: string) => void` prop.

- [ ] **Step 1: Install `emoji-picker-react`**

```bash
cd frontend && npm install emoji-picker-react
```

- [ ] **Step 2: Add the API function**

In `frontend/src/store/api/messageApi.ts`, add:

```ts
export const reactToMessage = async (params: { messageId: string; emoji: string }): Promise<Message> => {
  const { data } = await apiClient.put<Message>(`/api/message/${params.messageId}/react`, {
    emoji: params.emoji,
  });
  return data;
};
```

- [ ] **Step 3: Add the mutation in `SingleChat.tsx`**

In `frontend/src/components/SingleChat.tsx`:

Update the import line to add `reactToMessage`:
```ts
import { fetchMessages, sendMessage, reactToMessage, queryKeys, queryClient } from "../store";
```

Update the socket store destructure to add `emitReaction`:
```ts
  const { joinRoom, emitTyping, emitStopTyping, emitNewMessage, emitReaction } = useSocketStore();
```

Add a new mutation after the `doSendMessage` mutation block:
```ts
  // ── React to message mutation ──────────────────────────────────────────────
  const { mutate: doReact } = useMutation({
    mutationFn: reactToMessage,
    onSuccess: (updatedMsg) => {
      queryClient.setQueryData<Message[]>(
        queryKeys.messages.list(selectedChat!._id),
        (old = []) => old.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
      emitReaction(updatedMsg);
    },
    onError: () =>
      toast({ title: "Failed to react", status: "error", duration: 4000, isClosable: true, position: "bottom" }),
  });
```

Pass the handler to `ScrollableChat` (inside the Messages Area block):
```tsx
            <ScrollableChat
              messages={messages}
              onReact={(messageId, emoji) => doReact({ messageId, emoji })}
            />
```

- [ ] **Step 4: Add the reaction UI in `ScrollableChat.tsx`**

Replace `frontend/src/components/ScrollableChat.tsx` in full:

```tsx
import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import { Box, IconButton, Popover, PopoverBody, PopoverContent, PopoverTrigger, Text } from "@chakra-ui/react";
import ScrollableFeed from "react-scrollable-feed";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { useAuthStore } from "../store/authStore";
import { Message, Reaction } from "../types";

interface ScrollableChatProps {
  messages: Message[];
  onReact: (messageId: string, emoji: string) => void;
}

const groupReactions = (reactions: Reaction[]): { emoji: string; userIds: string[] }[] => {
  const groups: Record<string, string[]> = {};
  reactions.forEach((r) => {
    groups[r.emoji] = groups[r.emoji] ? [...groups[r.emoji], r.userId] : [r.userId];
  });
  return Object.entries(groups).map(([emoji, userIds]) => ({ emoji, userIds }));
};

/**
 * ScrollableChat — Renders message bubbles.
 * Reads logged-in user from useAuthStore (Zustand) instead of useChatState.
 * No server state — messages are passed as props from SingleChat.
 */
const ScrollableChat: React.FC<ScrollableChatProps> = ({ messages, onReact }) => {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <ScrollableFeed>
      {messages.map((m, i) => {
        const isSent     = m.sender._id === user._id;
        const showAvatar = isSameSender(messages, m, i, user._id) || isLastMessage(messages, i, user._id);
        const sameUser   = isSameUser(messages, m, i);
        const margin     = isSameSenderMargin(messages, m, i, user._id);

        const time = new Date(m.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <Box
            key={m._id}
            display="flex"
            alignItems="flex-end"
            justifyContent={isSent ? "flex-end" : "flex-start"}
            mb={sameUser ? "2px" : "6px"}
            px={2}
          >
            {!isSent && (
              showAvatar ? (
                <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                  <Avatar
                    mt="4px" mr={2} size="xs"
                    cursor="pointer"
                    name={m.sender.name}
                    src={m.sender.picture}
                    flexShrink={0}
                  />
                </Tooltip>
              ) : (
                <Box w="24px" mr={2} flexShrink={0} />
              )
            )}

            <Box
              display="flex"
              flexDir="column"
              alignItems={isSent ? "flex-end" : "flex-start"}
              maxW="70%"
              ml={typeof margin === "number" ? `${margin}px` : margin}
              mt={sameUser ? "2px" : "8px"}
            >
              {!isSent && !sameUser && (
                <Text fontSize="10px" color="text-secondary" mb="2px" ml={1} fontWeight="semibold">
                  {m.sender.name.split(" ")[0]}
                </Text>
              )}

              <Box display="flex" alignItems="center" gap={1}>
                <Box
                  bg={isSent ? "accent" : "bg-elevated"}
                  color={isSent ? "white" : "text-primary"}
                  px={4} py={2}
                  borderRadius={
                    isSent ? "18px 18px 4px 18px" : "18px 18px 18px 4px"
                  }
                  fontSize="sm"
                  lineHeight="1.5"
                  wordBreak="break-word"
                  boxShadow={isSent
                    ? "0 1px 8px rgba(225,48,108,0.25)"
                    : "0 1px 4px rgba(0,0,0,0.12)"
                  }
                >
                  {m.content}
                </Box>

                <Popover placement="top" isLazy>
                  <PopoverTrigger>
                    <IconButton
                      aria-label="Add reaction"
                      icon={<Text fontSize="xs">🙂</Text>}
                      size="xs" variant="ghost" borderRadius="full"
                      minW="20px" h="20px" flexShrink={0}
                    />
                  </PopoverTrigger>
                  <PopoverContent w="auto" border="none" bg="transparent" boxShadow="none">
                    <PopoverBody p={0}>
                      <EmojiPicker
                        onEmojiClick={(data: EmojiClickData) => onReact(m._id, data.emoji)}
                        height={350}
                        width={300}
                      />
                    </PopoverBody>
                  </PopoverContent>
                </Popover>
              </Box>

              {m.reactions.length > 0 && (
                <Box display="flex" flexWrap="wrap" gap={1} mt="2px">
                  {groupReactions(m.reactions).map(({ emoji, userIds }) => (
                    <Box
                      key={emoji}
                      as="button"
                      onClick={() => onReact(m._id, emoji)}
                      display="flex" alignItems="center" gap="2px"
                      px={2} py="1px" borderRadius="full"
                      fontSize="xs"
                      bg={userIds.includes(user._id) ? "accent" : "bg-elevated"}
                      color={userIds.includes(user._id) ? "white" : "text-primary"}
                      border="1px solid" borderColor="border-subtle"
                    >
                      <span>{emoji}</span>
                      <span>{userIds.length}</span>
                    </Box>
                  ))}
                </Box>
              )}

              <Text fontSize="10px" color="text-disabled" mt="2px" mx={1}>
                {time}
              </Text>
            </Box>
          </Box>
        );
      })}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
```

- [ ] **Step 5: Typecheck, lint, and manually verify**

Run: `cd frontend && npx tsc --noEmit` — expect no errors.
Run: `npm run lint` (from `frontend/`) — expect no errors.

Manually verify: `npm start` in `frontend/` and `npm run server` from the repo root, log in as two different users in two browsers, open the same chat, react to a message with the emoji picker from one side, and confirm the reaction (with count and highlight) appears on both sides, and clicking your own reaction chip again removes it.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/store/api/messageApi.ts frontend/src/components/SingleChat.tsx frontend/src/components/ScrollableChat.tsx frontend/package.json frontend/package-lock.json
git commit -m "VIB-22: Add reactions UI with emoji-picker-react"
```

---

## Task 6: Backend — `DELETE /api/message/:id`

**Files:**
- Modify: `backend/controllers/messageControllers.ts`
- Modify: `backend/routes/messageRoutes.ts`
- Test: `backend/__tests__/messageDeletion.test.ts`

**Interfaces:**
- Consumes: `createUser`, `tokenFor`, `createChatWith`, `createMessage` from `backend/__tests__/helpers.ts` (Task 1).
- Produces: `deleteMessage` controller, exported for the route. Route `DELETE /api/message/:id` (protected), sender-only (403 otherwise), returns the updated message with `isDeleted: true`.

- [ ] **Step 1: Write the failing tests**

Create `backend/__tests__/messageDeletion.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx jest --config jest.config.cjs messageDeletion`
Expected: FAIL — `DELETE /api/message/:id` returns 404 (route doesn't exist yet).

- [ ] **Step 3: Implement the controller and route**

In `backend/controllers/messageControllers.ts`, add after `reactToMessage`:

```ts
//@description     Soft-delete a message (sender only)
//@route           DELETE /api/Message/:id
//@access          Protected
export const deleteMessage = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const message = await Message.findById(id);
  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to delete this message");
  }

  message.isDeleted = true;
  await message.save();

  const populated = await message.populate("sender", "name picture email");
  res.json(populated);
});
```

In `backend/routes/messageRoutes.ts`:

```ts
import express from "express";
import { allMessages, sendMessage, reactToMessage, deleteMessage } from "../controllers/messageControllers";
import { protect } from "../Middleware/authMiddleware";

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.route("/:id/react").put(protect, reactToMessage);
router.route("/:id").delete(protect, deleteMessage);

export default router;
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx jest --config jest.config.cjs messageDeletion`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Full backend verification and commit**

Run: `npx jest --config jest.config.cjs` (full suite) — expect all green.
Run: `npx tsc -p backend --noEmit` — expect no errors.

```bash
git add backend/controllers/messageControllers.ts backend/routes/messageRoutes.ts backend/__tests__/messageDeletion.test.ts
git commit -m "VIB-22: Add DELETE /api/message/:id (sender-only soft delete)"
```

---

## Task 7: Deletion socket relay

**Files:**
- Modify: `backend/types/socket.types.ts`
- Modify: `backend/server.ts`
- Modify: `frontend/src/store/socketStore.ts`

**Interfaces:**
- Consumes: `Message` type from Task 2 (frontend).
- Produces: `MessageDeletedPayload { messageId: string; chat: { _id: string; users: { _id: string }[] }; actorId: string }` type. `useSocketStore().emitMessageDeleted(message: Message): void` — Task 8 depends on this exact name and signature.

- [ ] **Step 1: Add the deletion event types**

In `backend/types/socket.types.ts`, add after `ReactionUpdatePayload`:

```ts
/** Payload for a deletion relay — actorId is who performed the action, not the message's original sender */
export interface MessageDeletedPayload {
  messageId: string;
  chat: { _id: string; users: { _id: string }[] };
  actorId: string;
}
```

Add to `ClientToServerEvents`, after `"message reaction"`:
```ts
  "message deleted": (payload: MessageDeletedPayload) => void;
```

Add to `ServerToClientEvents`, after `"message reaction"`:
```ts
  "message deleted": (payload: MessageDeletedPayload) => void;
```

- [ ] **Step 2: Relay the event in `server.ts`**

In `backend/server.ts`, add after the `"message reaction"` handler (still before `socket.on("disconnect", ...)`):

```ts
    socket.on("message deleted", (payload) => {
      const chat = payload.chat;

      if (!chat.users) return console.log("chat.users not defined");

      chat.users.forEach((user) => {
        if (user._id === payload.actorId) return;

        socket.in(user._id).emit("message deleted", payload);
      });
    });
```

- [ ] **Step 3: Add the emit method and listener to `socketStore.ts`**

In `frontend/src/store/socketStore.ts`:

Add to the `SocketState` interface, after `emitReaction`:
```ts
  emitMessageDeleted: (message: Message) => void;
```

Add to the store body, after the `socket.on("message reaction", ...)` listener:
```ts
        // ── Message deleted ──────────────────────────────────────────────────
        socket.on("message deleted", ({ chat }) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.messages.list(chat._id),
          });
        });
```

Add the action, after `emitReaction` in the returned object:
```ts
      emitMessageDeleted: (message: Message) => {
        const actorId = useAuthStore.getState().user?._id;
        if (!actorId) return;
        get().socket?.emit("message deleted", {
          messageId: message._id,
          chat: { _id: message.chat._id, users: message.chat.users.map((u) => ({ _id: u._id })) },
          actorId,
        });
      },
```

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc -p backend --noEmit` — expect no errors.
Run: `cd frontend && npx tsc --noEmit` — expect no errors.
Run: `npx jest --config jest.config.cjs` — expect the existing suite still green.

```bash
git add backend/types/socket.types.ts backend/server.ts frontend/src/store/socketStore.ts
git commit -m "VIB-22: Relay message deletion over socket"
```

---

## Task 8: Frontend — deletion UI

**Files:**
- Modify: `frontend/src/store/api/messageApi.ts`
- Modify: `frontend/src/components/SingleChat.tsx`
- Modify: `frontend/src/components/ScrollableChat.tsx`

**Interfaces:**
- Consumes: `emitMessageDeleted` from `useSocketStore` (Task 7). `isDeleted` field on `Message` (Task 2).
- Produces: `deleteMessage(messageId: string): Promise<Message>` in `messageApi.ts`. `ScrollableChat` gains a required `onDelete: (messageId: string) => void` prop.

- [ ] **Step 1: Add the API function**

In `frontend/src/store/api/messageApi.ts`, add:

```ts
export const deleteMessage = async (messageId: string): Promise<Message> => {
  const { data } = await apiClient.delete<Message>(`/api/message/${messageId}`);
  return data;
};
```

- [ ] **Step 2: Add the mutation in `SingleChat.tsx`**

Update the import line:
```ts
import { fetchMessages, sendMessage, reactToMessage, deleteMessage, queryKeys, queryClient } from "../store";
```

Update the socket store destructure:
```ts
  const { joinRoom, emitTyping, emitStopTyping, emitNewMessage, emitReaction, emitMessageDeleted } = useSocketStore();
```

Add a new mutation after the `doReact` mutation block:
```ts
  // ── Delete message mutation ──────────────────────────────────────────────────
  const { mutate: doDeleteMessage } = useMutation({
    mutationFn: deleteMessage,
    onSuccess: (updatedMsg) => {
      queryClient.setQueryData<Message[]>(
        queryKeys.messages.list(selectedChat!._id),
        (old = []) => old.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
      emitMessageDeleted(updatedMsg);
    },
    onError: () =>
      toast({ title: "Failed to delete message", status: "error", duration: 4000, isClosable: true, position: "bottom" }),
  });
```

Update the `ScrollableChat` usage to pass `onDelete`:
```tsx
            <ScrollableChat
              messages={messages}
              onReact={(messageId, emoji) => doReact({ messageId, emoji })}
              onDelete={(messageId) => doDeleteMessage(messageId)}
            />
```

- [ ] **Step 3: Add the delete menu and deleted-placeholder rendering in `ScrollableChat.tsx`**

Replace `frontend/src/components/ScrollableChat.tsx` in full:

```tsx
import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import {
  Box, IconButton, Popover, PopoverBody, PopoverContent, PopoverTrigger, Text,
  Menu, MenuButton, MenuList, MenuItem,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import ScrollableFeed from "react-scrollable-feed";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { useAuthStore } from "../store/authStore";
import { Message, Reaction } from "../types";

interface ScrollableChatProps {
  messages: Message[];
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
}

const groupReactions = (reactions: Reaction[]): { emoji: string; userIds: string[] }[] => {
  const groups: Record<string, string[]> = {};
  reactions.forEach((r) => {
    groups[r.emoji] = groups[r.emoji] ? [...groups[r.emoji], r.userId] : [r.userId];
  });
  return Object.entries(groups).map(([emoji, userIds]) => ({ emoji, userIds }));
};

/**
 * ScrollableChat — Renders message bubbles.
 * Reads logged-in user from useAuthStore (Zustand) instead of useChatState.
 * No server state — messages are passed as props from SingleChat.
 */
const ScrollableChat: React.FC<ScrollableChatProps> = ({ messages, onReact, onDelete }) => {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <ScrollableFeed>
      {messages.map((m, i) => {
        const isSent     = m.sender._id === user._id;
        const showAvatar = isSameSender(messages, m, i, user._id) || isLastMessage(messages, i, user._id);
        const sameUser   = isSameUser(messages, m, i);
        const margin     = isSameSenderMargin(messages, m, i, user._id);

        const time = new Date(m.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <Box
            key={m._id}
            display="flex"
            alignItems="flex-end"
            justifyContent={isSent ? "flex-end" : "flex-start"}
            mb={sameUser ? "2px" : "6px"}
            px={2}
          >
            {!isSent && (
              showAvatar ? (
                <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                  <Avatar
                    mt="4px" mr={2} size="xs"
                    cursor="pointer"
                    name={m.sender.name}
                    src={m.sender.picture}
                    flexShrink={0}
                  />
                </Tooltip>
              ) : (
                <Box w="24px" mr={2} flexShrink={0} />
              )
            )}

            <Box
              display="flex"
              flexDir="column"
              alignItems={isSent ? "flex-end" : "flex-start"}
              maxW="70%"
              ml={typeof margin === "number" ? `${margin}px` : margin}
              mt={sameUser ? "2px" : "8px"}
            >
              {!isSent && !sameUser && (
                <Text fontSize="10px" color="text-secondary" mb="2px" ml={1} fontWeight="semibold">
                  {m.sender.name.split(" ")[0]}
                </Text>
              )}

              <Box display="flex" alignItems="center" gap={1}>
                {m.isDeleted ? (
                  <Box
                    bg="bg-elevated" color="text-disabled" fontStyle="italic"
                    px={4} py={2} borderRadius="18px" fontSize="sm"
                  >
                    This message was deleted
                  </Box>
                ) : (
                  <Box
                    bg={isSent ? "accent" : "bg-elevated"}
                    color={isSent ? "white" : "text-primary"}
                    px={4} py={2}
                    borderRadius={
                      isSent ? "18px 18px 4px 18px" : "18px 18px 18px 4px"
                    }
                    fontSize="sm"
                    lineHeight="1.5"
                    wordBreak="break-word"
                    boxShadow={isSent
                      ? "0 1px 8px rgba(225,48,108,0.25)"
                      : "0 1px 4px rgba(0,0,0,0.12)"
                    }
                  >
                    {m.content}
                  </Box>
                )}

                {!m.isDeleted && (
                  <Popover placement="top" isLazy>
                    <PopoverTrigger>
                      <IconButton
                        aria-label="Add reaction"
                        icon={<Text fontSize="xs">🙂</Text>}
                        size="xs" variant="ghost" borderRadius="full"
                        minW="20px" h="20px" flexShrink={0}
                      />
                    </PopoverTrigger>
                    <PopoverContent w="auto" border="none" bg="transparent" boxShadow="none">
                      <PopoverBody p={0}>
                        <EmojiPicker
                          onEmojiClick={(data: EmojiClickData) => onReact(m._id, data.emoji)}
                          height={350}
                          width={300}
                        />
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                )}

                {isSent && !m.isDeleted && (
                  <Menu placement="top-end">
                    <MenuButton
                      as={IconButton}
                      aria-label="Message options"
                      icon={<ChevronDownIcon />}
                      size="xs" variant="ghost" minW="20px" h="20px" flexShrink={0}
                    />
                    <MenuList minW="120px">
                      <MenuItem onClick={() => onDelete(m._id)} color="red.400">
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                )}
              </Box>

              {!m.isDeleted && m.reactions.length > 0 && (
                <Box display="flex" flexWrap="wrap" gap={1} mt="2px">
                  {groupReactions(m.reactions).map(({ emoji, userIds }) => (
                    <Box
                      key={emoji}
                      as="button"
                      onClick={() => onReact(m._id, emoji)}
                      display="flex" alignItems="center" gap="2px"
                      px={2} py="1px" borderRadius="full"
                      fontSize="xs"
                      bg={userIds.includes(user._id) ? "accent" : "bg-elevated"}
                      color={userIds.includes(user._id) ? "white" : "text-primary"}
                      border="1px solid" borderColor="border-subtle"
                    >
                      <span>{emoji}</span>
                      <span>{userIds.length}</span>
                    </Box>
                  ))}
                </Box>
              )}

              <Text fontSize="10px" color="text-disabled" mt="2px" mx={1}>
                {time}
              </Text>
            </Box>
          </Box>
        );
      })}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
```

- [ ] **Step 4: Typecheck, lint, and manually verify**

Run: `cd frontend && npx tsc --noEmit` — expect no errors.
Run: `npm run lint` (from `frontend/`) — expect no errors.

Manually verify: with the dev server running, send a message, delete it from the sender's side, and confirm it shows "This message was deleted" (with no reaction row or add-reaction button) on both the sender's and the recipient's screens. Confirm the delete option does not appear on messages sent by the other user.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/store/api/messageApi.ts frontend/src/components/SingleChat.tsx frontend/src/components/ScrollableChat.tsx
git commit -m "VIB-22: Add message deletion UI"
```

---

## Task 9: Frontend — image upload wiring

**Files:**
- Modify: `backend/controllers/messageControllers.ts`
- Modify: `frontend/src/store/api/messageApi.ts`
- Modify: `frontend/src/components/SingleChat.tsx`

**Interfaces:**
- Produces: `SendMessagePayload` gains optional `messageType?: "text" | "image"`. `sendMessage` controller stores it (defaulting to `"text"`).

`sendMessage` needs a small backend change here too — it's the one write path both text and image messages share, so this is the natural place for it rather than a new endpoint (see Global Constraints: no new backend upload endpoint).

- [ ] **Step 1: Accept `messageType` in the backend `sendMessage` controller**

In `backend/controllers/messageControllers.ts`, update `sendMessage`:

```ts
export const sendMessage = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { content, chatId, messageType } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
    messageType: messageType === "image" ? "image" : "text",
  };
```

(Rest of the function is unchanged.)

- [ ] **Step 2: Add `messageType` to the frontend payload type**

In `frontend/src/store/api/messageApi.ts`:

```ts
export interface SendMessagePayload { content: string; chatId: string; messageType?: "text" | "image" }
```

- [ ] **Step 3: Wire the attachment button in `SingleChat.tsx`**

Update the React import to add `useRef`:
```ts
import { useState, useEffect, useRef } from "react";
```

Add state and a file input ref, alongside the existing `useState` declarations:
```ts
  const [imageUploading, setImageUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
```

Add the upload handler, after `typingHandler`:
```ts
  const handleImageUpload = (file: File | undefined): void => {
    if (!file || !selectedChat) return;
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      toast({ title: "Unsupported image type", status: "warning", duration: 3000, isClosable: true, position: "bottom" });
      return;
    }
    setImageUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "VibeChat");
    formData.append("cloud_name", "difmt49ax");
    fetch("https://api.cloudinary.com/v1_1/difmt49ax/image/upload", { method: "post", body: formData })
      .then((r) => r.json())
      .then((data) => {
        doSendMessage({ content: data.url, chatId: selectedChat._id, messageType: "image" });
      })
      .catch(() =>
        toast({ title: "Image upload failed", status: "error", duration: 4000, isClosable: true, position: "bottom" })
      )
      .finally(() => setImageUploading(false));
  };
```

Replace the message input's attachment button block:
```tsx
            <InputRightElement>
              <IconButton
                aria-label="Attach file" icon={<AttachmentIcon />}
                size="sm" variant="ghost" color="text-secondary"
                borderRadius="full" _hover={{ color: "accent" }}
                isLoading={imageUploading}
                onClick={() => fileInputRef.current?.click()}
              />
            </InputRightElement>
```

Add the hidden file input immediately after the closing `</InputGroup>` tag, still inside the `<FormControl>`:
```tsx
          <input
            ref={fileInputRef} type="file" accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleImageUpload(e.target.files?.[0])}
          />
```

- [ ] **Step 4: Typecheck, lint, and verify**

Run: `npx tsc -p backend --noEmit` — expect no errors.
Run: `cd frontend && npx tsc --noEmit` — expect no errors.
Run: `npm run lint` (from `frontend/`) — expect no errors.
Run: `npx jest --config jest.config.cjs` (from root) — expect the existing suite still green (no new backend tests here — see Global Constraints).

Manually verify: click the attachment icon, pick an image, and confirm it sends as a message (it will render as plain text — a raw Cloudinary URL — until Task 10 adds image rendering; that's expected at this point).

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/messageControllers.ts frontend/src/store/api/messageApi.ts frontend/src/components/SingleChat.tsx
git commit -m "VIB-22: Wire attachment button to Cloudinary image upload"
```

---

## Task 10: Frontend — image message display + lightbox

**Files:**
- Modify: `frontend/src/components/ScrollableChat.tsx`

**Interfaces:**
- Consumes: `messageType` field on `Message` (Task 2), image URL sent via Task 9.

- [ ] **Step 1: Add image rendering and a shared lightbox modal**

Replace `frontend/src/components/ScrollableChat.tsx` in full:

```tsx
import { useState } from "react";
import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import {
  Box, IconButton, Popover, PopoverBody, PopoverContent, PopoverTrigger, Text,
  Menu, MenuButton, MenuList, MenuItem,
  Image, Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalBody,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import ScrollableFeed from "react-scrollable-feed";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { useAuthStore } from "../store/authStore";
import { Message, Reaction } from "../types";

interface ScrollableChatProps {
  messages: Message[];
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
}

const groupReactions = (reactions: Reaction[]): { emoji: string; userIds: string[] }[] => {
  const groups: Record<string, string[]> = {};
  reactions.forEach((r) => {
    groups[r.emoji] = groups[r.emoji] ? [...groups[r.emoji], r.userId] : [r.userId];
  });
  return Object.entries(groups).map(([emoji, userIds]) => ({ emoji, userIds }));
};

/**
 * ScrollableChat — Renders message bubbles.
 * Reads logged-in user from useAuthStore (Zustand) instead of useChatState.
 * No server state — messages are passed as props from SingleChat.
 */
const ScrollableChat: React.FC<ScrollableChatProps> = ({ messages, onReact, onDelete }) => {
  const { user } = useAuthStore();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!user) return null;

  return (
    <>
      <ScrollableFeed>
        {messages.map((m, i) => {
          const isSent     = m.sender._id === user._id;
          const showAvatar = isSameSender(messages, m, i, user._id) || isLastMessage(messages, i, user._id);
          const sameUser   = isSameUser(messages, m, i);
          const margin     = isSameSenderMargin(messages, m, i, user._id);

          const time = new Date(m.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <Box
              key={m._id}
              display="flex"
              alignItems="flex-end"
              justifyContent={isSent ? "flex-end" : "flex-start"}
              mb={sameUser ? "2px" : "6px"}
              px={2}
            >
              {!isSent && (
                showAvatar ? (
                  <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                    <Avatar
                      mt="4px" mr={2} size="xs"
                      cursor="pointer"
                      name={m.sender.name}
                      src={m.sender.picture}
                      flexShrink={0}
                    />
                  </Tooltip>
                ) : (
                  <Box w="24px" mr={2} flexShrink={0} />
                )
              )}

              <Box
                display="flex"
                flexDir="column"
                alignItems={isSent ? "flex-end" : "flex-start"}
                maxW="70%"
                ml={typeof margin === "number" ? `${margin}px` : margin}
                mt={sameUser ? "2px" : "8px"}
              >
                {!isSent && !sameUser && (
                  <Text fontSize="10px" color="text-secondary" mb="2px" ml={1} fontWeight="semibold">
                    {m.sender.name.split(" ")[0]}
                  </Text>
                )}

                <Box display="flex" alignItems="center" gap={1}>
                  {m.isDeleted ? (
                    <Box
                      bg="bg-elevated" color="text-disabled" fontStyle="italic"
                      px={4} py={2} borderRadius="18px" fontSize="sm"
                    >
                      This message was deleted
                    </Box>
                  ) : m.messageType === "image" ? (
                    <Image
                      src={m.content} alt="Shared image"
                      borderRadius="12px" maxW="220px" maxH="220px"
                      objectFit="cover" cursor="pointer"
                      onClick={() => setLightboxUrl(m.content)}
                    />
                  ) : (
                    <Box
                      bg={isSent ? "accent" : "bg-elevated"}
                      color={isSent ? "white" : "text-primary"}
                      px={4} py={2}
                      borderRadius={
                        isSent ? "18px 18px 4px 18px" : "18px 18px 18px 4px"
                      }
                      fontSize="sm"
                      lineHeight="1.5"
                      wordBreak="break-word"
                      boxShadow={isSent
                        ? "0 1px 8px rgba(225,48,108,0.25)"
                        : "0 1px 4px rgba(0,0,0,0.12)"
                      }
                    >
                      {m.content}
                    </Box>
                  )}

                  {!m.isDeleted && (
                    <Popover placement="top" isLazy>
                      <PopoverTrigger>
                        <IconButton
                          aria-label="Add reaction"
                          icon={<Text fontSize="xs">🙂</Text>}
                          size="xs" variant="ghost" borderRadius="full"
                          minW="20px" h="20px" flexShrink={0}
                        />
                      </PopoverTrigger>
                      <PopoverContent w="auto" border="none" bg="transparent" boxShadow="none">
                        <PopoverBody p={0}>
                          <EmojiPicker
                            onEmojiClick={(data: EmojiClickData) => onReact(m._id, data.emoji)}
                            height={350}
                            width={300}
                          />
                        </PopoverBody>
                      </PopoverContent>
                    </Popover>
                  )}

                  {isSent && !m.isDeleted && (
                    <Menu placement="top-end">
                      <MenuButton
                        as={IconButton}
                        aria-label="Message options"
                        icon={<ChevronDownIcon />}
                        size="xs" variant="ghost" minW="20px" h="20px" flexShrink={0}
                      />
                      <MenuList minW="120px">
                        <MenuItem onClick={() => onDelete(m._id)} color="red.400">
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  )}
                </Box>

                {!m.isDeleted && m.reactions.length > 0 && (
                  <Box display="flex" flexWrap="wrap" gap={1} mt="2px">
                    {groupReactions(m.reactions).map(({ emoji, userIds }) => (
                      <Box
                        key={emoji}
                        as="button"
                        onClick={() => onReact(m._id, emoji)}
                        display="flex" alignItems="center" gap="2px"
                        px={2} py="1px" borderRadius="full"
                        fontSize="xs"
                        bg={userIds.includes(user._id) ? "accent" : "bg-elevated"}
                        color={userIds.includes(user._id) ? "white" : "text-primary"}
                        border="1px solid" borderColor="border-subtle"
                      >
                        <span>{emoji}</span>
                        <span>{userIds.length}</span>
                      </Box>
                    ))}
                  </Box>
                )}

                <Text fontSize="10px" color="text-disabled" mt="2px" mx={1}>
                  {time}
                </Text>
              </Box>
            </Box>
          );
        })}
      </ScrollableFeed>

      <Modal isOpen={!!lightboxUrl} onClose={() => setLightboxUrl(null)} isCentered size="xl">
        <ModalOverlay backdropFilter="blur(6px)" />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalCloseButton color="white" />
          <ModalBody p={0} display="flex" justifyContent="center">
            <Image src={lightboxUrl ?? ""} alt="Full size" maxH="80vh" borderRadius="8px" />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ScrollableChat;
```

- [ ] **Step 2: Typecheck, lint, and manually verify**

Run: `cd frontend && npx tsc --noEmit` — expect no errors.
Run: `npm run lint` (from `frontend/`) — expect no errors.

Manually verify: send an image via the attachment button, confirm it renders as a thumbnail (not a raw URL) in the chat on both sides, click it, and confirm the full-size image opens in a modal that closes on the close button or backdrop click.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ScrollableChat.tsx
git commit -m "VIB-22: Render image messages with a lightbox modal"
```

---

## Final Verification

After Task 10:

- [ ] Run the full backend suite: `npx jest --config jest.config.cjs` (from root) — all tests green.
- [ ] Run `npx tsc -p backend --noEmit` — no errors.
- [ ] Run `cd frontend && npx tsc --noEmit` — no errors.
- [ ] Run `npm run lint` (from `frontend/`) — no errors.
- [ ] Manual end-to-end pass with two logged-in users in two browsers: send text messages, react and un-react, delete a message, send and view an image — confirm every action shows up live on the other side without a page refresh.
- [ ] Push the branch and open a PR against `main` with a description covering all three features and the two inline bug fixes (mirroring the VIB-21 PR pattern).
