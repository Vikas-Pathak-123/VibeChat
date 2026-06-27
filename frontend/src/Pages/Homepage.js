import {
  Box,
  Container,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";

function Homepage() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));
    if (user) navigate("/chats");
  }, [navigate]);

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, #1a1a2e, #16213e, #0f3460)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <Container maxW="md" py={10}>
        {/* Brand Header */}
        <Box textAlign="center" mb={8}>
          <Text
            fontSize="4xl"
            fontWeight="bold"
            bgGradient="linear(to-r, #e94560, #0f3460)"
            bgClip="text"
            letterSpacing="widest"
          >
            💬 VibeChat
          </Text>
          <Text color="whiteAlpha.700" fontSize="sm" mt={1}>
            Connect. Chat. Vibe.
          </Text>
        </Box>

        {/* Auth Card */}
        <Box
          bg="whiteAlpha.100"
          backdropFilter="blur(16px)"
          borderRadius="2xl"
          border="1px solid"
          borderColor="whiteAlpha.200"
          p={8}
          boxShadow="0 8px 32px rgba(0,0,0,0.4)"
        >
          <Tabs isFitted variant="soft-rounded" colorScheme="pink">
            <TabList
              mb={6}
              bg="whiteAlpha.100"
              borderRadius="xl"
              p={1}
            >
              <Tab
                color="whiteAlpha.700"
                _selected={{
                  bg: "linear-gradient(to right, #e94560, #0f3460)",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                Login
              </Tab>
              <Tab
                color="whiteAlpha.700"
                _selected={{
                  bg: "linear-gradient(to right, #e94560, #0f3460)",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                Sign Up
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <Login />
              </TabPanel>
              <TabPanel px={0}>
                <Signup />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        <Text textAlign="center" color="whiteAlpha.400" fontSize="xs" mt={6}>
          © 2024 VibeChat · Made with ❤️ by Vikas Pathak
        </Text>
      </Container>
    </Box>
  );
}

export default Homepage;
