import { Button } from "@chakra-ui/button";
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import { Input, InputGroup, InputRightElement } from "@chakra-ui/input";
import { VStack, Text, Box } from "@chakra-ui/layout";
import { useState } from "react";
import { useToast } from "@chakra-ui/react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../constants/api.constants";
import { useChatState } from "../../context/ChatProvider";

const Login: React.FC = () => {
  const [show, setShow]         = useState<boolean>(false);
  const [email, setEmail]       = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading]   = useState<boolean>(false);
  const navigate  = useNavigate();
  const toast     = useToast();
  const { setUser } = useChatState();

  const submitHandler = async (): Promise<void> => {
    if (!email || !password) {
      toast({ title: "Please fill all fields", status: "warning", duration: 4000, isClosable: true, position: "top" });
      return;
    }
    try {
      setLoading(true);
      const { data } = await axios.post(`${API_BASE_URL}/api/user/login`, { email, password });
      toast({ title: `Welcome back, ${data.name}! 👋`, status: "success", duration: 4000, isClosable: true, position: "top" });
      // Update localStorage AND context simultaneously
      localStorage.setItem("userInfo", JSON.stringify(data));
      setUser(data);
      navigate("/chats");
    } catch (error) {
      let message = "An unexpected error occurred";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast({ title: "Login failed", description: message, status: "error", duration: 4000, isClosable: true, position: "top" });
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = {
    bg: "bg-input", border: "1px solid", borderColor: "border-subtle",
    color: "text-primary", _placeholder: { color: "text-disabled" },
    _focus: { borderColor: "accent", boxShadow: "0 0 0 1px #E1306C" },
    borderRadius: "8px", size: "lg" as const,
  };

  return (
    <VStack spacing={5}>
      <FormControl isRequired>
        <FormLabel color="text-secondary" fontSize="sm">Email</FormLabel>
        <Input value={email} type="email" placeholder="Enter your email"
          onChange={(e) => setEmail(e.target.value)} {...inputStyles} />
      </FormControl>

      <FormControl isRequired>
        <FormLabel color="text-secondary" fontSize="sm">Password</FormLabel>
        <InputGroup size="lg">
          <Input value={password} type={show ? "text" : "password"}
            placeholder="Enter your password"
            onChange={(e) => setPassword(e.target.value)} {...inputStyles} />
          <InputRightElement width="4.5rem">
            <Button h="1.75rem" size="sm" onClick={() => setShow(!show)}
              variant="ghost" color="text-secondary" _hover={{ color: "text-primary" }}>
              {show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <Button w="100%" size="lg" mt={2} onClick={submitHandler}
        isLoading={loading} loadingText="Logging in..." variant="primary">
        Log In
      </Button>

      <Box w="100%" position="relative" py={1}>
        <Box borderTop="1px solid" borderColor="border-subtle" />
        <Text position="absolute" top="-10px" left="50%" transform="translateX(-50%)"
          px={3} color="text-disabled" fontSize="xs" bg="bg-surface">
          OR
        </Text>
      </Box>

      <Button w="100%" size="lg"
        variant="ghost" border="1px solid" borderColor="border-subtle"
        color="text-secondary" borderRadius="8px"
        _hover={{ bg: "bg-elevated", color: "text-primary" }}
        onClick={() => { setEmail("guest@example.com"); setPassword("123456"); }}>
        🎭 Use Guest Credentials
      </Button>
    </VStack>
  );
};

export default Login;
