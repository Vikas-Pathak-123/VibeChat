import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markChatNotificationsRead,
} from "../store/api/notificationApi";
import { queryClient } from "../store/queryClient";
import { queryKeys } from "../store/keys/queryKeys";
import { useAuthStore } from "../store/authStore";
import { AppNotification } from "../types";

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
