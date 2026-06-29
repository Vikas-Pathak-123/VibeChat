import { ViewIcon } from "@chakra-ui/icons";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, Button, useDisclosure, FormControl,
  Input, useToast, Box, IconButton, Spinner,
} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";
import { useChatState } from "../../context/ChatProvider";
import UserBadgeItem from "../userAvatar/UserBadgeItem";
import UserListItem from "../userAvatar/UserListItem";
import { API_BASE_URL } from "../../constants/api.constants";
import { User } from "../../types";

interface UpdateGroupChatModalProps {
  fetchMessages: () => void;
  fetchAgain: boolean;
  setFetchAgain: React.Dispatch<React.SetStateAction<boolean>>;
}

const UpdateGroupChatModal: React.FC<UpdateGroupChatModalProps> = ({ fetchMessages, fetchAgain, setFetchAgain }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState<string>("");
  const [searchResult, setSearchResult]   = useState<User[]>([]);
  const [loading, setLoading]             = useState<boolean>(false);
  const [renameLoading, setRenameLoading] = useState<boolean>(false);
  const toast = useToast();
  const { selectedChat, setSelectedChat, user } = useChatState();

  const handleSearch = async (query: string): Promise<void> => {
    if (!query) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE_URL}/api/user?search=${query}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setSearchResult(data);
    } catch {
      toast({ title: "Failed to load results", status: "error", duration: 5000, isClosable: true, position: "top" });
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (): Promise<void> => {
    if (!groupChatName) return;
    try {
      setRenameLoading(true);
      const { data } = await axios.put(
        `${API_BASE_URL}/api/chat/rename`,
        { chatId: selectedChat?._id, chatName: groupChatName },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      setGroupChatName("");
    } catch (error) {
      let message = "An unexpected error occurred";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast({ title: "Rename failed", description: message, status: "error", duration: 5000, isClosable: true, position: "bottom" });
    } finally {
      setRenameLoading(false);
    }
  };

  const handleAddUser = async (userToAdd: User): Promise<void> => {
    if (selectedChat?.users.find((u) => u._id === userToAdd._id)) {
      toast({ title: "User already in group", status: "warning", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    if (selectedChat?.groupAdmin?._id !== user?._id) {
      toast({ title: "Only admins can add members", status: "error", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    try {
      setLoading(true);
      const { data } = await axios.put(
        `${API_BASE_URL}/api/chat/groupadd`,
        { chatId: selectedChat?._id, userId: userToAdd._id },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      setSelectedChat(data);
      setFetchAgain(!fetchAgain);
    } catch (error) {
      let message = "An unexpected error occurred";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast({ title: "Failed to add user", description: message, status: "error", duration: 5000, isClosable: true, position: "bottom" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userToRemove: User): Promise<void> => {
    if (selectedChat?.groupAdmin?._id !== user?._id && userToRemove._id !== user?._id) {
      toast({ title: "Only admins can remove members", status: "error", duration: 3000, isClosable: true, position: "top" });
      return;
    }
    try {
      setLoading(true);
      const { data } = await axios.put(
        `${API_BASE_URL}/api/chat/groupremove`,
        { chatId: selectedChat?._id, userId: userToRemove._id },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      userToRemove._id === user?._id ? setSelectedChat(null) : setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      fetchMessages();
    } catch (error) {
      let message = "An unexpected error occurred";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast({ title: "Failed to remove user", description: message, status: "error", duration: 5000, isClosable: true, position: "bottom" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <IconButton aria-label="Update group" icon={<ViewIcon />} onClick={onOpen} variant="nav" size="sm" />
      <Modal onClose={onClose} isOpen={isOpen} isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader textAlign="center">{selectedChat?.chatName}</ModalHeader>
          <ModalCloseButton />
          <ModalBody display="flex" flexDir="column" gap={3}>
            {/* Current Members */}
            <Box display="flex" flexWrap="wrap">
              {selectedChat?.users.map((u) => (
                <UserBadgeItem key={u._id} user={u} admin={selectedChat.groupAdmin} handleFunction={() => handleRemove(u)} />
              ))}
            </Box>
            {/* Rename */}
            <FormControl display="flex" gap={2}>
              <Input placeholder="New group name" value={groupChatName} onChange={(e) => setGroupChatName(e.target.value)} />
              <Button isLoading={renameLoading} onClick={handleRename} flexShrink={0} px={6}>Rename</Button>
            </FormControl>
            {/* Add Member */}
            <FormControl>
              <Input placeholder="Search users to add..." onChange={(e) => handleSearch(e.target.value)} />
            </FormControl>
            {loading ? <Spinner color="accent" mx="auto" /> : searchResult.map((u) => (
              <UserListItem key={u._id} user={u} handleFunction={() => handleAddUser(u)} />
            ))}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" variant="outline" onClick={() => handleRemove(user!)}>Leave Group</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default UpdateGroupChatModal;
