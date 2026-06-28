import { useState } from "react";
import Chatbox from "../components/Chatbox";
import MyChats from "../components/MyChats";
import SideDrawer from "../components/miscellaneous/SideDrawer";
import { ChatState } from "../Context/ChatProvider";
import "../App.css";
import { Box } from "@chakra-ui/react";

const Chatpage = () => {
  const [fetchAgain, setFetchAgain] = useState(false);
  const { user } = ChatState();

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, #1a1a2e, #16213e, #0f3460)"
      display="flex"
      flexDirection="column"
    >
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
