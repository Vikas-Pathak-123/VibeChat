import { useDisclosure } from "@chakra-ui/hooks";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import { Menu, MenuButton, MenuDivider, MenuItem, MenuList } from "@chakra-ui/menu";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerOverlay } from "@chakra-ui/modal";
import { Tooltip } from "@chakra-ui/tooltip";
import { BellIcon, ChevronDownIcon, SearchIcon } from "@chakra-ui/icons";
import { Avatar } from "@chakra-ui/avatar";
import { Badge, Button, IconButton, Spinner, useToast } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import ChatLoading from "../shared/ChatLoading";
import ProfileModal from "./ProfileModal";
import { getSender } from "../../config/ChatLogics";
import UserListItem from "../userAvatar/UserListItem";
import { useChatState } from "../../context/ChatProvider";
import ThemeToggle from "../shared/ThemeToggle";
import { API_BASE_URL } from "../../constants/api.constants";
import { User } from "../../types";

const SideDrawer: React.FC = () => {
  const [search, setSearch]           = useState<string>("");
  const [searchResult, setSearchResult] = useState<User[]>([]);
  const [loading, setLoading]         = useState<boolean>(false);
  const [loadingChat, setLoadingChat] = useState<boolean>(false);

  const { setSelectedChat, user, notification, setNotification, chats, setChats } = useChatState();
  const toast    = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();

  const logoutHandler = (): void => {
    localStorage.removeItem("userInfo");
    navigate("/");
  };

  const handleSearch = async (): Promise<void> => {
    if (!search) {
      toast({ title: "Please enter something to search", status: "warning", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE_URL}/api/user?search=${search}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setSearchResult(data);
    } catch {
      toast({ title: "Failed to load search results", status: "error", duration: 5000, isClosable: true, position: "top" });
    } finally {
      setLoading(false);
    }
  };

  const accessChat = async (userId: string): Promise<void> => {
    try {
      setLoadingChat(true);
      const { data } = await axios.post(
        `${API_BASE_URL}/api/chat`,
        { userId },
        { headers: { "Content-type": "application/json", Authorization: `Bearer ${user?.token}` } }
      );
      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      onClose();
    } catch (error: any) {
      toast({ title: "Error fetching chat", description: error.message, status: "error", duration: 5000, isClosable: true, position: "top" });
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <>
      <Box
        display="flex" justifyContent="space-between" alignItems="center"
        w="100%" px={4} py={2}
        bg="bg-surface" borderBottom="1px solid" borderColor="border-subtle"
      >
        {/* Search */}
        <Tooltip label="Search Users" hasArrow placement="bottom-end">
          <Button
            variant="nav" size="sm" onClick={onOpen}
            leftIcon={<SearchIcon fontSize="11px" />}
            border="1px solid" borderColor="border-subtle"
          >
            <Text display={{ base: "none", md: "flex" }} fontSize="sm">Search</Text>
          </Button>
        </Tooltip>

        {/* Brand */}
        <Text fontSize="xl" fontWeight="bold" bgGradient="linear(to-r, #833AB4, #E1306C, #F77737)" bgClip="text" letterSpacing="wider">
          💬 VibeChat
        </Text>

        {/* Right — Theme Toggle + Bell + Profile */}
        <Box display="flex" alignItems="center" gap={2}>
          <ThemeToggle />

          {/* Notifications */}
          <Menu>
            <MenuButton position="relative">
              <IconButton aria-label="Notifications" icon={<BellIcon fontSize="lg" />}
                variant="nav" size="sm" color="text-secondary">
                {notification.length > 0 && (
                  <Badge position="absolute" top="-1" right="-1"
                    colorScheme="red" borderRadius="full" fontSize="9px" w="16px" h="16px"
                    display="flex" alignItems="center" justifyContent="center">
                    {notification.length}
                  </Badge>
                )}
              </IconButton>
            </MenuButton>
            <MenuList>
              {!notification.length && <MenuItem>🔔 No new messages</MenuItem>}
              {notification.map((notif) => (
                <MenuItem key={notif._id}
                  onClick={() => { setSelectedChat(notif.chat); setNotification(notification.filter((n) => n !== notif)); }}>
                  {notif.chat.isGroupChat
                    ? `📢 ${notif.chat.chatName}`
                    : `💬 ${getSender(user!, notif.chat.users)}`}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          {/* Profile */}
          <Menu>
            <MenuButton as={Button} size="sm" variant="nav"
              rightIcon={<ChevronDownIcon />}
              border="1px solid" borderColor="border-subtle" px={2}>
              <Avatar size="xs" name={user?.name} src={user?.picture} />
            </MenuButton>
            <MenuList>
              <ProfileModal user={user!}>
                <MenuItem>👤 My Profile</MenuItem>
              </ProfileModal>
              <MenuDivider />
              <MenuItem color="accent" onClick={logoutHandler}>🚪 Logout</MenuItem>
            </MenuList>
          </Menu>
        </Box>
      </Box>

      {/* Search Drawer */}
      <Drawer placement="left" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay backdropFilter="blur(4px)" />
        <DrawerContent bg="bg-surface">
          <DrawerHeader borderBottomWidth="1px" borderColor="border-subtle" color="text-primary">
            🔍 Search Users
          </DrawerHeader>
          <DrawerBody pt={4}>
            <Box display="flex" pb={4} gap={2}>
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} flexShrink={0}>Go</Button>
            </Box>
            {loading ? <ChatLoading /> : searchResult.map((u) => (
              <UserListItem key={u._id} user={u} handleFunction={() => accessChat(u._id)} />
            ))}
            {loadingChat && <Spinner display="flex" mx="auto" color="accent" />}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default SideDrawer;
