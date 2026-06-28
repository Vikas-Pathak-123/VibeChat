import { Button } from "@chakra-ui/button";
import { useDisclosure } from "@chakra-ui/hooks";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import { Menu, MenuButton, MenuDivider, MenuItem, MenuList } from "@chakra-ui/menu";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerOverlay } from "@chakra-ui/modal";
import { Tooltip } from "@chakra-ui/tooltip";
import { BellIcon, ChevronDownIcon, SearchIcon } from "@chakra-ui/icons";
import { Avatar } from "@chakra-ui/avatar";
import { Badge } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { useToast } from "@chakra-ui/toast";
import ChatLoading from "../ChatLoading";
import { Spinner } from "@chakra-ui/spinner";
import ProfileModal from "./ProfileModal";
import { getSender } from "../../config/ChatLogics";
import UserListItem from "../userAvatar/UserListItem";
import { ChatState } from "../../Context/ChatProvider";

function SideDrawer() {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const { setSelectedChat, user, notification, setNotification, chats, setChats } = ChatState();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    navigate("/");
  };

  const handleSearch = async () => {
    if (!search) {
      toast({ title: "Please enter something to search", status: "warning", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`https://vibechat-177v.onrender.com/api/user?search=${search}`, config);
      setLoading(false);
      setSearchResult(data);
    } catch (error) {
      toast({ title: "Error Occured!", description: "Failed to Load Search Results", status: "error", duration: 5000, isClosable: true, position: "top" });
    }
  };

  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const config = { headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`https://vibechat-177v.onrender.com/api/chat`, { userId }, config);
      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      setLoadingChat(false);
      onClose();
    } catch (error) {
      toast({ title: "Error fetching the chat", description: error.message, status: "error", duration: 5000, isClosable: true, position: "top" });
    }
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        w="100%"
        px={4}
        py={2}
        bg="rgba(255,255,255,0.05)"
        backdropFilter="blur(10px)"
        borderBottom="1px solid rgba(255,255,255,0.1)"
      >
        {/* Search Button */}
        <Tooltip label="Search Users to chat" hasArrow placement="bottom-end">
          <Button
            variant="ghost"
            onClick={onOpen}
            color="whiteAlpha.700"
            leftIcon={<SearchIcon />}
            size="sm"
            borderRadius="lg"
            border="1px solid rgba(255,255,255,0.1)"
            _hover={{ bg: "rgba(255,255,255,0.1)", color: "white" }}
          >
            <Text display={{ base: "none", md: "flex" }} fontSize="sm">Search User</Text>
          </Button>
        </Tooltip>

        {/* Brand */}
        <Text
          fontSize="xl"
          fontWeight="bold"
          bgGradient="linear(to-r, #e94560, #a855f7)"
          bgClip="text"
          letterSpacing="wider"
        >
          💬 VibeChat
        </Text>

        {/* Right Side — Notifications + Profile */}
        <Box display="flex" alignItems="center" gap={2}>
          {/* Notification Bell */}
          <Menu>
            <MenuButton position="relative">
              <Button variant="ghost" size="sm" borderRadius="lg" color="whiteAlpha.700"
                _hover={{ bg: "rgba(255,255,255,0.1)", color: "white" }} p={2}>
                <BellIcon fontSize="lg" />
                {notification.length > 0 && (
                  <Badge
                    position="absolute" top="-1" right="-1"
                    colorScheme="red" borderRadius="full"
                    fontSize="9px" w="16px" h="16px"
                    display="flex" alignItems="center" justifyContent="center"
                  >
                    {notification.length}
                  </Badge>
                )}
              </Button>
            </MenuButton>
            <MenuList bg="#1a1a2e" border="1px solid rgba(255,255,255,0.1)" minW="220px">
              {!notification.length && (
                <MenuItem bg="transparent" color="whiteAlpha.500" fontSize="sm">
                  🔔 No new messages
                </MenuItem>
              )}
              {notification.map((notif) => (
                <MenuItem
                  key={notif._id}
                  bg="transparent"
                  color="whiteAlpha.800"
                  fontSize="sm"
                  _hover={{ bg: "rgba(233,69,96,0.15)" }}
                  onClick={() => { setSelectedChat(notif.chat); setNotification(notification.filter((n) => n !== notif)); }}
                >
                  {notif.chat.isGroupChat
                    ? `📢 New msg in ${notif.chat.chatName}`
                    : `💬 New msg from ${getSender(user, notif.chat.users)}`}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          {/* Profile Menu */}
          <Menu>
            <MenuButton as={Button} size="sm" variant="ghost" rightIcon={<ChevronDownIcon color="whiteAlpha.600" />}
              borderRadius="lg" border="1px solid rgba(255,255,255,0.1)"
              _hover={{ bg: "rgba(255,255,255,0.1)" }} px={2}>
              <Avatar size="xs" cursor="pointer" name={user.name} src={user.picture} />
            </MenuButton>
            <MenuList bg="#1a1a2e" border="1px solid rgba(255,255,255,0.1)">
              <ProfileModal user={user}>
                <MenuItem bg="transparent" color="whiteAlpha.800" _hover={{ bg: "rgba(255,255,255,0.07)" }} fontSize="sm">
                  👤 My Profile
                </MenuItem>
              </ProfileModal>
              <MenuDivider borderColor="rgba(255,255,255,0.1)" />
              <MenuItem bg="transparent" color="#e94560" _hover={{ bg: "rgba(233,69,96,0.1)" }} fontSize="sm" onClick={logoutHandler}>
                🚪 Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </Box>
      </Box>

      {/* Search Drawer */}
      <Drawer placement="left" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay backdropFilter="blur(4px)" />
        <DrawerContent bg="#1a1a2e" border="1px solid rgba(255,255,255,0.1)">
          <DrawerHeader color="white" borderBottomWidth="1px" borderColor="rgba(255,255,255,0.1)"
            bgGradient="linear(to-r, rgba(233,69,96,0.1), rgba(15,52,96,0.1))">
            🔍 Search Users
          </DrawerHeader>
          <DrawerBody pt={4}>
            <Box display="flex" pb={4} gap={2}>
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                bg="rgba(255,255,255,0.07)"
                border="1px solid rgba(255,255,255,0.1)"
                color="white"
                borderRadius="lg"
                _placeholder={{ color: "whiteAlpha.400" }}
                _focus={{ borderColor: "#e94560", boxShadow: "0 0 0 1px #e94560" }}
              />
              <Button
                onClick={handleSearch}
                bgGradient="linear(to-r, #e94560, #0f3460)"
                color="white"
                borderRadius="lg"
                _hover={{ bgGradient: "linear(to-r, #c73652, #0a2a50)" }}
                flexShrink={0}
              >
                Go
              </Button>
            </Box>
            {loading ? <ChatLoading /> : (
              searchResult?.map((user) => (
                <UserListItem key={user._id} user={user} handleFunction={() => accessChat(user._id)} />
              ))
            )}
            {loadingChat && <Spinner ml="auto" display="flex" color="#e94560" />}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default SideDrawer;
