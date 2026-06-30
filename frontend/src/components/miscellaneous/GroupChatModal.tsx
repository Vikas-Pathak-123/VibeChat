import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, Button, useDisclosure, FormControl,
  Input, useToast, Box, Spinner,
} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";
import { useChatState } from "../../context/ChatProvider";
import UserBadgeItem from "../userAvatar/UserBadgeItem";
import UserListItem from "../userAvatar/UserListItem";
import { API_BASE_URL } from "../../constants/api.constants";
import { User } from "../../types";

interface GroupChatModalProps {
  children: React.ReactNode;
}

const GroupChatModal: React.FC<GroupChatModalProps> = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchResult, setSearchResult]   = useState<User[]>([]);
  const [loading, setLoading]             = useState<boolean>(false);
  const toast = useToast();
  const { user, chats, setChats } = useChatState();

  const handleSearch = async (query: string): Promise<void> => {
    if (!query) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE_URL}/api/user?search=${query}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setSearchResult(data);
    } catch {
      toast({ title: "Failed to load search results", status: "error", duration: 5000, isClosable: true, position: "top" });
    } finally {
      setLoading(false);
    }
  };

  const handleGroup = (userToAdd: User): void => {
    if (selectedUsers.find((u) => u._id === userToAdd._id)) {
      toast({ title: "User already added", status: "warning", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    setSelectedUsers((prev) => [...prev, userToAdd]);
  };

  const handleDelete = (userToRemove: User): void => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userToRemove._id));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!groupChatName || selectedUsers.length === 0) {
      toast({ title: "Please fill all fields", status: "warning", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/chat/group`,
        { name: groupChatName, users: JSON.stringify(selectedUsers.map((u) => u._id)) },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      setChats([data, ...chats]);
      onClose();
      toast({ title: "Group chat created! 🎉", status: "success", duration: 4000, isClosable: true, position: "bottom" });
    } catch (error) {
      let message = "An unexpected error occurred";
      if (axios.isAxiosError(error)) {
        // Safe check for string or object data
        message = typeof error.response?.data === "string" 
          ? error.response.data 
          : (error.response?.data?.message || error.message);
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast({ title: "Failed to create group", description: message, status: "error", duration: 5000, isClosable: true, position: "bottom" });
    }
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
                onChange={(e) => handleSearch(e.target.value)}
              />
            </FormControl>
            <Box w="100%" display="flex" flexWrap="wrap">
              {selectedUsers.map((u) => (
                <UserBadgeItem key={u._id} user={u} handleFunction={() => handleDelete(u)} />
              ))}
            </Box>
            {loading
              ? <Spinner color="accent" />
              : searchResult.slice(0, 5).map((u) => (
                  <UserListItem key={u._id} user={u} handleFunction={() => handleGroup(u)} />
                ))
            }
          </ModalBody>
          <ModalFooter>
            <Button onClick={handleSubmit}>Create Group</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default GroupChatModal;
