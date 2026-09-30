import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@chakra-ui/react";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markChatNotificationsRead,
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "../store/api/notificationApi";
import { queryClient } from "../store/queryClient";
import { queryKeys } from "../store/keys/queryKeys";
import { useAuthStore } from "../store/authStore";
import { AppNotification, NotificationPreferences } from "../types";

/**
 * Notification hooks — the bell's server state (VIB-23).
 *
 * Unread notifications live in the DB and the TanStack cache, so the badge
 * survives a page refresh. Mark-read mutations drop rows from the cache
 * optimistically, then refetch to reconcile.
 */

const dropFromCache = (predicate: (n: AppNotification) => boolean): void => {
  queryClient.setQueryData<AppNotification[]>(queryKeys.notifications.list(), (old: AppNotification[] | undefined) =>
    old?.filter((n) => !predicate(n))
  );
};

const refetchNotifications = () =>
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });

export const useNotificationsQuery = () => {
  const user = useAuthStore((s) => s.user);
  return useQuery<AppNotification[]>({
    queryKey: queryKeys.notifications.list(),
    queryFn: fetchNotifications,
    enabled: !!user,
  });
};

export const useMarkNotificationRead = () =>
  useMutation({
    mutationFn: markNotificationRead,
    onMutate: (notificationId: string) => dropFromCache((n) => n._id === notificationId),
    onSettled: refetchNotifications,
  });

export const useMarkAllNotificationsRead = () =>
  useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: () => dropFromCache(() => true),
    onSettled: refetchNotifications,
  });

export const useMarkChatNotificationsRead = () =>
  useMutation({
    mutationFn: markChatNotificationsRead,
    onMutate: (chatId: string) => dropFromCache((n) => n.chat._id === chatId),
    onSettled: refetchNotifications,
  });

export const useNotificationPreferences = (enabled: boolean) =>
  useQuery<NotificationPreferences>({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: fetchNotificationPreferences,
    enabled,
  });

export const useUpdateNotificationPreferences = () => {
  const toast = useToast();
  return useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (prefs: NotificationPreferences) => {
      queryClient.setQueryData(queryKeys.notifications.preferences(), prefs);
      toast({
        title: prefs.muteNotifications ? "Message notifications muted 🔕" : "Message notifications on 🔔",
        status: "success", duration: 2500, isClosable: true, position: "top",
      });
    },
    onError: () =>
      toast({ title: "Failed to update notification settings", status: "error", duration: 4000, isClosable: true, position: "top" }),
  });
};
