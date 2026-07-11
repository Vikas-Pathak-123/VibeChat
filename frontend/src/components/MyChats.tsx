import { AddIcon, SearchIcon } from "@chakra-ui/icons";
import { Box, Stack, Text } from "@chakra-ui/layout";
import { Tooltip } from "@chakra-ui/tooltip";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, Badge, Button, Input, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { getSender } from "../config/ChatLogics";
import ChatLoading from "./shared/ChatLoading";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { fetchChats, queryKeys } from "../store";
import { Chat } from "../types";

/**
 * MyChats — Left sidebar showing conversation list.
 *
 * Server state: useQuery(fetchChats) — TanStack Query owns the chat list.
 * Client state: useChatStore — selectedChat, setSelectedChat.
 * Auth: useAuthStore — user (for getSender name resolution).
 *
 * fetchAgain prop retained for compatibility with Chatpage during VIB-20
 * transition. Once VIB-21 (socketStore) is merged, fetchAgain is removed
 * entirely — socketStore.invalidateChats() handles refetch via queryClient.
 */
interface MyChatsProps {
  fetchAgain: boolean;
}

const MyChats: React.FC<MyChatsProps> = ({ fetchAgain: _fetchAgain }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { user }                      = useAuthStore();
  const { selectedChat, setSelectedChat } = useChatStore();

  const {
    data: chats = [],
    isLoading,
  } = useQuery({
    queryKey: queryKeys.chats.all(),
    queryFn: fetchChats,
    enabled: !!user, // only fetch when logged in
  });

  const filteredChats = chats.filter((chat: Chat) => {
    if (!user) return false;
    const name = chat.isGroupChat ? chat.chatName : getSender(user, chat.users);
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Box
      display={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      w={{ base: "100%", md: "31%" }}
      bg="bg-surface"
      borderRadius="xl"
      border="1px solid"
      borderColor="border-subtle"
      overflow="hidden"
    >
      {/* Header */}
      <Box
        px={4} py={3}
        borderBottom="1px solid" borderColor="border-subtle"
        display="flex" justifyContent="space-between" alignItems="center"
      >
        <Text fontSize="lg" fontWeight="bold" color="text-primary">💬 Chats</Text>
        <GroupChatModal>
          <Tooltip label="New Group Chat" hasArrow placement="bottom-end">
            <Button size="sm" variant="primary" leftIcon={<AddIcon fontSize="10px" />}>
              <Text display={{ base: "none", md: "flex" }} fontSize="xs">New Group</Text>
            </Button>
          </Tooltip>
        </GroupChatModal>
      </Box>

      {/* Search */}
      <Box px={3} py={3} borderBottom="1px solid" borderColor="border-subtle">
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="text-disabled" fontSize="11px" />
          </InputLeftElement>
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg="bg-input" border="1px solid" borderColor="border-subtle"
            color="text-primary" borderRadius="full" fontSize="sm"
            _placeholder={{ color: "text-disabled" }}
            _focus={{ borderColor: "accent", boxShadow: "0 0 0 1px #E1306C" }}
          />
        </InputGroup>
      </Box>

      {/* Chat List */}
      <Box
        flex="1" overflowY="auto" px={2} py={2}
        sx={{
          "&::-webkit-scrollbar": { width: "3px" },
          "&::-webkit-scrollbar-thumb": { bg: "accent", borderRadius: "full" },
        }}
      >
        {isLoading ? (
          <ChatLoading />
        ) : chats.length > 0 ? (
          <Stack spacing={1}>
            {filteredChats.length === 0 && (
              <Text textAlign="center" color="text-disabled" fontSize="sm" mt={6}>
                {searchQuery ? "No chats found" : "No conversations yet"}
              </Text>
            )}
            {filteredChats.map((chat: Chat) => {
              const chatName  = chat.isGroupChat ? chat.chatName : (user ? getSender(user, chat.users) : "");
              const isSelected = selectedChat?._id === chat._id;
              return (
                <Box
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  cursor="pointer"
                  display="flex" alignItems="center"
                  gap={3} px={3} py={2}
                  borderRadius="10px"
                  bg={isSelected ? "bg-elevated" : "transparent"}
                  border="1px solid"
                  borderColor={isSelected ? "accent" : "transparent"}
                  _hover={{ bg: "bg-elevated", borderColor: "border-subtle" }}
                  transition="all 0.15s"
                >
                  <Box position="relative" flexShrink={0}>
                    <Avatar size="sm" name={chatName} bg="accent" color="white" fontSize="xs" />
                    {!chat.isGroupChat && (
                      <Box
                        position="absolute" bottom="0" right="0"
                        w="9px" h="9px" bg="online"
                        borderRadius="full" border="2px solid" borderColor="bg-surface"
                      />
                    )}
                  </Box>
                  <Box flex="1" overflow="hidden">
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Text fontWeight="semibold" color="text-primary" fontSize="sm" isTruncated maxW="140px">
                        {chatName}
                      </Text>
                      {chat.isGroupChat && (
                        <Badge colorScheme="pink" fontSize="9px" px={1} borderRadius="md">Group</Badge>
                      )}
                    </Box>
                    {chat.latestMessage ? (
                      <Text fontSize="xs" color="text-secondary" isTruncated maxW="170px">
                        <b>{chat.latestMessage.sender.name.split(" ")[0]}:</b>{" "}
                        {chat.latestMessage.content.length > 35
                          ? chat.latestMessage.content.substring(0, 35) + "..."
                          : chat.latestMessage.content}
                      </Text>
                    ) : (
                      <Text fontSize="xs" color="text-disabled">No messages yet</Text>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Text textAlign="center" color="text-disabled" fontSize="sm" mt={6}>
            No conversations yet
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default MyChats;
