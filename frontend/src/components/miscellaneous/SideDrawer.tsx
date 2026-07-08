import { useDisclosure } from "@chakra-ui/hooks";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import { Menu, MenuButton, MenuDivider, MenuItem, MenuList } from "@chakra-ui/menu";
import {
  Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerOverlay,
  AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter,
  AlertDialogHeader, AlertDialogOverlay,
} from "@chakra-ui/modal";
import { Tooltip } from "@chakra-ui/tooltip";
import { BellIcon, ChevronDownIcon, SearchIcon } from "@chakra-ui/icons";
import { Avatar } from "@chakra-ui/avatar";
import { Badge, Button, IconButton, Spinner, useToast } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ChatLoading from "../shared/ChatLoading";
import ProfileModal from "./ProfileModal";
import { getSender } from "../../config/ChatLogics";
import UserListItem from "../userAvatar/UserListItem";
import ThemeToggle from "../shared/ThemeToggle";
import { User } from "../../types";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import { useSocketStore } from "../../store/socketStore";
import { searchUsers, accessOrCreateChat } from "../../store";
import { queryClient, queryKeys } from "../../store";

/**
 * SideDrawer — Top navigation bar + search drawer + logout dialog.
 *
 * State management:
 * - Auth user: useAuthStore (Zustand)
 * - Notifications / selectedChat: useChatStore (Zustand)
 * - User search: useMutation with searchUsers (TanStack Query — treated as
 *   mutation because it is triggered on demand, not on mount)
 * - Access chat: useMutation with accessOrCreateChat + cache invalidation
 * - Logout: useAuthStore.logout() + useSocketStore.disconnect()
 *
 * No useChatState. No direct axios.
 */
const SideDrawer: React.FC = () => {
  const [search, setSearch]             = useState<string>("");
  const [searchResult, setSearchResult] = useState<User[]>([]);

  const { user, logout }                        = useAuthStore();
  const { selectedChat, notifications,
          setSelectedChat, clearNotification }  = useChatStore();
  const { disconnect }                          = useSocketStore();
  const toast                                   = useToast();
  const navigate                                = useNavigate();

  const { isOpen: isSearchOpen, onOpen: onSearchOpen, onClose: onSearchClose } = useDisclosure();
  const { isOpen: isLogoutOpen, onOpen: onLogoutOpen, onClose: onLogoutClose } = useDisclosure();
  const cancelLogoutRef = useRef<HTMLButtonElement>(null);

  // Search mutation — on-demand, not a query
  const { mutate: doSearch, isPending: searchLoading } = useMutation({
    mutationFn: (query: string) => searchUsers(query),
    onSuccess: (data) => setSearchResult(data),
    onError: () =>
      toast({ title: "Failed to load search results", status: "error", duration: 5000, isClosable: true, position: "top" }),
  });

  // Access/create chat mutation
  const { mutate: openChat, isPending: chatLoading } = useMutation({
    mutationFn: (userId: string) => accessOrCreateChat(userId),
    onSuccess: (chat) => {
      setSelectedChat(chat);
      // Invalidate chat list so new chat appears in sidebar immediately
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.all() });
      onSearchClose();
    },
    onError: () =>
      toast({ title: "Error opening chat", status: "error", duration: 5000, isClosable: true, position: "top" }),
  });

  const handleSearch = (): void => {
    if (!search.trim()) {
      toast({ title: "Please enter something to search", status: "warning", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    doSearch(search);
  };

  const logoutHandler = (): void => {
    disconnect();  // close Socket.IO cleanly
    logout();      // clear Zustand + localStorage
    navigate("/");
  };

  return (
    <>
      {/* ── Top Navigation Bar ───────────────────────────────────── */}
      <Box
        display="flex" justifyContent="space-between" alignItems="center"
        w="100%" px={{ base: 2, md: 4 }} py={2}
        bg="bg-surface" borderBottom="1px solid" borderColor="border-subtle"
        flexShrink={0}
      >
        <Tooltip label="Search Users" hasArrow placement="bottom-end">
          <Button variant="nav" size="sm" onClick={onSearchOpen}
            px={{ base: 2, md: 4 }}
            leftIcon={<SearchIcon fontSize="11px" />}
            border="1px solid" borderColor="border-subtle" flexShrink={0}>
            <Text display={{ base: "none", md: "flex" }} fontSize="sm">Search</Text>
          </Button>
        </Tooltip>

        <Text
          fontSize={{ base: "md", sm: "lg", md: "xl" }} fontWeight="bold"
          bgGradient="linear(to-r, #833AB4, #E1306C, #F77737)"
          bgClip="text" letterSpacing="wider"
          isTruncated mx={2} flexShrink={1} minW={0}
        >
          💬 VibeChat
        </Text>

        <Box display="flex" alignItems="center" gap={{ base: 1, md: 2 }} flexShrink={0}>
          <Box display={{ base: "none", sm: "block" }}>
            <ThemeToggle />
          </Box>

          {/* Notification bell */}
          <Menu>
            <MenuButton as={Box} position="relative" cursor="pointer">
              <IconButton aria-label="Notifications" icon={<BellIcon fontSize="lg" />}
                variant="nav" size="sm" />
              {notifications.length > 0 && (
                <Badge position="absolute" top="-1" right="-1"
                  colorScheme="red" borderRadius="full" fontSize="9px"
                  w="16px" h="16px" display="flex" alignItems="center" justifyContent="center">
                  {notifications.length}
                </Badge>
              )}
            </MenuButton>
            <MenuList maxW="90vw">
              {!notifications.length && <MenuItem>🔔 No new messages</MenuItem>}
              {notifications.map((notif) => (
                <MenuItem key={notif._id} whiteSpace="normal"
                  onClick={() => {
                    setSelectedChat(notif.chat);
                    clearNotification(notif._id);
                  }}>
                  {notif.chat.isGroupChat
                    ? `📢 New message in ${notif.chat.chatName}`
                    : `💬 New message from ${getSender(user!, notif.chat.users)}`}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          {/* Profile menu */}
          <Menu>
            <MenuButton as={Button} size="sm" variant="nav"
              rightIcon={<ChevronDownIcon />}
              border="1px solid" borderColor="border-subtle" px={2}>
              <Avatar size="xs" name={user?.name} src={user?.picture} />
            </MenuButton>
            <MenuList>
              <Box display={{ base: "flex", sm: "none" }} px={3} py={1}
                justifyContent="space-between" alignItems="center">
                <Text fontSize="sm" color="text-secondary">Theme</Text>
                <ThemeToggle />
              </Box>
              <Box display={{ base: "block", sm: "none" }}><MenuDivider /></Box>
              <ProfileModal user={user!}>
                <MenuItem>👤 My Profile</MenuItem>
              </ProfileModal>
              <MenuDivider />
              <MenuItem color="red.400" onClick={onLogoutOpen}>🚪 Logout</MenuItem>
            </MenuList>
          </Menu>
        </Box>
      </Box>

      {/* ── Search Drawer ─────────────────────────────────────────── */}
      <Drawer placement="left" onClose={onSearchClose} isOpen={isSearchOpen}>
        <DrawerOverlay backdropFilter="blur(4px)" />
        <DrawerContent bg="bg-surface" maxW={{ base: "85vw", sm: "350px" }}>
          <DrawerHeader borderBottomWidth="1px" borderColor="border-subtle" color="text-primary">
            🔍 Search Users
          </DrawerHeader>
          <DrawerBody pt={4}>
            <Box display="flex" pb={4} gap={2}>
              <Input
                placeholder="Search by name or email..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} isLoading={searchLoading} flexShrink={0}>Go</Button>
            </Box>
            {searchLoading ? <ChatLoading /> : searchResult.map((u) => (
              <UserListItem key={u._id} user={u} handleFunction={() => openChat(u._id)} />
            ))}
            {chatLoading && <Spinner display="flex" mx="auto" color="accent" />}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* ── Logout Confirmation Dialog ────────────────────────────── */}
      <AlertDialog isOpen={isLogoutOpen} leastDestructiveRef={cancelLogoutRef}
        onClose={onLogoutClose} isCentered>
        <AlertDialogOverlay backdropFilter="blur(4px)">
          <AlertDialogContent bg="bg-surface" border="1px solid" borderColor="border-subtle"
            borderRadius="16px" mx={4} maxW={{ base: "90vw", sm: "400px" }}>
            <AlertDialogHeader color="text-primary" fontWeight="bold" fontSize="lg">
              Logout
            </AlertDialogHeader>
            <AlertDialogBody color="text-secondary">
              Are you sure you want to log out of VibeChat?
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={cancelLogoutRef} variant="nav"
                border="1px solid" borderColor="border-subtle" color="text-primary"
                onClick={onLogoutClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={logoutHandler}>Logout</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default SideDrawer;
