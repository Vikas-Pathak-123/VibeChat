import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Chat, Message } from "../types";

interface ChatContextType {
  selectedChat: Chat | null;
  setSelectedChat: React.Dispatch<React.SetStateAction<Chat | null>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  notification: Message[];
  setNotification: React.Dispatch<React.SetStateAction<Message[]>>;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  isAuthLoading: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [user, setUser]                 = useState<User | null>(null);
  const [notification, setNotification] = useState<Message[]>([]);
  const [chats, setChats]               = useState<Chat[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("userInfo");
    const userInfo: User | null = stored ? JSON.parse(stored) : null;
    setUser(userInfo);
    setIsAuthLoading(false);
    if (!userInfo) navigate("/");
  }, [navigate]);

  return (
    <ChatContext.Provider
      value={{
        selectedChat, setSelectedChat,
        user, setUser,
        notification, setNotification,
        chats, setChats,
        isAuthLoading,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatState = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChatState must be used within a ChatProvider");
  return context;
};

export const ChatState = useChatState;

export default ChatProvider;
