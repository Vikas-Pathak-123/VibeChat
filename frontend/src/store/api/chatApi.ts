import apiClient from "./apiClient";
import { Chat } from "../../types";

export interface CreateGroupPayload  { name: string; users: string }
export interface RenameGroupPayload  { chatId: string; chatName: string }
export interface GroupMemberPayload  { chatId: string; userId: string }

/**
 * TanStack Query fetch functions for the Chat domain.
 */

export const fetchChats = async (): Promise<Chat[]> => {
  const { data } = await apiClient.get<Chat[]>("/api/chat");
  return data;
};

export const accessOrCreateChat = async (userId: string): Promise<Chat> => {
  const { data } = await apiClient.post<Chat>("/api/chat", { userId });
  return data;
};

export const createGroupChat = async (payload: CreateGroupPayload): Promise<Chat> => {
  const { data } = await apiClient.post<Chat>("/api/chat/group", payload);
  return data;
};

export const renameGroupChat = async (payload: RenameGroupPayload): Promise<Chat> => {
  const { data } = await apiClient.put<Chat>("/api/chat/rename", payload);
  return data;
};

export const addToGroupChat = async (payload: GroupMemberPayload): Promise<Chat> => {
  const { data } = await apiClient.put<Chat>("/api/chat/groupadd", payload);
  return data;
};

export const removeFromGroupChat = async (payload: GroupMemberPayload): Promise<Chat> => {
  const { data } = await apiClient.put<Chat>("/api/chat/groupremove", payload);
  return data;
};
