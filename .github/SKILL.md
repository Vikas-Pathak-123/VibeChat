# VibeChat — Claude Development Skill

## Project Overview
VibeChat is a full-stack real-time chat application built with the MERN stack + Socket.IO.
It follows an **Instagram-inspired UI** with dark/light theme support.

---

## Tech Stack

### Frontend
- **React 18 + TypeScript** (strict mode)
- **Chakra UI v2** — component library with custom theme
- **Socket.IO Client** — real-time messaging
- **React Router v6** — client-side routing
- **Axios** — HTTP requests

### Backend
- **Node.js + Express** — REST API
- **MongoDB + Mongoose** — database
- **Socket.IO** — WebSocket server
- **JWT + bcryptjs** — auth
- **Cloudinary** — image uploads

### Infrastructure
- **Vercel** — frontend deployment (auto-deploys on merge to `main`)
- **Render** — backend deployment
- **GitHub Actions** — CI via Vercel bot

---

## Project Structure

```
VibeChat/
├── frontend/
│   ├── .eslintrc.json          # ESLint rules — TypeScript + React
│   ├── tsconfig.json           # TypeScript config (strict)
│   └── src/
│       ├── types/              # Shared TypeScript interfaces
│       │   ├── user.types.ts
│       │   ├── chat.types.ts
│       │   ├── message.types.ts
│       │   └── index.ts        # Barrel export — import from here
│       ├── constants/
│       │   └── api.constants.ts  # API_BASE_URL, SOCKET_ENDPOINT
│       ├── theme/              # Chakra UI custom theme
│       │   ├── index.ts        # Main theme export → vibeChatTheme
│       │   ├── colors.ts       # Brand palette (#833AB4, #E1306C, #F77737)
│       │   ├── typography.ts   # Inter font, size scale
│       │   ├── components.ts   # Button/Input/Modal/Menu overrides
│       │   └── foundations/
│       │       ├── dark.ts     # Dark mode semantic tokens
│       │       └── light.ts    # Light mode semantic tokens
│       ├── context/
│       │   └── ChatProvider.tsx  # Global state — user, chats, selectedChat, notification
│       ├── config/
│       │   └── ChatLogics.ts   # Pure helper functions — getSender, isSameSender etc.
│       ├── components/
│       │   ├── shared/
│       │   │   ├── ThemeToggle.tsx    # Sun/moon dark-light toggle
│       │   │   └── ChatLoading.tsx    # Skeleton loader
│       │   ├── Authentication/
│       │   │   ├── Login.tsx
│       │   │   └── Signup.tsx
│       │   ├── miscellaneous/
│       │   │   ├── SideDrawer.tsx     # Top navbar + search drawer
│       │   │   ├── ProfileModal.tsx
│       │   │   ├── GroupChatModal.tsx
│       │   │   └── UpdateGroupChatModal.tsx
│       │   ├── userAvatar/
│       │   │   ├── UserListItem.tsx
│       │   │   └── UserBadgeItem.tsx
│       │   ├── MyChats.tsx       # Left sidebar — chat list
│       │   ├── Chatbox.tsx       # Right panel wrapper
│       │   ├── SingleChat.tsx    # Chat header + message input + socket logic
│       │   └── ScrollableChat.tsx  # Message bubbles renderer
│       └── Pages/
│           ├── Homepage.tsx      # Login/Signup page
│           ├── Chatpage.tsx      # Main chat layout
│           └── NotFoundPage.tsx
└── backend/
    ├── server.js               # Express + Socket.IO entry point
    ├── config/db.js            # MongoDB connection
    ├── models/                 # Mongoose schemas
    ├── controllers/            # Route handlers
    └── routes/                 # userRouts, chatRoutes, messageRoutes
```

---

## Theme System — CRITICAL

All components use **semantic color tokens**, never hardcoded hex values.

```tsx
// ✅ CORRECT — auto-switches with dark/light mode
<Box bg="bg-surface" color="text-primary" borderColor="border-subtle">

// ❌ WRONG — hardcoded, breaks theme toggle
<Box bg="#121212" color="#F5F5F5">
```

### Available Semantic Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `bg-app` | `#FAFAFA` | `#000000` | Page backgrounds |
| `bg-surface` | `#FFFFFF` | `#121212` | Cards, panels, navbar |
| `bg-elevated` | `#F0F0F0` | `#1C1C1C` | Hover states, selected items |
| `bg-input` | `#EFEFEF` | `#262626` | Input fields |
| `border-subtle` | `#DBDBDB` | `#262626` | Borders, dividers |
| `border-strong` | `#B2B2B2` | `#363636` | Emphasis borders |
| `text-primary` | `#262626` | `#F5F5F5` | Main text |
| `text-secondary` | `#8E8E8E` | `#A8A8A8` | Subtext, labels |
| `text-disabled` | `#C7C7C7` | `#555555` | Placeholders, hints |
| `accent` | `#E1306C` | `#E1306C` | Brand pink — buttons, focus |
| `accent-hover` | `#C1275C` | `#C1275C` | Button hover |
| `bubble-sent` | `#EFEFEF` | `#262626` | Sent message bubbles |
| `bubble-received` | `#FFFFFF` | `#1C1C1C` | Received message bubbles |
| `online` | `#22C55E` | `#22C55E` | Online indicator dot |

### Brand Gradient
```tsx
bgGradient="linear(to-r, #833AB4, #E1306C, #F77737)"  // Instagram purple→pink→orange
```

---

## Component Rules

### Button Variants
```tsx
<Button variant="primary">  // Gradient CTA — use for main actions
<Button variant="nav">      // Ghost — use for navbar icons and secondary actions
```

### Input Variant
```tsx
<Input variant="insta">  // Applied by default via theme — dark/light aware
```

### Context Hook
```tsx
// ✅ Always use this hook — never import ChatContext directly
import { useChatState } from "../context/ChatProvider";
const { user, selectedChat, chats, notification } = useChatState();
```

### API Calls
```tsx
// ✅ Always use the constant — never hardcode the URL
import { API_BASE_URL } from "../constants/api.constants";
const { data } = await axios.get(`${API_BASE_URL}/api/chat`, {
  headers: { Authorization: `Bearer ${user?.token}` },
});
```

### Type Imports
```tsx
// ✅ Always import types from the barrel
import { User, Chat, Message } from "../types";

// ❌ Never import directly from type files
import { User } from "../types/user.types";
```

---

## ESLint Rules (Key)

| Rule | Level | Note |
|------|-------|------|
| `@typescript-eslint/no-unused-vars` | warn | Prefix with `_` to suppress |
| `@typescript-eslint/no-explicit-any` | warn | Avoid — use proper types |
| `react-hooks/rules-of-hooks` | error | Never break |
| `react-hooks/exhaustive-deps` | warn | Add `// eslint-disable-next-line` with reason |
| `prefer-const` | error | Always use const |
| `no-var` | error | Never use var |
| `eqeqeq` | error | Always use === |
| `no-console` | warn | Use only console.warn / console.error |

### Run Lint Locally
```bash
cd frontend
npm run lint        # Check all errors
npm run lint:fix    # Auto-fix safe issues
```

---

## Git Workflow

### Branch Naming
```
VIB-{ticket}-{short-description}
e.g. VIB-4-profile-settings-ui
```

### Commit Message Format
```
VIB-{ticket}: {imperative sentence}
e.g. VIB-4: Add profile avatar upload with Cloudinary
```

This format auto-links commits to Jira tickets.

### PR Order (always merge in this order)
Foundation tickets must merge before feature tickets that depend on them.

---

## Jira Board
https://vibecode.atlassian.net/jira/software/projects/VIB/boards/2

| Ticket | Description | Priority |
|--------|-------------|----------|
| VIB-6 | Theme Foundation + TS Migration | ✅ Done |
| VIB-1 | Login & Signup UI | ✅ Done |
| VIB-2 | Chat Sidebar | ✅ Done |
| VIB-3 | Chat Bubbles & Message UI | 🔁 In Progress |
| VIB-4 | Profile & Settings | ⏳ Todo |
| VIB-5 | Mobile Responsiveness | ⏳ Todo |

---

## API Endpoints

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/user` | Register |
| POST | `/api/user/login` | Login |
| GET | `/api/user?search=` | Search users |

### Chats
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Access/create 1:1 chat |
| GET | `/api/chat` | Get all chats for user |
| POST | `/api/chat/group` | Create group chat |
| PUT | `/api/chat/rename` | Rename group |
| PUT | `/api/chat/groupadd` | Add member |
| PUT | `/api/chat/groupremove` | Remove member |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/message` | Send message |
| GET | `/api/message/:chatId` | Get messages |

---

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `setup` | Client→Server | Join personal room |
| `join chat` | Client→Server | Join chat room |
| `new message` | Client→Server | Broadcast new message |
| `message recieved` | Server→Client | Receive message |
| `typing` | Client→Server | Start typing indicator |
| `stop typing` | Client→Server | Stop typing indicator |

---

## Common Mistakes to Avoid

1. **Never hardcode hex colors** — always use semantic tokens
2. **Never import from type files directly** — use barrel `../types`
3. **Never hardcode API URL** — use `API_BASE_URL` constant
4. **Never use `ChatState()`** — use `useChatState()` hook
5. **Never add unused imports** — ESLint will fail the CI build
6. **Never use `var`** — use `const` or `let`
7. **Always type function return types** on async functions: `Promise<void>`
8. **Always use `finally`** in try/catch for loading state cleanup
9. **Branch from `main`** — never branch from an unmerged feature branch
10. **Merge VIB-6 before any feature ticket** — it is the foundation
