import { FormControl } from "@chakra-ui/form-control";
import { Box, Text } from "@chakra-ui/layout";
import {
  Avatar, IconButton, Input, InputGroup,
  InputRightElement, Spinner, useToast,
} from "@chakra-ui/react";
import { ArrowBackIcon, AttachmentIcon } from "@chakra-ui/icons";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import { Player } from "@lottiefiles/react-lottie-player";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useChatState } from "../context/ChatProvider";
import { API_BASE_URL, SOCKET_ENDPOINT } from "../constants/api.constants";
import { Message } from "../types";
import ScrollableChat from "./ScrollableChat";
import ProfileModal from "./miscellaneous/ProfileModal";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";

interface SingleChatProps {
  fetchAgain: boolean;
  setFetchAgain: React.Dispatch<React.SetStateAction<boolean>>;
}

// Tracks chat outside React state to avoid stale closure in socket listener
let selectedChatCompare: any;

const SingleChat: React.FC<SingleChatProps> = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages]               = useState<Message[]>([]);
  const [loading, setLoading]                 = useState<boolean>(false);
  const [newMessage, setNewMessage]           = useState<string>("");
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [typing, setTyping]                   = useState<boolean>(false);
  const [isTyping, setIsTyping]               = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const toast     = useToast();
  const { selectedChat, setSelectedChat, user, notification, setNotification } = useChatState();

  // ── Socket initialisation ──────────────────────────────────────────────────
  useEffect(() => {
    socketRef.current = io(SOCKET_ENDPOINT);
    socketRef.current.emit("setup", user);
    socketRef.current.on("connected",    () => setSocketConnected(true));
    socketRef.current.on("typing",       () => setIsTyping(true));
    socketRef.current.on("stop typing",  () => setIsTyping(false));
    return () => { socketRef.current?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch messages when chat changes ──────────────────────────────────────
  useEffect(() => {
    fetchMessages();
    selectedChatCompare = selectedChat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  // ── Incoming message listener ─────────────────────────────────────────────
  useEffect(() => {
    socketRef.current?.on("message recieved", (newMsg: Message) => {
      if (!selectedChatCompare || selectedChatCompare._id !== newMsg.chat._id) {
        if (!notification.includes(newMsg)) {
          setNotification([newMsg, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages((prev) => [...prev, newMsg]);
      }
    });
  });

  const fetchMessages = async (): Promise<void> => {
    if (!selectedChat) return;
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${API_BASE_URL}/api/message/${selectedChat._id}`,
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      setMessages(data);
      socketRef.current?.emit("join chat", selectedChat._id);
    } catch {
      toast({ title: "Failed to load messages", status: "error", duration: 5000, isClosable: true, position: "bottom" });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.KeyboardEvent<HTMLInputElement>): Promise<void> => {
    if (e.key !== "Enter" || !newMessage.trim()) return;
    socketRef.current?.emit("stop typing", selectedChat?._id);
    const content = newMessage.trim();
    setNewMessage("");
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/message`,
        { content, chatId: selectedChat?._id },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      socketRef.current?.emit("new message", data);
      setMessages((prev) => [...prev, data]);
    } catch {
      toast({ title: "Failed to send message", status: "error", duration: 5000, isClosable: true, position: "bottom" });
    }
  };

  const typingHandler = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setNewMessage(e.target.value);
    if (!socketConnected) return;
    if (!typing) {
      setTyping(true);
      socketRef.current?.emit("typing", selectedChat?._id);
    }
    const lastTypingTime = new Date().getTime();
    setTimeout(() => {
      const timeDiff = new Date().getTime() - lastTypingTime;
      if (timeDiff >= 3000 && typing) {
        socketRef.current?.emit("stop typing", selectedChat?._id);
        setTyping(false);
      }
    }, 3000);
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!selectedChat) {
    return (
      <Box
        display="flex"
        flexDir="column"
        alignItems="center"
        justifyContent="center"
        h="100%"
        gap={3}
        bg="bg-app"
      >
        <Text fontSize="5xl">💬</Text>
        <Text color="text-secondary" fontSize="md" fontWeight="medium">
          Select a conversation to start chatting
        </Text>
        <Text color="text-disabled" fontSize="sm">
          Your messages are waiting
        </Text>
      </Box>
    );
  }

  const chatPartner = !selectedChat.isGroupChat
    ? getSenderFull(user!, selectedChat.users)
    : null;

  return (
    <Box display="flex" flexDir="column" w="100%" h="100%">

      {/* ── Chat Header ──────────────────────────────────────────────────── */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={4}
        py={3}
        bg="bg-surface"
        borderBottom="1px solid"
        borderColor="border-subtle"
      >
        <Box display="flex" alignItems="center" gap={3}>
          {/* Back button — mobile only */}
          <IconButton
            aria-label="Back"
            display={{ base: "flex", md: "none" }}
            icon={<ArrowBackIcon />}
            variant="nav"
            size="sm"
            onClick={() => setSelectedChat(null)}
          />

          {/* Avatar + name */}
          <Avatar
            size="sm"
            name={selectedChat.isGroupChat ? selectedChat.chatName : chatPartner?.name}
            src={chatPartner?.picture}
            bg="accent"
          />
          <Box>
            <Text fontWeight="bold" color="text-primary" fontSize="md" lineHeight="1.2">
              {selectedChat.isGroupChat
                ? selectedChat.chatName
                : chatPartner?.name}
            </Text>
            {/* Online status line — 1:1 chats only */}
            {!selectedChat.isGroupChat && (
              <Text fontSize="11px" color="online" fontWeight="medium">● Online</Text>
            )}
            {selectedChat.isGroupChat && (
              <Text fontSize="11px" color="text-secondary">
                {selectedChat.users.length} members
              </Text>
            )}
          </Box>
        </Box>

        {/* Profile / group settings */}
        {selectedChat.isGroupChat
          ? <UpdateGroupChatModal
              fetchMessages={fetchMessages}
              fetchAgain={fetchAgain}
              setFetchAgain={setFetchAgain}
            />
          : <ProfileModal user={chatPartner!} />
        }
      </Box>

      {/* ── Messages Area ────────────────────────────────────────────────── */}
      <Box flex="1" overflowY="hidden" px={2} py={2} bg="bg-app">
        {loading ? (
          <Box display="flex" h="100%" alignItems="center" justifyContent="center">
            <Spinner size="xl" color="accent" thickness="3px" />
          </Box>
        ) : (
          <Box className="messages" h="100%" overflowY="auto"
            sx={{
              "&::-webkit-scrollbar": { width: "3px" },
              "&::-webkit-scrollbar-thumb": { bg: "accent", borderRadius: "full" },
            }}
          >
            <ScrollableChat messages={messages} />
          </Box>
        )}
      </Box>

      {/* ── Typing Indicator ─────────────────────────────────────────────── */}
      {isTyping && (
        <Box px={4} py={1}>
          <Player
            autoplay loop speed={1.5}
            src="https://assets7.lottiefiles.com/packages/lf20_qVvEd0.json"
            style={{ height: "36px", width: "60px" }}
          />
        </Box>
      )}

      {/* ── Message Input ────────────────────────────────────────────────── */}
      <Box
        px={4}
        py={3}
        bg="bg-surface"
        borderTop="1px solid"
        borderColor="border-subtle"
      >
        <FormControl onKeyDown={sendMessage}>
          <InputGroup size="md">
            <Input
              placeholder="Message..."
              value={newMessage}
              onChange={typingHandler}
              bg="bg-input"
              border="1px solid"
              borderColor="border-subtle"
              color="text-primary"
              borderRadius="full"
              pr="3rem"
              _placeholder={{ color: "text-disabled" }}
              _focus={{ borderColor: "accent", boxShadow: "0 0 0 1px #E1306C" }}
              px={5}
            />
            <InputRightElement>
              <IconButton
                aria-label="Attach file"
                icon={<AttachmentIcon />}
                size="sm"
                variant="ghost"
                color="text-secondary"
                borderRadius="full"
                _hover={{ color: "accent" }}
                isDisabled
              />
            </InputRightElement>
          </InputGroup>
          <Text fontSize="10px" color="text-disabled" mt={1} textAlign="center">
            Press Enter to send
          </Text>
        </FormControl>
      </Box>

    </Box>
  );
};

export default SingleChat;
