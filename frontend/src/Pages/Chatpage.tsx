import { useState } from "react";
import { Box, Spinner, Center } from "@chakra-ui/react";
import Chatbox from "../components/Chatbox";
import MyChats from "../components/MyChats";
import SideDrawer from "../components/miscellaneous/SideDrawer";
import { useChatState } from "../context/ChatProvider";

const Chatpage: React.FC = () => {
  const [fetchAgain, setFetchAgain] = useState<boolean>(false);
  const { user, isAuthLoading } = useChatState();

  // Wait until auth resolves from localStorage — prevents blank screen after login
  if (isAuthLoading) {
    return (
      <Center minH="100vh" bg="bg-app">
        <Spinner size="xl" color="accent" thickness="3px" />
      </Center>
    );
  }

  return (
    <Box minH="100vh" bg="bg-app" display="flex" flexDirection="column">
      {user && <SideDrawer />}
      <Box
        display="flex"
        justifyContent="space-between"
        w="100%"
        flex="1"
        p="10px"
        gap={3}
        overflow="hidden"
      >
        {user && <MyChats fetchAgain={fetchAgain} />}
        {user && <Chatbox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />}
      </Box>
    </Box>
  );
};

export default Chatpage;
