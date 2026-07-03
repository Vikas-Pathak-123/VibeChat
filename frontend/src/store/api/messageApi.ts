import apiClient from "./apiClient";
import { Message } from "../../types";

export interface SendMessagePayload { content: string; chatId: string }

/**
 * TanStack Query fetch functions for the Message domain.
 */

export const fetchMessages = async (chatId: string): Promise<Message[]> => {
  const { data } = await apiClient.get<Message[]>(`/api/message/${chatId}`);
  return data;
};

export const sendMessage = async (payload: SendMessagePayload): Promise<Message> => {
  const { data } = await apiClient.post<Message>("/api/message", payload);
  return data;
};
