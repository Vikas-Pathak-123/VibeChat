import { FormControl } from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import { IconButton, Spinner, useToast } from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
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

let selectedChatCompare: any;

const SingleChat: React.FC<SingleChatProps> = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages]           = useState<Message[]>([]);
  const [loading, setLoading]             = useState<boolean>(false);
  const [newMessage, setNewMessage]       = useState<string>("");
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [typing, setTyping]               = useState<boolean>(false);
  const [isTyping, setIsTyping]           = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const toast = useToast();
  const { selectedChat, setSelectedChat, user, notification, setNotification } = useChatState();

  // Initialise socket once on mount
  useEffect(() => {
    socketRef.current = io(SOCKET_ENDPOINT);
    socketRef.current.emit("setup", user);
    socketRef.current.on("connected", () => setSocketConnected(true));
    socketRef.current.on("typing", () => setIsTyping(true));
    socketRef.current.on("stop typing", () => setIsTyping(false));

    return () => { socketRef.current?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch messages when selected chat changes
  useEffect(() => {
    fetchMessages();
    selectedChatCompare = selectedChat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  // Listen for incoming messages
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
      const { data } = await axios.get(`${API_BASE_URL}/api/message/${selectedChat._id}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setMessages(data);
      socketRef.current?.emit("join chat", selectedChat._id);
    } catch {
      toast({ title: "Failed to load messages", status: "error", duration: 5000, isClosable: true, position: "bottom" });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.KeyboardEvent<HTMLInputElement>): Promise<void> => {
    if (e.key !== "Enter" || !newMessage) return;
    socketRef.current?.emit("stop typing", selectedChat?._id);
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/message`,
        { content: newMessage, chatId: selectedChat?._id },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      setNewMessage("");
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
    const timerLength = 3000;
    setTimeout(() => {
      const timeDiff = new Date().getTime() - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socketRef.current?.emit("stop typing", selectedChat?._id);
        setTyping(false);
      }
    }, timerLength);
  };

  if (!selectedChat) {
    return (
      <Box display="flex" flexDir="column" alignItems="center" justifyContent="center" h="100%" gap={3}>
        <Text fontSize="4xl">💬</Text>
        <Text color="text-secondary" fontSize="md">Select a conversation to start chatting</Text>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDir="column" w="100%" h="100%">
      {/* Chat Header */}
      <Box
        display="flex" alignItems="center" justifyContent="space-between"
        px={4} py={3}
        borderBottom="1px solid" borderColor="border-subtle"
        bg="bg-surface"
      >
        <Box display="flex" alignItems="center" gap={3}>
          <IconButton
            aria-label="Back"
            display={{ base: "flex", md: "none" }}
            icon={<ArrowBackIcon />}
            variant="nav"
            size="sm"
            onClick={() => setSelectedChat(null)}
          />
          <Text fontWeight="bold" color="text-primary" fontSize="md">
            {selectedChat.isGroupChat
              ? selectedChat.chatName.toUpperCase()
              : getSender(user!, selectedChat.users)}
          </Text>
        </Box>
        {selectedChat.isGroupChat
          ? <UpdateGroupChatModal fetchMessages={fetchMessages} fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
          : <ProfileModal user={getSenderFull(user!, selectedChat.users)} />
        }
      </Box>

      {/* Messages Area */}
      <Box flex="1" overflowY="hidden" px={4} py={2} bg="bg-app">
        {loading
          ? <Spinner size="xl" display="flex" mx="auto" my="auto" color="accent" />
          : <Box className="messages" h="100%" overflowY="auto">
              <ScrollableChat messages={messages} />
            </Box>
        }
      </Box>

      {/* Typing Indicator */}
      {isTyping && (
        <Box px={4}>
          <Player
            autoplay loop speed={1.5}
            src="https://assets7.lottiefiles.com/packages/lf20_qVvEd0.json"
            style={{ height: "40px", width: "70px" }}
          />
        </Box>
      )}

      {/* Message Input */}
      <Box px={4} py={3} borderTop="1px solid" borderColor="border-subtle" bg="bg-surface">
        <FormControl onKeyDown={sendMessage}>
          <Input
            placeholder="Message..."
            value={newMessage}
            onChange={typingHandler}
            bg="bg-input"
            border="1px solid"
            borderColor="border-subtle"
            color="text-primary"
            borderRadius="full"
            _placeholder={{ color: "text-disabled" }}
            _focus={{ borderColor: "accent", boxShadow: "0 0 0 1px #E1306C" }}
            px={5}
          />
        </FormControl>
      </Box>
    </Box>
  );
};

export default SingleChat;
