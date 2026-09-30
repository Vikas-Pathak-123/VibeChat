import apiClient from "./apiClient";
import { AppNotification, NotificationPreferences } from "../../types";

/**
 * TanStack Query fetch functions for the Notification domain.
 */

export const fetchNotifications = async (): Promise<AppNotification[]> => {
  const { data } = await apiClient.get<AppNotification[]>("/api/notifications");
  return data;
};

export const markNotificationRead = async (notificationId: string): Promise<AppNotification> => {
  const { data } = await apiClient.put<AppNotification>(`/api/notifications/${notificationId}/read`);
  return data;
};

export const markAllNotificationsRead = async (): Promise<{ modifiedCount: number }> => {
  const { data } = await apiClient.put<{ modifiedCount: number }>("/api/notifications/read-all");
  return data;
};

export const markChatNotificationsRead = async (chatId: string): Promise<{ modifiedCount: number }> => {
  const { data } = await apiClient.put<{ modifiedCount: number }>(`/api/notifications/chat/${chatId}/read`);
  return data;
};

export const fetchNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const { data } = await apiClient.get<NotificationPreferences>("/api/notifications/preferences");
  return data;
};

export const updateNotificationPreferences = async (
  payload: NotificationPreferences
): Promise<NotificationPreferences> => {
  const { data } = await apiClient.put<NotificationPreferences>("/api/notifications/preferences", payload);
  return data;
};
