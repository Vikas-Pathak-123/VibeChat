import { Box } from "@chakra-ui/react";
import SingleChat from "./SingleChat";
import { useChatStore } from "../store/chatStore";

interface ChatboxProps {
  fetchAgain: boolean;
  setFetchAgain: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Chatbox — Right panel wrapper.
 * Reads selectedChat from useChatStore (Zustand) instead of useChatState.
 */
const Chatbox: React.FC<ChatboxProps> = ({ fetchAgain, setFetchAgain }) => {
  const { selectedChat } = useChatStore();

  return (
    <Box
      display={{ base: selectedChat ? "flex" : "none", md: "flex" }}
      alignItems="center"
      flexDir="column"
      bg="bg-surface"
      border="1px solid"
      borderColor="border-subtle"
      w={{ base: "100%", md: "68%" }}
      borderRadius="xl"
      overflow="hidden"
    >
      <SingleChat fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
    </Box>
  );
};

export default Chatbox;
