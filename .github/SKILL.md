# VibeChat — Claude Development Skill

## Project Overview
VibeChat is a full-stack real-time chat application (MERN + Socket.IO + TypeScript).
Instagram-inspired UI with dark/light theme. Roadmap targets a full social feed platform.

---

## Tech Stack

### Frontend
- **React 18 + TypeScript** (strict mode)
- **TanStack Query v5** — all server/API state (fetching, caching, mutations)
- **Zustand v4** — all client/UI state (selected chat, auth, socket)
- **Chakra UI v2** — custom theme with semantic color tokens
- **Socket.IO Client** — real-time messaging via Zustand socketStore
- **React Router v6** — client-side routing
- **Axios** — HTTP via shared `apiClient` (never imported directly in components)

### Backend (TypeScript)
- **Node.js + Express + TypeScript** — compiled to `dist/` via `tsc`
- **MongoDB + Mongoose** — typed models (`IUser`, `IChat`, `IMessage`)
- **Socket.IO** — typed with `ClientToServerEvents` / `ServerToClientEvents`
- **JWT + bcryptjs** — authentication
- **Cloudinary** — image uploads

### Infrastructure
- **Vercel** — frontend (auto-deploys on merge to `main`)
- **Render** — backend (`npm run build && npm start`)
- **Jira** — project management (vibecode.atlassian.net)

---

## State Management Architecture — CRITICAL

### Rule: Two types of state, two tools. Never mix them.

| State Type | Tool | Examples |
|---|---|---|
| **Server state** (data from API) | TanStack Query | chat list, messages, user search results |
| **Client/UI state** (no API) | Zustand | selected chat, socket connection, typing, auth user |

### ❌ What we removed
- `ChatProvider` React Context — **deleted**
- Direct `axios` calls in components — **banned**
- `socketRef` inside `SingleChat` — **deleted**

---

## Store Structure

```
frontend/src/store/
├── index.ts                  # Barrel export — import everything from here
├── queryClient.ts            # Shared QueryClient (staleTime 30s, gcTime 5min)
├── authStore.ts              # Zustand — user, isAuthLoading, setUser, logout
├── chatStore.ts              # Zustand — selectedChat, notifications, typingChats
├── socketStore.ts            # Zustand — Socket.IO lifecycle (connect once per session)
├── keys/
│   └── queryKeys.ts          # Centralised TanStack Query key factory
└── api/
    ├── apiClient.ts          # Shared axios instance with JWT interceptor
    ├── userApi.ts            # loginUser, registerUser, searchUsers, updateUserProfile
    ├── chatApi.ts            # fetchChats, accessOrCreateChat, createGroupChat ...
    └── messageApi.ts         # fetchMessages, sendMessage
```

---

## TanStack Query — Rules

### Always use queryKeys factory
```tsx
// ✅ CORRECT
useQuery({ queryKey: queryKeys.chats.all(), queryFn: fetchChats })
useQuery({ queryKey: queryKeys.messages.list(chatId), queryFn: () => fetchMessages(chatId) })

// ❌ WRONG — magic strings break invalidation
useQuery({ queryKey: ["chats"], queryFn: fetchChats })
```

### Cache invalidation after mutations
```tsx
const { mutate } = useMutation({
  mutationFn: sendMessage,
  onSuccess: () => {
    // Invalidate so message list refetches
    queryClient.invalidateQueries({ queryKey: queryKeys.messages.list(chatId) });
    // Invalidate so chat list "latest message" preview updates
    queryClient.invalidateQueries({ queryKey: queryKeys.chats.all() });
  },
});
```

### Import queryClient from store barrel
```tsx
import { queryClient, queryKeys } from "../store";
```

---

## Zustand — Rules

### Auth store
```tsx
import { useAuthStore } from "../store";

// In a component
const user = useAuthStore((state) => state.user);
const { setUser, logout } = useAuthStore();

// After login — store handles localStorage persistence automatically
setUser(data);

// On logout
logout(); // clears store + localStorage via persist middleware
```

### Chat store
```tsx
import { useChatStore } from "../store";

const selectedChat   = useChatStore((state) => state.selectedChat);
const notifications  = useChatStore((state) => state.notifications);
const { setSelectedChat, addNotification, clearNotification } = useChatStore();
```

### Socket store
```tsx
import { useSocketStore } from "../store";

// Connect once — call on login success
const { connect } = useSocketStore();
connect(user);

// In SingleChat
const { joinRoom, emitTyping, emitStopTyping, emitNewMessage } = useSocketStore();
joinRoom(selectedChat._id);
emitNewMessage(data);

// On logout
const { disconnect } = useSocketStore();
disconnect();
```

### Subscribe to a single field (performance — avoids re-renders)
```tsx
// ✅ Fine-grained selector — component only re-renders when selectedChat changes
const selectedChat = useChatStore((state) => state.selectedChat);

// ❌ Whole store — re-renders on ANY store change
const store = useChatStore();
```

---

## API Layer — Rules

### Never import axios in components
```tsx
// ✅ CORRECT
import { fetchChats, sendMessage } from "../store";
useQuery({ queryKey: queryKeys.chats.all(), queryFn: fetchChats })

// ❌ WRONG
import axios from "axios";
const { data } = await axios.get("/api/chat");
```

### Never hardcode API URL
```tsx
// ✅ All API calls go through apiClient which has baseURL set
// ❌ Never
axios.get("https://vibechat-177v.onrender.com/api/chat")
```

---

## Theme — Semantic Tokens (still applies)

Always use semantic tokens, never hardcoded hex:

| Token | Usage |
|---|---|
| `bg-app` | Page background |
| `bg-surface` | Cards, panels, navbar |
| `bg-elevated` | Hover, selected items |
| `bg-input` | Input fields |
| `border-subtle` | Borders, dividers |
| `text-primary` | Main text |
| `text-secondary` | Labels, subtext |
| `text-disabled` | Placeholders |
| `accent` | Brand pink `#E1306C` |
| `online` | Green presence dot |

Brand gradient: `bgGradient="linear(to-r, #833AB4, #E1306C, #F77737)"`

---

## Git Workflow

### Branch naming
```
VIB-{ticket}-{short-description}
e.g. VIB-19-auth-tanstack
```

### Commit message
```
VIB-{ticket}: {imperative sentence}
e.g. VIB-19: Migrate Login to useMutation + useAuthStore
```

Ticket key auto-links commit to Jira.

### Merge order — Sprint 1 dependency chain
```
VIB-18 (stores + query client) → merge first
VIB-19 (auth migration)        → depends on VIB-18
VIB-20 (chat/message migration) → depends on VIB-18, VIB-19
VIB-21 (socket store wired up) → depends on VIB-18, VIB-20
```

---

## ESLint — Key Rules

| Rule | Level |
|---|---|
| `@typescript-eslint/no-unused-vars` | warn (prefix `_` to suppress) |
| `import/no-duplicates` | error (autofixable via `npm run lint:fix`) |
| `prefer-const` | error |
| `no-var` | error |
| `eqeqeq` | error |

Run locally: `cd frontend && npm run lint`

---

## API Reference

### Users
| Method | Endpoint | Function |
|---|---|---|
| POST | `/api/user` | `registerUser()` |
| POST | `/api/user/login` | `loginUser()` |
| GET | `/api/user?search=` | `searchUsers()` |
| PUT | `/api/user/profile` | `updateUserProfile()` |

### Chats
| Method | Endpoint | Function |
|---|---|---|
| GET | `/api/chat` | `fetchChats()` |
| POST | `/api/chat` | `accessOrCreateChat()` |
| POST | `/api/chat/group` | `createGroupChat()` |
| PUT | `/api/chat/rename` | `renameGroupChat()` |
| PUT | `/api/chat/groupadd` | `addToGroupChat()` |
| PUT | `/api/chat/groupremove` | `removeFromGroupChat()` |

### Messages
| Method | Endpoint | Function |
|---|---|---|
| GET | `/api/message/:chatId` | `fetchMessages()` |
| POST | `/api/message` | `sendMessage()` |

---

## Socket.IO Events

| Event | Direction | Triggered by |
|---|---|---|
| `setup` | Client→Server | `socketStore.connect()` |
| `join chat` | Client→Server | `socketStore.joinRoom()` |
| `new message` | Client→Server | `socketStore.emitNewMessage()` |
| `message recieved` | Server→Client | `socketStore` → invalidates TanStack Query |
| `typing` | Client→Server | `socketStore.emitTyping()` |
| `stop typing` | Client→Server | `socketStore.emitStopTyping()` |

---

## Common Mistakes to Avoid

1. Never import `axios` directly in components — use `store/api/*` functions
2. Never write to `localStorage` for auth — `useAuthStore.setUser()` handles it
3. Never use magic query key strings — always use `queryKeys.*`
4. Never connect the socket inside a component — call `socketStore.connect()` once on login
5. Never put server state (API data) in Zustand — that is TanStack Query's job
6. Never put UI state (selected chat, typing) in TanStack Query — that is Zustand's job
7. Never import from type files directly — use `../types` barrel
8. Never hardcode hex colors — use semantic tokens
9. Always `invalidateQueries` after mutations that affect list views
10. Never branch from an unmerged branch — always branch from `main`
11. Never use duplicate import statements from the same module — combine them into a single import statement (e.g. from `../../store`), which is autofixable by `npm run lint:fix`

---

## Jira Board
https://vibecode.atlassian.net/jira/software/projects/VIB/boards/2

### Sprint 1 (Active)
| Ticket | Summary | Status |
|---|---|---|
| VIB-18 | TanStack Query + Zustand Setup | 🔁 In Progress |
| VIB-19 | Auth migration to useAuthStore + useMutation | ⏳ Todo |
| VIB-20 | Chat/Message migration to TanStack Query | ⏳ Todo |
| VIB-21 | Socket.IO → socketStore (single connection) | ⏳ Todo |
