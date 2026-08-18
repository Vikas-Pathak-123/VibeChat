import { FormControl } from "@chakra-ui/form-control";
import { Box, Text } from "@chakra-ui/layout";
import {
  Avatar, IconButton, Input, InputGroup,
  InputRightElement, Spinner, useToast,
} from "@chakra-ui/react";
import { ArrowBackIcon, AttachmentIcon } from "@chakra-ui/icons";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Player } from "@lottiefiles/react-lottie-player";
import { getSenderFull } from "../config/ChatLogics";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { useSocketStore } from "../store/socketStore";
import { fetchMessages, sendMessage, queryKeys, queryClient } from "../store";
import { Message } from "../types";
import ScrollableChat from "./ScrollableChat";
import ProfileModal from "./miscellaneous/ProfileModal";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";

interface SingleChatProps {
  fetchAgain: boolean;
  setFetchAgain: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * SingleChat — Chat header, message list, typing indicator, message input.
 *
 * Server state:
 *   - useQuery(fetchMessages) — message list, keyed by chatId
 *   - useMutation(sendMessage) — send new message
 *
 * Client state:
 *   - useChatStore — selectedChat, setSelectedChat, typingChats
 *   - useAuthStore — user
 *   - useSocketStore — joinRoom, emitTyping, emitStopTyping, emitNewMessage
 *
 * Socket connection lifecycle (connect/disconnect) is handled in
 * useAuthMutations (VIB-19) — SingleChat only consumes the socket.
 *
 * fetchAgain / setFetchAgain props retained for UpdateGroupChatModal
 * compatibility. Will be removed in VIB-21 when socketStore handles
 * all cache invalidation directly.
 */
const SingleChat: React.FC<SingleChatProps> = ({ fetchAgain, setFetchAgain }) => {
  const [newMessage, setNewMessage] = useState<string>("");
  const [typing, setTyping]         = useState<boolean>(false);

  const toast                              = useToast();
  const { user }                           = useAuthStore();
  const { selectedChat, setSelectedChat, typingChats } = useChatStore();
  const { joinRoom, emitTyping, emitStopTyping, emitNewMessage } = useSocketStore();

  const isTyping = selectedChat ? (typingChats[selectedChat._id] ?? false) : false;

  // ── Join socket room whenever the selected chat changes ─────────────────────
  useEffect(() => {
    if (selectedChat) joinRoom(selectedChat._id);
  }, [selectedChat, joinRoom]);

  // ── Fetch messages ─────────────────────────────────────────────────────────
  const {
    data: messages = [],
    isLoading,
  } = useQuery({
    queryKey: queryKeys.messages.list(selectedChat?._id ?? ""),
    queryFn: () => fetchMessages(selectedChat!._id),
    enabled: !!selectedChat,
  });

  // ── Send message mutation ──────────────────────────────────────────────────
  const { mutate: doSendMessage } = useMutation({
    mutationFn: sendMessage,
    onSuccess: (newMsg) => {
      // Optimistically append to cache instead of full refetch
      queryClient.setQueryData<Message[]>(
        queryKeys.messages.list(selectedChat!._id),
        (old = []) => [...old, newMsg]
      );
      // Broadcast to other participants via socket
      emitNewMessage(newMsg);
      // Invalidate chat list so "latest message" preview updates
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.all() });
    },
    onError: () =>
      toast({ title: "Failed to send message", status: "error", duration: 5000, isClosable: true, position: "bottom" }),
  });

  const sendHandler = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== "Enter" || !newMessage.trim() || !selectedChat) return;
    emitStopTyping(selectedChat._id);
    const content = newMessage.trim();
    setNewMessage(""); // clear before mutation — prevent double-send on slow networks
    doSendMessage({ content, chatId: selectedChat._id });
  };

  const typingHandler = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setNewMessage(e.target.value);
    if (!selectedChat) return;
    if (!typing) {
      setTyping(true);
      emitTyping(selectedChat._id);
    }
    const lastTypingTime = Date.now();
    setTimeout(() => {
      if (Date.now() - lastTypingTime >= 3000 && typing) {
        emitStopTyping(selectedChat._id);
        setTyping(false);
      }
    }, 3000);
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!selectedChat) {
    return (
      <Box
        display="flex" flexDir="column"
        alignItems="center" justifyContent="center"
        h="100%" gap={3} bg="bg-app"
      >
        <Text fontSize="5xl">💬</Text>
        <Text color="text-secondary" fontSize="md" fontWeight="medium">
          Select a conversation to start chatting
        </Text>
        <Text color="text-disabled" fontSize="sm">Your messages are waiting</Text>
      </Box>
    );
  }

  const chatPartner = !selectedChat.isGroupChat
    ? getSenderFull(user!, selectedChat.users)
    : null;

  return (
    <Box display="flex" flexDir="column" w="100%" h="100%">

      {/* ── Chat Header ─────────────────────────────────────────────────── */}
      <Box
        display="flex" alignItems="center" justifyContent="space-between"
        px={{ base: 2, md: 4 }} py={3}
        bg="bg-surface"
        borderBottom="1px solid" borderColor="border-subtle"
        gap={2}
      >
        <Box display="flex" alignItems="center" gap={{ base: 2, md: 3 }} minW={0} flex="1" overflow="hidden">
          <IconButton
            aria-label="Back"
            display={{ base: "flex", md: "none" }}
            icon={<ArrowBackIcon />}
            variant="nav" size="sm" flexShrink={0}
            onClick={() => setSelectedChat(null)}
          />
          <Avatar
            size="sm"
            name={selectedChat.isGroupChat ? selectedChat.chatName : chatPartner?.name}
            src={chatPartner?.picture ?? undefined}
            bg="accent" flexShrink={0}
          />
          <Box minW={0} overflow="hidden">
            <Text fontWeight="bold" color="text-primary" fontSize="md" lineHeight="1.2" isTruncated>
              {selectedChat.isGroupChat ? selectedChat.chatName : chatPartner?.name}
            </Text>
            {!selectedChat.isGroupChat ? (
              <Text fontSize="11px" color="online" fontWeight="medium">● Online</Text>
            ) : (
              <Text fontSize="11px" color="text-secondary">
                {selectedChat.users.length} members
              </Text>
            )}
          </Box>
        </Box>

        <Box flexShrink={0}>
          {selectedChat.isGroupChat
            ? <UpdateGroupChatModal
                fetchMessages={() => queryClient.invalidateQueries({ queryKey: queryKeys.messages.list(selectedChat._id) })}
                fetchAgain={fetchAgain}
                setFetchAgain={setFetchAgain}
              />
            : <ProfileModal user={chatPartner!} />
          }
        </Box>
      </Box>

      {/* ── Messages Area ───────────────────────────────────────────────── */}
      <Box flex="1" overflowY="hidden" px={2} py={2} bg="bg-app">
        {isLoading ? (
          <Box display="flex" h="100%" alignItems="center" justifyContent="center">
            <Spinner size="xl" color="accent" thickness="3px" />
          </Box>
        ) : (
          <Box
            className="messages" h="100%" overflowY="auto"
            sx={{
              "&::-webkit-scrollbar": { width: "3px" },
              "&::-webkit-scrollbar-thumb": { bg: "accent", borderRadius: "full" },
            }}
          >
            <ScrollableChat messages={messages} />
          </Box>
        )}
      </Box>

      {/* ── Typing Indicator ────────────────────────────────────────────── */}
      {isTyping && (
        <Box px={4} py={1}>
          <Player
            autoplay loop speed={1.5}
            src="https://assets7.lottiefiles.com/packages/lf20_qVvEd0.json"
            style={{ height: "36px", width: "60px" }}
          />
        </Box>
      )}

      {/* ── Message Input ───────────────────────────────────────────────── */}
      <Box px={{ base: 2, md: 4 }} py={3} bg="bg-surface" borderTop="1px solid" borderColor="border-subtle">
        <FormControl onKeyDown={sendHandler}>
          <InputGroup size="md">
            <Input
              placeholder="Message..."
              value={newMessage}
              onChange={typingHandler}
              bg="bg-input" border="1px solid" borderColor="border-subtle"
              color="text-primary" borderRadius="full" pr="3rem"
              _placeholder={{ color: "text-disabled" }}
              _focus={{ borderColor: "accent", boxShadow: "0 0 0 1px #E1306C" }}
              px={5}
            />
            <InputRightElement>
              <IconButton
                aria-label="Attach file" icon={<AttachmentIcon />}
                size="sm" variant="ghost" color="text-secondary"
                borderRadius="full" _hover={{ color: "accent" }} isDisabled
              />
            </InputRightElement>
          </InputGroup>
          <Text display={{ base: "none", md: "block" }} fontSize="10px" color="text-disabled" mt={1} textAlign="center">
            Press Enter to send
          </Text>
        </FormControl>
      </Box>

    </Box>
  );
};

export default SingleChat;
