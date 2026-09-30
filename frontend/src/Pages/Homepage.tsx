import {
  Box, Button, Container, Tab, TabList, TabPanel,
  TabPanels, Tabs, Text, useToast,
} from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";
import ThemeToggle from "../components/shared/ThemeToggle";
import { useAuthStore } from "../store/authStore";
import { completeGoogleLogin, startGoogleLogin } from "../store/session";
import { API_BASE_URL } from "../constants/api.constants";

const GOOGLE_AUTH_URL = `${API_BASE_URL}/api/user/auth/google`;

const GOOGLE_TOAST_ID = "google-sign-in";

const GOOGLE_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in isn't available right now",
  google_failed: "Google sign-in failed — please try again",
};

const GoogleLogo: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/**
 * Homepage — Login / Signup page.
 *
 * Reads auth state from Zustand authStore (not localStorage directly).
 * Redirects to /chats if user is already logged in.
 *
 * Google sign-in returns here with either `?oauthCode=&nonce=` (a one-time code
 * that is exchanged for a session if this browser started the flow) or
 * `?authError=`; both are stripped from the URL.
 */
const Homepage: React.FC = () => {
  const navigate            = useNavigate();
  const { user, isAuthLoading } = useAuthStore();
  const toast                   = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  // StrictMode runs effects twice; a one-time code must be exchanged once
  const exchangedOAuthCode      = useRef(false);

  useEffect(() => {
    const code      = searchParams.get("oauthCode");
    const nonce     = searchParams.get("nonce");
    const authError = searchParams.get("authError");
    if (!code && !authError) return;
    setSearchParams({}, { replace: true });

    // Deduped by id so a repeated effect run shows one toast, not zero or two
    const showError = (title: string) => {
      if (toast.isActive(GOOGLE_TOAST_ID)) return;
      toast({ id: GOOGLE_TOAST_ID, title, status: "error", duration: 5000, isClosable: true, position: "top" });
    };

    if (authError) {
      showError(GOOGLE_ERRORS[authError] ?? GOOGLE_ERRORS.google_failed);
      return;
    }
    if (exchangedOAuthCode.current) return;
    exchangedOAuthCode.current = true;
    // On success the user is set and the effect below moves on to /chats
    completeGoogleLogin(code as string, nonce).catch(() =>
      showError("Google sign-in expired — please try again")
    );
  }, [searchParams, setSearchParams, toast]);

  useEffect(() => {
    // Wait for the session restore before checking
    if (!isAuthLoading && user) navigate("/chats");
  }, [user, isAuthLoading, navigate]);

  return (
    <Box minH="100vh" bg="bg-app" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Container maxW="md" py={10}>
        <Box display="flex" justifyContent="flex-end" mb={4}>
          <ThemeToggle />
        </Box>

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

        <Box
          bg="bg-surface" borderRadius="2xl"
          border="1px solid" borderColor="border-subtle"
          p={8} boxShadow="0 8px 32px rgba(0,0,0,0.12)"
        >
          <Tabs isFitted variant="soft-rounded" colorScheme="pink">
            <TabList mb={6} bg="bg-elevated" borderRadius="xl" p={1}>
              <Tab
                color="text-secondary"
                _selected={{ bgGradient: "linear(to-r, #833AB4, #E1306C)", color: "white", fontWeight: "bold" }}
              >
                Login
              </Tab>
              <Tab
                color="text-secondary"
                _selected={{ bgGradient: "linear(to-r, #833AB4, #E1306C)", color: "white", fontWeight: "bold" }}
              >
                Sign Up
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}><Login /></TabPanel>
              <TabPanel px={0}><Signup /></TabPanel>
            </TabPanels>
          </Tabs>

          <Button
            as="a" href={GOOGLE_AUTH_URL}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              window.location.assign(startGoogleLogin());
            }}
            w="100%" size="lg" mt={2}
            leftIcon={<GoogleLogo />}
            bg="bg-elevated" color="text-primary"
            border="1px solid" borderColor="border-subtle" borderRadius="8px"
            _hover={{ borderColor: "accent" }}
          >
            Continue with Google
          </Button>
        </Box>

        <Text textAlign="center" color="text-disabled" fontSize="xs" mt={6}>
          © 2024 VibeChat · Made with ❤️ by Vikas Pathak
        </Text>
      </Container>
    </Box>
  );
};

export default Homepage;
