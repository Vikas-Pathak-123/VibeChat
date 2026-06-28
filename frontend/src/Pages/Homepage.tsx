import { Box, Container, Tab, TabList, TabPanel, TabPanels, Tabs, Text } from "@chakra-ui/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";
import ThemeToggle from "../components/shared/ThemeToggle";

const Homepage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem("userInfo");
    if (user) navigate("/chats");
  }, [navigate]);

  return (
    <Box minH="100vh" bg="bg-app" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Container maxW="md" py={10}>
        {/* Theme Toggle */}
        <Box display="flex" justifyContent="flex-end" mb={4}>
          <ThemeToggle />
        </Box>

        {/* Brand */}
        <Box textAlign="center" mb={8}>
          <Text
            fontSize="4xl" fontWeight="bold"
            bgGradient="linear(to-r, #833AB4, #E1306C, #F77737)"
            bgClip="text" letterSpacing="widest"
          >
            💬 VibeChat
          </Text>
          <Text color="text-secondary" fontSize="sm" mt={1}>Connect. Chat. Vibe.</Text>
        </Box>

        {/* Auth Card */}
        <Box
          bg="bg-surface" borderRadius="2xl"
          border="1px solid" borderColor="border-subtle"
          p={8} boxShadow="0 8px 32px rgba(0,0,0,0.12)"
        >
          <Tabs isFitted variant="soft-rounded" colorScheme="pink">
            <TabList mb={6} bg="bg-elevated" borderRadius="xl" p={1}>
              <Tab color="text-secondary" _selected={{ bgGradient: "linear(to-r, #833AB4, #E1306C)", color: "white", fontWeight: "bold" }}>
                Login
              </Tab>
              <Tab color="text-secondary" _selected={{ bgGradient: "linear(to-r, #833AB4, #E1306C)", color: "white", fontWeight: "bold" }}>
                Sign Up
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}><Login /></TabPanel>
              <TabPanel px={0}><Signup /></TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        <Text textAlign="center" color="text-disabled" fontSize="xs" mt={6}>
          © 2024 VibeChat · Made with ❤️ by Vikas Pathak
        </Text>
      </Container>
    </Box>
  );
};

export default Homepage;
