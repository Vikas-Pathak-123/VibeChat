import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "../types";
import { Chat } from "../types";
import { Message } from "../types";

/** Shape of the global chat context */
interface ChatContextType {
  selectedChat: Chat | null;
  setSelectedChat: React.Dispatch<React.SetStateAction<Chat | null>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  notification: Message[];
  setNotification: React.Dispatch<React.SetStateAction<Message[]>>;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

/** Wraps the app with global chat state */
const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [user, setUser]                 = useState<User | null>(null);
  const [notification, setNotification] = useState<Message[]>([]);
  const [chats, setChats]               = useState<Chat[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("userInfo");
    const userInfo: User | null = stored ? JSON.parse(stored) : null;
    setUser(userInfo);
    if (!userInfo) navigate("/");
  }, [navigate]);

  return (
    <ChatContext.Provider
      value={{ selectedChat, setSelectedChat, user, setUser, notification, setNotification, chats, setChats }}
    >
      {children}
    </ChatContext.Provider>
  );
};

/**
 * Custom hook to consume ChatContext.
 * Throws if used outside of <ChatProvider>.
 */
export const useChatState = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChatState must be used within a ChatProvider");
  return context;
};

// Legacy alias — keeps old components working during migration
export const ChatState = useChatState;

export default ChatProvider;
