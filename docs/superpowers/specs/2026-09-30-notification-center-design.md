# VIB-23: Notification Center — Design

Persistent in-app notifications that survive a page refresh, replacing the
in-memory `notifications: Message[]` array in `chatStore.ts`. Ticket:
[VIB-23](https://vibecode.atlassian.net/browse/VIB-23). Branch:
`VIB-23-notification-center`.

## Context

The ticket names Redux artifacts (`vibechatApi.ts`, `notificationSlice.ts`,
`useGetNotificationsQuery`). This repo has no Redux — VIB-18..21 landed as
Zustand + TanStack Query. The mapping used here:

| Ticket says | Built as |
|---|---|
| `notificationsApi` endpoints in `vibechatApi.ts` | `frontend/src/store/api/notificationApi.ts` (plain fetch functions, same as `chatApi.ts` / `messageApi.ts`) |
| `useGetNotificationsQuery` | `useNotificationsQuery()` in `frontend/src/hooks/useNotifications.ts` (TanStack `useQuery`) |
| `notificationSlice.ts` — persist count, mark read, clear | Notifications are server state: TanStack Query cache owns them. The Zustand `notifications` array and its actions are **removed** from `chatStore.ts`. Count = length of the query data. |

## Backend

### Data model

New `backend/models/notificationModel.ts`:

```
INotification { recipient, sender, chat, message, type: "message", isRead, createdAt, updatedAt }
```

Index `{ recipient: 1, isRead: 1, createdAt: -1 }` — every read path filters
by recipient + unread.

`IUser` gains `muteNotifications: boolean` (default `false`).

### When notifications are created

"Save notifications to DB when a message is sent to a non-active chat": the
server does not know which chat a recipient has open (the socket server
tracks rooms, not focus). So `sendMessage` creates one unread notification
for **every chat member except the sender and muted users**, and the client
marks a chat's notifications read when it is the open chat:

- on receiving `"message recieved"` for the open chat → `PUT /api/notifications/chat/:chatId/read`
- when a chat is opened and the cache holds unread notifications for it → same call

Notification creation failure must never fail the message send — it is
logged and swallowed.

### Endpoints (all `protect`ed, mounted at `/api/notifications`)

| Method & path | Behavior |
|---|---|
| `GET /` | Caller's **unread** notifications, newest first, max 50; `sender` (name picture email), `chat` (+ `users` name picture email), `message` (content messageType isDeleted) populated. Entries whose chat or sender no longer resolve are dropped. |
| `PUT /:id/read` | Mark one read. 400 invalid id, 404 unknown, 403 if caller isn't the recipient. Returns the notification. |
| `PUT /read-all` | Mark all of caller's unread read. Returns `{ modifiedCount }`. |
| `PUT /chat/:chatId/read` | Mark caller's unread for one chat read. 400 invalid id. Returns `{ modifiedCount }`. *(Not in the ticket — required so opening a chat clears its badge.)* |
| `GET /preferences` | `{ muteNotifications }` |
| `PUT /preferences` | Body `{ muteNotifications: boolean }`; 400 if not a boolean. Returns `{ muteNotifications }`. |

## Frontend

- `AppNotification` type (named to avoid shadowing the DOM `Notification` global).
- `queryKeys.notifications.list()` / `.preferences()`.
- Socket `"message recieved"`: open chat → mark chat read, then invalidate
  notifications; background chat → invalidate notifications (refetch picks up
  the persisted row). No more `addNotification`.
- `SideDrawer` bell: count from the query (shows `9+` above 9); clicking an
  item selects its chat and marks that notification read; "Mark all as read"
  item when the list is non-empty.
- `SingleChat`: whenever the open chat has unread notifications in the cache,
  mark that chat read.
- `ProfileModal` (own profile only): "Mute message notifications" switch
  backed by the preferences endpoints. Muting is global (all chats) and
  stops new notifications from being created; existing unread ones stay.
- Logout clears the TanStack cache so the next user on the same tab never
  sees the previous user's notifications.

## Testing

Backend: Jest + Supertest + mongodb-memory-server (harness from VIB-22) for
notification creation on send, every endpoint above, and preferences.
Frontend: no component test harness exists; verified with `tsc --noEmit`,
`eslint --max-warnings 0`, and a production build.

## Out of scope

Per-chat muting, push/email notifications, notification types other than
`"message"`, pagination beyond the 50 newest unread.
