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

export const reactToMessage = async (params: { messageId: string; emoji: string }): Promise<Message> => {
  const { data } = await apiClient.put<Message>(`/api/message/${params.messageId}/react`, {
    emoji: params.emoji,
  });
  return data;
};

export const deleteMessage = async (messageId: string): Promise<Message> => {
  const { data } = await apiClient.delete<Message>(`/api/message/${messageId}`);
  return data;
};
