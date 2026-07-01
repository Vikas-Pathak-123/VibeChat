import express, { Request, Response } from "express";
import colors from "colors";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db";
import userRoutes from "./routes/userRoutes";
import chatRoutes from "./routes/chatRoutes";
import messageRoutes from "./routes/messageRoutes";
import path from 'path';

import { notFound, errorHandler } from "./Middleware/errorMiddleware";
import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "./types/socket.types";
import { IUser } from "./models/userModel";

dotenv.config();

const app = express();

connectDB();
app.use(cors()); // to resolve proxy, cors error
app.use(express.json()); // to accept json

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

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(colors.yellow(`Server running at port ${PORT}`));
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
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

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    if (socketUserData) {
      socket.leave(socketUserData._id);
    }
  });
});
