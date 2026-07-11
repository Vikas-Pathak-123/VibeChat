import { ViewIcon } from "@chakra-ui/icons";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, Button, useDisclosure, FormControl,
  Input, useToast, Box, IconButton, Spinner,
} from "@chakra-ui/react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import UserBadgeItem from "../userAvatar/UserBadgeItem";
import UserListItem from "../userAvatar/UserListItem";
import { User } from "../../types";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import {
  searchUsers,
  renameGroupChat,
  addToGroupChat,
  removeFromGroupChat,
  queryClient,
  queryKeys,
} from "../../store";

interface UpdateGroupChatModalProps {
  fetchMessages: () => void;
  fetchAgain: boolean;
  setFetchAgain: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * UpdateGroupChatModal — Rename group, add/remove members, leave group.
 *
 * Server state:
 *   - useMutation(searchUsers) — on-demand user search
 *   - useMutation(renameGroupChat) — rename
 *   - useMutation(addToGroupChat) — add member
 *   - useMutation(removeFromGroupChat) — remove / leave
 *
 * On success: invalidates chats list + messages for the chat.
 * No useChatState. No direct axios.
 */
const UpdateGroupChatModal: React.FC<UpdateGroupChatModalProps> = ({
  fetchMessages,
  fetchAgain: _fetchAgain,
  setFetchAgain: _setFetchAgain,
}) => {
  const { isOpen, onOpen, onClose }         = useDisclosure();
  const [groupChatName, setGroupChatName]   = useState<string>("");
  const [searchResult, setSearchResult]     = useState<User[]>([]);
  const toast                               = useToast();
  const { user }                            = useAuthStore();
  const { selectedChat, setSelectedChat }   = useChatStore();

  // ── Search ─────────────────────────────────────────────────────────────────
  const { mutate: doSearch, isPending: searchLoading } = useMutation({
    mutationFn: (query: string) => searchUsers(query),
    onSuccess: (data) => setSearchResult(data),
    onError: () =>
      toast({ title: "Failed to load results", status: "error", duration: 5000, isClosable: true, position: "top" }),
  });

  // ── Rename ─────────────────────────────────────────────────────────────────
  const { mutate: doRename, isPending: renameLoading } = useMutation({
    mutationFn: renameGroupChat,
    onSuccess: (updated) => {
      setSelectedChat(updated);
      setGroupChatName("");
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.all() });
    },
    onError: (error: Error) =>
      toast({ title: "Rename failed", description: error.message, status: "error", duration: 5000, isClosable: true, position: "bottom" }),
  });

  // ── Add member ─────────────────────────────────────────────────────────────
  const { mutate: doAdd, isPending: addLoading } = useMutation({
    mutationFn: addToGroupChat,
    onSuccess: (updated) => {
      setSelectedChat(updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.all() });
    },
    onError: (error: Error) =>
      toast({ title: "Failed to add user", description: error.message, status: "error", duration: 5000, isClosable: true, position: "bottom" }),
  });

  // ── Remove member / leave ──────────────────────────────────────────────────
  const { mutate: doRemove, isPending: removeLoading } = useMutation({
    mutationFn: removeFromGroupChat,
    onSuccess: (updated) => {
      // If removing self → close chat
      if (updated.users.find((u: User) => u._id === user?._id) === undefined) {
        setSelectedChat(null);
      } else {
        setSelectedChat(updated);
      }
      fetchMessages();
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.all() });
    },
    onError: (error: Error) =>
      toast({ title: "Failed to remove user", description: error.message, status: "error", duration: 5000, isClosable: true, position: "bottom" }),
  });

  const handleAddUser = (userToAdd: User): void => {
    if (selectedChat?.users.find((u) => u._id === userToAdd._id)) {
      toast({ title: "User already in group", status: "warning", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    if (selectedChat?.groupAdmin?._id !== user?._id) {
      toast({ title: "Only admins can add members", status: "error", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    doAdd({ chatId: selectedChat!._id, userId: userToAdd._id });
  };

  const handleRemove = (userToRemove: User): void => {
    if (selectedChat?.groupAdmin?._id !== user?._id && userToRemove._id !== user?._id) {
      toast({ title: "Only admins can remove members", status: "error", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    doRemove({ chatId: selectedChat!._id, userId: userToRemove._id });
  };

  const mutating = addLoading || removeLoading;

  return (
    <>
      <IconButton aria-label="Update group" icon={<ViewIcon />} onClick={onOpen} variant="nav" size="sm" />
      <Modal onClose={onClose} isOpen={isOpen} isCentered size={{ base: "xs", sm: "md" }}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent mx={4} maxH="85vh">
          <ModalHeader textAlign="center" fontSize={{ base: "md", sm: "lg" }}>{selectedChat?.chatName}</ModalHeader>
          <ModalCloseButton />
          <ModalBody display="flex" flexDir="column" gap={3} overflowY="auto">
            {/* Current Members */}
            <Box display="flex" flexWrap="wrap">
              {selectedChat?.users.map((u) => (
                <UserBadgeItem
                  key={u._id} user={u}
                  admin={selectedChat.groupAdmin}
                  handleFunction={() => handleRemove(u)}
                />
              ))}
            </Box>

            {/* Rename */}
            <FormControl display="flex" flexDir={{ base: "column", sm: "row" }} gap={2}>
              <Input
                placeholder="New group name"
                value={groupChatName}
                onChange={(e) => setGroupChatName(e.target.value)}
              />
              <Button
                isLoading={renameLoading} flexShrink={0} px={6}
                w={{ base: "100%", sm: "auto" }}
                onClick={() => selectedChat && doRename({ chatId: selectedChat._id, chatName: groupChatName })}
              >
                Rename
              </Button>
            </FormControl>

            {/* Add Member */}
            <FormControl>
              <Input
                placeholder="Search users to add..."
                onChange={(e) => e.target.value ? doSearch(e.target.value) : setSearchResult([])}
              />
            </FormControl>
            {searchLoading
              ? <Spinner color="accent" mx="auto" />
              : searchResult.map((u) => (
                  <UserListItem key={u._id} user={u} handleFunction={() => handleAddUser(u)} />
                ))
            }
            {mutating && <Spinner color="accent" mx="auto" size="sm" />}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red" variant="outline"
              isLoading={removeLoading}
              onClick={() => user && handleRemove(user as User)}
            >
              Leave Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default UpdateGroupChatModal;
