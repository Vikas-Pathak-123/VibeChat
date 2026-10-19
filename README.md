# 💬 VibeChat

<div align="center">

![VibeChat Banner](https://img.shields.io/badge/VibeChat-Real--Time%20Chat%20App-teal?style=for-the-badge&logo=chatbot)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-vibe--chat.vercel.app-brightgreen?style=flat-square&logo=vercel)](https://vibe-chat.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Vikas--Pathak--123%2FVibeChat-black?style=flat-square&logo=github)](https://github.com/Vikas-Pathak-123/VibeChat)
![JavaScript](https://img.shields.io/badge/JavaScript-94.9%25-yellow?style=flat-square&logo=javascript)
![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)

**A full-stack real-time chat application built with the MERN stack and Socket.IO.**  
Chat one-on-one or in groups, with instant messaging, typing indicators, and media sharing — all in real time.

</div>

---

## 🚀 Live Demo

🌐 **[https://vibe-chat.vercel.app](https://vibe-chat.vercel.app)**

> Frontend deployed on **Vercel** · Backend deployed on **Render**

---

## ✨ Features

- 🔐 **User Authentication** — Secure signup & login with JWT-based auth and bcrypt password hashing
- 💬 **Real-Time Messaging** — Instant message delivery powered by Socket.IO
- 👥 **Group Chats** — Create and manage group conversations
- ⌨️ **Typing Indicators** — See when the other person is typing in real time
- 🔔 **Notifications** — Get notified of new messages from other conversations
- 🖼️ **Profile Avatars** — Upload and manage profile pictures via Cloudinary
- 🔍 **User Search** — Search and find other users to chat with
- 📱 **Responsive Design** — Works across desktop and mobile screens
- 🧑‍🤝‍🧑 **One-on-One & Group Chat** — Supports both private and group conversations

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React.js** | UI framework |
| **Chakra UI** | Component library & styling |
| **Socket.IO Client** | Real-time WebSocket connection |
| **Axios** | HTTP requests to the backend |
| **React Context API** | Global state management |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | Server runtime |
| **Express.js** | REST API framework |
| **Socket.IO** | Real-time bidirectional communication |
| **Mongoose** | MongoDB ODM |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **dotenv** | Environment variable management |
| **cors** | Cross-origin resource sharing |

### Database & Cloud
| Service | Purpose |
|---|---|
| **MongoDB Atlas** | Cloud-hosted NoSQL database |
| **Cloudinary** | Image storage & delivery (avatars) |
| **Vercel** | Frontend deployment |
| **Render** | Backend deployment |

---

## 📁 Project Structure

```
VibeChat/
├── backend/
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── controllers/            # Route handler logic
│   ├── data/                   # Seed/mock data
│   ├── Middleware/
│   │   └── errorMiddleware.js  # Global error handling
│   ├── models/                 # Mongoose schemas
│   ├── routes/
│   │   ├── userRouts.js        # User API routes
│   │   ├── chatRoutes.js       # Chat API routes
│   │   └── messageRoutes.js    # Message API routes
│   └── server.js               # Express + Socket.IO entry point
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/         # React UI components
│       ├── config/             # Chat logic helpers
│       ├── Context/            # React Context (global state)
│       └── ...
│
├── screenshots/                # App screenshots
├── package.json                # Root dependencies (backend)
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v16+)
- [npm](https://www.npmjs.com/)
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
- A [Cloudinary](https://cloudinary.com/) account

---

### 1. Clone the Repository

```bash
git clone https://github.com/Vikas-Pathak-123/VibeChat.git
cd VibeChat
```

---

### 2. Backend Setup

```bash
# Install root/backend dependencies
npm install
```

Create a `.env` file in the root directory:

```env
PORT=4000
NODE_ENV=development
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Optional — Google sign-in (without these the Google button says it's unavailable)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
# Optional — frontend origin(s) allowed to call the API with cookies, comma-separated
# (defaults: http://localhost:3000 in development, https://vibe-chat.vercel.app in production)
CLIENT_URL=http://localhost:3000
# Optional — separate secret for refresh tokens (falls back to JWT_SECRET)
REFRESH_TOKEN_SECRET=another_long_random_string
```

Start the backend server:

```bash
# Development (with nodemon)
npm run server

# Production
npm start
```

The backend will start at **http://localhost:4000**

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend will start at **http://localhost:3000**. API calls go to `/api/...` on the same site and the dev server proxies them to the backend on port 4000 (`"proxy"` in `frontend/package.json`); Socket.IO and Google sign-in connect to `http://localhost:4000` directly. To point elsewhere, set `REACT_APP_API_URL` (API calls) and `REACT_APP_API_ORIGIN` (Socket.IO + Google).

---

### 4. Run Both Together (from root)

You can run both concurrently using a tool like `concurrently`:

```bash
# From root directory
npm run dev
```

---

## 🔌 API Endpoints

### User Routes — `/api/user`
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/user` | Register a new user (sets the refresh cookie) |
| `POST` | `/api/user/login` | Login: returns a 15-minute access token, sets a 30-day httpOnly refresh cookie |
| `POST` | `/api/user/refresh` | New access token from the refresh cookie (rotates it) |
| `POST` | `/api/user/logout` | Revoke this session's refresh cookie |
| `GET` | `/api/user/auth/google` | Start Google sign-in |
| `POST` | `/api/user/auth/google/exchange` | Trade the one-time Google code for a session |
| `GET` | `/api/user?search=` | Search users by name/email |

### Chat Routes — `/api/chat`
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Create or access one-on-one chat |
| `GET` | `/api/chat` | Fetch all chats for logged-in user |
| `POST` | `/api/chat/group` | Create a group chat |
| `PUT` | `/api/chat/rename` | Rename a group chat |
| `PUT` | `/api/chat/groupadd` | Add user to group |
| `PUT` | `/api/chat/groupremove` | Remove user from group |

### Message Routes — `/api/message`
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/message` | Send a new message |
| `GET` | `/api/message/:chatId` | Get all messages in a chat |

---

## 🔄 Socket.IO Events

| Event | Direction | Description |
|---|---|---|
| `setup` | Client → Server | Join user's personal room |
| `join chat` | Client → Server | Join a specific chat room |
| `new message` | Client → Server | Send a new message |
| `message recieved` | Server → Client | Receive a new message |
| `typing` | Client → Server | Broadcast typing status |
| `stop typing` | Client → Server | Broadcast stop typing |

---

## 🌐 Deployment

### Frontend (Vercel)
1. Push the `frontend` folder to GitHub
2. Connect the repo to [Vercel](https://vercel.com)
3. Set build command: `npm run build`
4. Set output directory: `build`
5. `frontend/vercel.json` rewrites `/api/*` to the Render backend, so API calls and the login cookie stay on the Vercel site (browsers that block third-party cookies, like Safari, keep the user logged in). No frontend environment variables are needed.

### Backend (Render)
1. Connect the repo to [Render](https://render.com)
2. Set build command: `npm install && npm run build:backend` (compiles the TypeScript backend to `backend/dist`, which `npm start` runs)
3. Set start command: `npm start`
4. Add all `.env` variables in the Render environment settings
5. Set `NODE_ENV=production`
6. For Google sign-in: add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, and in Google Cloud Console add `https://<your-render-service>.onrender.com/api/user/auth/google/callback` as an authorized redirect URI

---

## 📸 Screenshots

> _Screenshots available in the [`/screenshots`](./screenshots) directory._

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m "Add: your feature description"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

> **Jira Board:** Track ongoing work at [vibecode.atlassian.net](https://vibecode.atlassian.net/jira/software/projects/VIB/boards/2)

---

## 🐛 Known Issues & Roadmap

- [ ] Typing indicator animation (Lottie integration pending)
- [ ] Read receipts / message delivery ticks
- [ ] Dark mode support
- [ ] Mobile sidebar collapse (hamburger menu)
- [ ] Push notifications

> These are being tracked as Jira tickets under the **VIB** project.

---

## 👨‍💻 Author

**Vikas Pathak**  
Full Stack Developer @ Lalitech India Pvt. Ltd.  
📍 India

[![GitHub](https://img.shields.io/badge/GitHub-Vikas--Pathak--123-black?logo=github)](https://github.com/Vikas-Pathak-123)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-vikas--pathak-blue?logo=linkedin)](https://in.linkedin.com/in/vikas-pathak-8499451b0)
[![LeetCode](https://img.shields.io/badge/LeetCode-Vikas--Pathak--123-orange?logo=leetcode)](https://leetcode.com/Vikas-Pathak-123/)

---

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/Vikas-Pathak-123">Vikas Pathak</a>
</div>
