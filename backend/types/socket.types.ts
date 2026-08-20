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
