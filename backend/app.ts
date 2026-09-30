import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import path from "path";
import userRoutes from "./routes/userRoutes";
import chatRoutes from "./routes/chatRoutes";
import messageRoutes from "./routes/messageRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import { notFound, errorHandler } from "./Middleware/errorMiddleware";
import { allowedOrigins } from "./config/cors";

const app = express();

// Credentialed CORS (refresh cookie) — only for known frontend origins, never "*"
app.use(cors({ origin: allowedOrigins(), credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/notifications", notificationRoutes);

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
