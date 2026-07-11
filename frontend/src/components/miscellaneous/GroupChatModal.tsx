import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, Button, useDisclosure, FormControl,
  Input, useToast, Box, Spinner,
} from "@chakra-ui/react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import UserBadgeItem from "../userAvatar/UserBadgeItem";
import UserListItem from "../userAvatar/UserListItem";
import { User } from "../../types";
import { useAuthStore } from "../../store/authStore";
import { searchUsers, createGroupChat, queryClient, queryKeys } from "../../store";

interface GroupChatModalProps {
  children: React.ReactNode;
}

/**
 * GroupChatModal — Create a new group chat.
 *
 * Server state:
 *   - useMutation(searchUsers) — on-demand user search
 *   - useMutation(createGroupChat) — create the group
 *
 * On success: invalidates queryKeys.chats.all() so sidebar refreshes.
 * No useChatState. No direct axios.
 */
const GroupChatModal: React.FC<GroupChatModalProps> = ({ children }) => {
  const { isOpen, onOpen, onClose }       = useDisclosure();
  const [groupChatName, setGroupChatName] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchResult, setSearchResult]   = useState<User[]>([]);
  const toast                             = useToast();
  const { user: _user }                   = useAuthStore();

  const { mutate: doSearch, isPending: searchLoading } = useMutation({
    mutationFn: (query: string) => searchUsers(query),
    onSuccess: (data) => setSearchResult(data),
    onError: () =>
      toast({ title: "Failed to load search results", status: "error", duration: 5000, isClosable: true, position: "top" }),
  });

  const { mutate: doCreate, isPending: createLoading } = useMutation({
    mutationFn: createGroupChat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.all() });
      onClose();
      setGroupChatName("");
      setSelectedUsers([]);
      toast({ title: "Group chat created! 🎉", status: "success", duration: 4000, isClosable: true, position: "bottom" });
    },
    onError: (error: Error) =>
      toast({ title: "Failed to create group", description: error.message, status: "error", duration: 5000, isClosable: true, position: "bottom" }),
  });

  const handleGroup = (userToAdd: User): void => {
    if (selectedUsers.find((u) => u._id === userToAdd._id)) {
      toast({ title: "User already added", status: "warning", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    setSelectedUsers((prev) => [...prev, userToAdd]);
  };

  const handleSubmit = (): void => {
    if (!groupChatName || selectedUsers.length === 0) {
      toast({ title: "Please fill all fields", status: "warning", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    doCreate({
      name: groupChatName,
      users: JSON.stringify(selectedUsers.map((u) => u._id)),
    });
  };

  return (
    <>
      <span onClick={onOpen}>{children}</span>
      <Modal onClose={onClose} isOpen={isOpen} isCentered size={{ base: "xs", sm: "md" }}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent mx={4} maxH="85vh">
          <ModalHeader textAlign="center" fontSize={{ base: "md", sm: "lg" }}>Create Group Chat</ModalHeader>
          <ModalCloseButton />
          <ModalBody display="flex" flexDir="column" alignItems="center" gap={3} overflowY="auto">
            <FormControl>
              <Input
                placeholder="Group name"
                value={groupChatName}
                onChange={(e) => setGroupChatName(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <Input
                placeholder="Search users to add..."
                onChange={(e) => e.target.value ? doSearch(e.target.value) : setSearchResult([])}
              />
            </FormControl>
            <Box w="100%" display="flex" flexWrap="wrap">
              {selectedUsers.map((u) => (
                <UserBadgeItem
                  key={u._id} user={u}
                  handleFunction={() => setSelectedUsers((prev) => prev.filter((s) => s._id !== u._id))}
                />
              ))}
            </Box>
            {searchLoading
              ? <Spinner color="accent" />
              : searchResult.slice(0, 5).map((u) => (
                  <UserListItem key={u._id} user={u} handleFunction={() => handleGroup(u)} />
                ))
            }
          </ModalBody>
          <ModalFooter>
            <Button onClick={handleSubmit} isLoading={createLoading} loadingText="Creating...">
              Create Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default GroupChatModal;
