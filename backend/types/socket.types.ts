import { IUser } from "../models/userModel";

/** Shape of a populated message as sent over the socket (matches frontend Message type) */
export interface SocketMessage {
  _id: string;
  sender: { _id: string; name: string; pic?: string; email?: string };
  content: string;
  chat: { _id: string; users: { _id: string }[] };
  createdAt: string;
  updatedAt: string;
}

/** Events the client sends to the server */
export interface ClientToServerEvents {
  setup: (userData: IUser) => void;
  "join chat": (room: string) => void;
  typing: (room: string) => void;
  "stop typing": (room: string) => void;
  "new message": (message: SocketMessage) => void;
}

/** Events the server sends to the client */
export interface ServerToClientEvents {
  connected: () => void;
  typing: () => void;
  "stop typing": () => void;
  "message recieved": (message: SocketMessage) => void;
}
