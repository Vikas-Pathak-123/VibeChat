import { useEffect, useState } from "react";
import { Box, Spinner, Center } from "@chakra-ui/react";
import { Navigate } from "react-router-dom";
import Chatbox from "../components/Chatbox";
import MyChats from "../components/MyChats";
import SideDrawer from "../components/miscellaneous/SideDrawer";
import { useAuthStore } from "../store/authStore";
import { useSocketStore } from "../store/socketStore";

/**
 * Chatpage — Main chat layout.
 *
 * Reads auth state from Zustand authStore.
 * isAuthLoading: true until the session has been restored from the refresh cookie.
 * Shows spinner meanwhile to prevent blank screen flash; once resolved with no
 * user (never logged in, logged out, or session expired) it redirects to "/".
 * Connects Socket.IO for a restored user — login connects it too, but a
 * page refresh restores the user without logging in.
 *
 * No useChatState. No ChatProvider dependency.
 */
const Chatpage: React.FC = () => {
  const [fetchAgain, setFetchAgain]     = useState<boolean>(false);
  const { user, isAuthLoading }         = useAuthStore();
  const { connect }                     = useSocketStore();

  useEffect(() => {
    if (user) connect(user);
  }, [user, connect]);

  if (isAuthLoading) {
    return (
      <Center minH="100vh" bg="bg-app">
        <Spinner size="xl" color="accent" thickness="3px" />
      </Center>
    );
  }

  if (!user) return <Navigate to="/" replace />;

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
