import { AddIcon, SearchIcon } from "@chakra-ui/icons";
import { Box, Stack, Text } from "@chakra-ui/layout";
import { useToast } from "@chakra-ui/toast";
import axios from "axios";
import { Tooltip } from "@chakra-ui/tooltip";
import { useEffect, useState } from "react";
import { getSender } from "../config/ChatLogics";
import ChatLoading from "./ChatLoading";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import { Avatar, Badge, Button, Input, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider";

const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedChat, setSelectedChat, user, chats, setChats } = ChatState();
  const toast = useToast();

  const fetchChats = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get("https://vibechat-177v.onrender.com/api/chat", config);
      setChats(data);
    } catch (error) {
      toast({ title: "Error Occured!", description: "Failed to Load the chats", status: "error", duration: 5000, isClosable: true, position: "bottom-left" });
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    fetchChats();
    // eslint-disable-next-line
  }, [fetchAgain]);

  const filteredChats = chats
    ? chats.filter((chat) => {
        const name = chat.isGroupChat ? chat.chatName : getSender(loggedUser, chat.users);
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : [];

  return (
    <Box
      display={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      w={{ base: "100%", md: "31%" }}
      bg="rgba(255,255,255,0.05)"
      backdropFilter="blur(10px)"
      borderRadius="xl"
      border="1px solid rgba(255,255,255,0.1)"
      overflow="hidden"
    >
      {/* Header */}
      <Box
        px={4} py={3}
        borderBottom="1px solid rgba(255,255,255,0.1)"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        bg="rgba(255,255,255,0.03)"
      >
        <Text fontSize="lg" fontWeight="bold" color="white" letterSpacing="wide">
          💬 My Chats
        </Text>
        <GroupChatModal>
          <Tooltip label="New Group Chat" hasArrow placement="bottom-end">
            <Button
              size="sm"
              bgGradient="linear(to-r, #e94560, #0f3460)"
              color="white"
              borderRadius="lg"
              leftIcon={<AddIcon fontSize="10px" />}
              _hover={{ bgGradient: "linear(to-r, #c73652, #0a2a50)", transform: "translateY(-1px)" }}
              transition="all 0.2s"
            >
              <Text display={{ base: "none", md: "flex" }} fontSize="xs">New Group</Text>
            </Button>
          </Tooltip>
        </GroupChatModal>
      </Box>

      {/* Search Bar */}
      <Box px={3} py={3} borderBottom="1px solid rgba(255,255,255,0.07)">
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="whiteAlpha.400" fontSize="11px" />
          </InputLeftElement>
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg="rgba(255,255,255,0.07)"
            border="1px solid rgba(255,255,255,0.1)"
            color="white"
            borderRadius="lg"
            fontSize="sm"
            _placeholder={{ color: "whiteAlpha.400" }}
            _focus={{ borderColor: "#e94560", boxShadow: "0 0 0 1px #e94560", bg: "rgba(255,255,255,0.1)" }}
          />
        </InputGroup>
      </Box>

      {/* Chat List */}
      <Box flex="1" overflowY="auto" px={2} py={2}
        css={{
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: "rgba(233,69,96,0.4)", borderRadius: "10px" },
        }}
      >
        {chats ? (
          <Stack spacing={1}>
            {filteredChats.length === 0 && (
              <Text textAlign="center" color="whiteAlpha.400" fontSize="sm" mt={6}>
                {searchQuery ? "No chats found" : "No conversations yet"}
              </Text>
            )}
            {filteredChats.map((chat) => {
              const chatName = !chat.isGroupChat ? getSender(loggedUser, chat.users) : chat.chatName;
              const isSelected = selectedChat === chat;
              return (
                <Box
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  cursor="pointer"
                  display="flex"
                  alignItems="center"
                  gap={3}
                  px={3}
                  py={2}
                  borderRadius="lg"
                  bg={isSelected ? "rgba(233,69,96,0.15)" : "transparent"}
                  border={isSelected ? "1px solid rgba(233,69,96,0.4)" : "1px solid transparent"}
                  _hover={{ bg: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                  transition="all 0.15s"
                  position="relative"
                >
                  {/* Avatar with online dot */}
                  <Box position="relative" flexShrink={0}>
                    <Avatar
                      size="sm"
                      name={chatName}
                      bg={isSelected ? "#e94560" : "rgba(255,255,255,0.15)"}
                      color="white"
                      fontSize="xs"
                    />
                    {!chat.isGroupChat && (
                      <Box
                        position="absolute" bottom="0" right="0"
                        w="9px" h="9px" bg="#48BB78"
                        borderRadius="full" border="2px solid #1a1a2e"
                      />
                    )}
                  </Box>

                  {/* Chat info */}
                  <Box flex="1" overflow="hidden">
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Text
                        fontWeight={isSelected ? "bold" : "semibold"}
                        color={isSelected ? "white" : "whiteAlpha.900"}
                        fontSize="sm"
                        isTruncated
                        maxW="140px"
                      >
                        {chatName}
                      </Text>
                      {chat.isGroupChat && (
                        <Badge colorScheme="pink" fontSize="9px" px={1} borderRadius="md">
                          Group
                        </Badge>
                      )}
                    </Box>
                    {chat.latestMessage ? (
                      <Text fontSize="xs" color={isSelected ? "whiteAlpha.700" : "whiteAlpha.500"} isTruncated maxW="170px">
                        <b>{chat.latestMessage.sender.name.split(" ")[0]}:</b>{" "}
                        {chat.latestMessage.content.length > 35
                          ? chat.latestMessage.content.substring(0, 35) + "..."
                          : chat.latestMessage.content}
                      </Text>
                    ) : (
                      <Text fontSize="xs" color="whiteAlpha.400">No messages yet</Text>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <ChatLoading />
        )}
      </Box>
    </Box>
  );
};

export default MyChats;
