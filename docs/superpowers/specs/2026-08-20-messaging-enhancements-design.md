# VIB-22: Messaging Enhancements — Design

Reactions, message deletion, and image sharing, built on the existing
message model. Ticket: [VIB-22](https://vibecode.atlassian.net/browse/VIB-22).
Branch: `VIB-22-messaging-enhancements`.

## Context

The ticket lists three features. They touch overlapping files (message
model, message controllers/routes, socket relay, `socketStore.ts`,
`ScrollableChat.tsx`) but are functionally independent, so they are
built and landed in sequence rather than as one large change:

1. Reactions
2. Deletion
3. Image sharing

The ticket also names two dependencies (VIB-20, VIB-21) for "Redux +
socket middleware" — this repo has no Redux (see VIB-21 design note);
the equivalent Zustand + TanStack Query stores from VIB-18/19/20 are
what's actually being extended here.

While reading the code for this ticket, two pre-existing bugs were
found in files this work touches, and are fixed inline rather than
filed separately since they sit directly in the diff:

- `backend/server.ts`: the socket handler calls
  `socket.off("setup", ...)` where a `socket.on("disconnect", ...)`
  was clearly intended — disconnect is never actually handled.
- `backend/controllers/messageControllers.ts`: `.populate("sender",
  "name pic email")` references a field `pic` that doesn't exist on
  `IUser` (the actual field is `picture`) — sender avatars on
  populated messages are silently broken today.

## Data model

`backend/models/messageModel.ts` — `IMessage` gains:

```ts
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
```

- `messageType` defaults to `"text"`. Image messages store the
  Cloudinary URL in the existing `content` field — no new field, since
  `content` is already "the text of the message" and a URL fits that
  role without forking rendering logic across two fields.
- `reactions` is a subdocument array. A user may hold multiple
  distinct-emoji reactions on one message, but at most one of each
  emoji — reacting again with the same emoji removes it (toggle).
- `isDeleted` defaults to `false`. On delete, only this flag flips;
  `content` is left in place in the DB. Nothing reads `content` for a
  message once `isDeleted` is true (frontend renders a placeholder
  instead), so scrubbing it server-side would add complexity with no
  observable benefit at this scope.

`frontend/src/types/message.types.ts` mirrors these three additions on
the `Message` interface.

## Backend API

Two new protected routes, mounted alongside the existing
`GET /api/message/:chatId` and `POST /api/message` in
`messageRoutes.ts` / `messageControllers.ts`:

- `PUT /api/message/:id/react` — body `{ emoji: string }`. Toggles the
  requesting user's reaction with that emoji on the message. Returns
  the updated, populated message.
- `DELETE /api/message/:id` — sender-only. Returns 403 if
  `req.user._id !== message.sender`. Sets `isDeleted: true`, returns
  the updated message.

Both use the existing `protect` middleware, matching the current two
routes.

## Socket relay

The existing pattern (seen in `"new message"`) is: the frontend makes
a REST call, and on success emits a socket event carrying the updated
message; the server relays that event to the other members of the
chat's rooms (excluding the sender's own room, since the sender's
local cache is already updated from the REST response). There is no
`io` reference inside the controllers today — sockets and REST are
kept decoupled — so reactions and deletion follow the same shape
rather than introducing controller→socket coupling.

New event pair, added to `backend/types/socket.types.ts`
(`ClientToServerEvents` / `ServerToClientEvents`) and handled in
`backend/server.ts`'s connection handler the same way `"new message"`
is handled today:

- `"message reaction"` — client emits the updated message after a
  successful react call; server relays to the other chat members.
- `"message deleted"` — client emits `{ messageId, chat }` after a
  successful delete call; server relays to the other chat members.

`frontend/src/store/socketStore.ts` gains `emitReaction(message)` /
`emitMessageDeleted(message)` emit methods and matching
`socket.on("message reaction" | "message deleted", ...)` listeners
that invalidate `queryKeys.messages.list(chatId)`, consistent with how
`"message recieved"` is handled today (no diff-patching — the existing
codebase invalidates and refetches rather than hand-patching the
cache, and there's no reason to diverge for these smaller events).

## Frontend API layer

`frontend/src/store/api/messageApi.ts` gains:

```ts
reactToMessage(messageId: string, emoji: string): Promise<Message>
deleteMessage(messageId: string): Promise<Message>
```

Both call the new REST endpoints via the existing `apiClient`, mirroring
`sendMessage`'s shape.

## Frontend UI — `ScrollableChat.tsx`

- **Reactions**: a row under each bubble, reactions grouped by emoji
  with a count; the current user's own reaction (if any) is visually
  distinguished. A hover/click affordance opens an `emoji-picker-react`
  popover (new dependency, named explicitly in the ticket) to add a
  reaction. Clicking an existing emoji group toggles the current
  user's reaction on that emoji directly (no picker needed for
  removal).
- **Deletion**: a small menu on the sender's own messages only (not
  shown on other users' bubbles) with a "Delete" action, calling
  `deleteMessage`. Once `message.isDeleted` is true, the bubble
  renders "This message was deleted" in place of content/reactions.
- **Image messages**: when `message.messageType === "image"`, the
  bubble renders the image as a thumbnail (Chakra `Image`) instead of
  text. Clicking it opens a Chakra `Modal` showing the full-size image.
  No new lightbox library — the ticket doesn't require gestures/zoom,
  and Chakra's `Modal` (already a core dependency of this app) covers
  "click thumbnail → view full size" without adding another package.
- **Image upload**: `SingleChat.tsx` already renders an `AttachmentIcon`
  `IconButton` in the message input, currently `isDisabled`. This is
  wired up instead of adding a new button: clicking it opens a file
  picker, the file uploads client-side directly to Cloudinary (same
  unsigned-preset pattern already used in `Signup.tsx` and
  `ProfileModal.tsx` for profile pictures — no backend upload endpoint,
  consistent with existing code, no new backend dependencies), and the
  resulting URL is sent as a `messageType: "image"` message via the
  existing `sendMessage` mutation path.

## Testing

The backend has no test framework or existing tests today. Jest +
ts-jest + Supertest + `mongodb-memory-server` are added (first backend
tests in this repo) to cover the two new endpoints:

- React: adding a reaction, toggling the same emoji off, a second
  user's reaction not clobbering the first.
- Delete: sender can delete; a non-sender request is rejected (403);
  deleted message is excluded from active content on refetch.

Scope is limited to these two endpoints — image sharing has no backend
endpoint to test (client-direct-to-Cloudinary), and adding
broader backend test coverage beyond what this ticket touches is a
separate decision outside VIB-22.

## Rollout

Implemented and committed in three stages on
`VIB-22-messaging-enhancements`, each independently buildable/testable
before moving to the next:

1. Reactions (model + route + socket + UI), including the two inline
   bug fixes — both sit in files (`server.ts`, `messageControllers.ts`)
   this stage already touches
2. Deletion (route + socket + UI)
3. Image sharing (upload wiring + UI)
