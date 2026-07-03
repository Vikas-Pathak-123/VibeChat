/**
 * Centralised TanStack Query key factory.
 *
 * Why a key factory?
 * - Typo-proof: no magic strings spread across components
 * - Invalidation is easy: queryClient.invalidateQueries({ queryKey: queryKeys.chats.all() })
 * - Hierarchical: invalidating queryKeys.chats.all() also invalidates queryKeys.chats.detail(id)
 *
 * Usage:
 *   useQuery({ queryKey: queryKeys.messages.list(chatId), queryFn: ... })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.chats.all() })
 */
export const queryKeys = {
  chats: {
    all:    ()          => ["chats"]           as const,
    detail: (id: string) => ["chats", id]     as const,
  },
  messages: {
    list: (chatId: string) => ["messages", chatId] as const,
  },
  users: {
    search: (query: string) => ["users", "search", query] as const,
    profile: (id: string)   => ["users", id]              as const,
  },
} as const;
