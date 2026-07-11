import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Chat, Message } from "../types";
import { useAuthStore } from "../store/authStore";

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

  const navigate = useNavigate();
  const { user: authUser, isAuthLoading: authLoading } = useAuthStore();

  useEffect(() => {
    if (!authLoading) {
      setUser(authUser);
      if (!authUser) navigate("/");
    }
  }, [authUser, authLoading, navigate]);

  return (
    <ChatContext.Provider
      value={{
        selectedChat, setSelectedChat,
        user, setUser,
        notification, setNotification,
        chats, setChats,
        isAuthLoading: authLoading,
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
