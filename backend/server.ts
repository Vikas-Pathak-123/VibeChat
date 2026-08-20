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

    socket.on("message reaction", (payload) => {
      const chat = payload.message.chat;

      if (!chat.users) return console.log("chat.users not defined");

      chat.users.forEach((user) => {
        if (user._id === payload.actorId) return;

        socket.in(user._id).emit("message reaction", payload);
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
