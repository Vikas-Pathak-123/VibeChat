import { useState } from "react";
import { Box, Spinner, Center } from "@chakra-ui/react";
import Chatbox from "../components/Chatbox";
import MyChats from "../components/MyChats";
import SideDrawer from "../components/miscellaneous/SideDrawer";
import { useChatState } from "../context/ChatProvider";

const Chatpage: React.FC = () => {
  const [fetchAgain, setFetchAgain] = useState<boolean>(false);
  const { user, isAuthLoading } = useChatState();

  // Wait until auth state is resolved from localStorage
  if (isAuthLoading) {
    return (
      <Center minH="100vh" bg="bg-app">
        <Spinner size="xl" color="accent" thickness="3px" />
      </Center>
    );
  }

  return (
    <Box minH="100vh" h="100vh" bg="bg-app" display="flex" flexDirection="column" overflow="hidden">
      {user && <SideDrawer />}
      <Box
        display="flex"
        justifyContent="space-between"
        w="100%"
        flex="1"
        minH={0}
        p={{ base: "6px", md: "10px" }}
        gap={{ base: 0, md: 3 }}
        overflow="hidden"
      >
        {user && <MyChats fetchAgain={fetchAgain} />}
        {user && <Chatbox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />}
      </Box>
    </Box>
  );
};

export default Chatpage;
