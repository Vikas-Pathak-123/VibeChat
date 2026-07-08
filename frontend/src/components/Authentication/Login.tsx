import { Button } from "@chakra-ui/button";
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import { Input, InputGroup, InputRightElement } from "@chakra-ui/input";
import { VStack, Text, Box } from "@chakra-ui/layout";
import { useState } from "react";
import { useLoginMutation } from "../../hooks/useAuthMutations";

/**
 * Login component.
 *
 * State management:
 * - Form fields: local useState (ephemeral UI state — not worth putting in Zustand)
 * - Login API call: useLoginMutation (TanStack Query mutation)
 * - Auth user after login: useAuthStore (set inside useLoginMutation.onSuccess)
 *
 * No direct axios. No localStorage writes. No useChatState.
 */
const Login: React.FC = () => {
  const [show, setShow]         = useState<boolean>(false);
  const [email, setEmail]       = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const { mutate: login, isPending } = useLoginMutation();

  const submitHandler = (): void => {
    login({ email, password });
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
        <Input
          value={email}
          type="email"
          placeholder="Enter your email"
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && submitHandler()}
          {...inputStyles}
        />
      </FormControl>

      <FormControl isRequired>
        <FormLabel color="text-secondary" fontSize="sm">Password</FormLabel>
        <InputGroup size="lg">
          <Input
            value={password}
            type={show ? "text" : "password"}
            placeholder="Enter your password"
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && submitHandler()}
            {...inputStyles}
          />
          <InputRightElement width="4.5rem">
            <Button
              h="1.75rem" size="sm"
              onClick={() => setShow(!show)}
              variant="ghost" color="text-secondary"
              _hover={{ color: "text-primary" }}
            >
              {show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <Button
        w="100%" size="lg" mt={2}
        onClick={submitHandler}
        isLoading={isPending}
        loadingText="Logging in..."
        variant="primary"
        isDisabled={!email || !password}
      >
        Log In
      </Button>

      <Box w="100%" position="relative" py={1}>
        <Box borderTop="1px solid" borderColor="border-subtle" />
        <Text
          position="absolute" top="-10px" left="50%" transform="translateX(-50%)"
          px={3} color="text-disabled" fontSize="xs" bg="bg-surface"
        >
          OR
        </Text>
      </Box>

      <Button
        w="100%" size="lg"
        variant="ghost"
        border="1px solid" borderColor="border-subtle"
        color="text-secondary" borderRadius="8px"
        _hover={{ bg: "bg-elevated", color: "text-primary" }}
        onClick={() => {
          setEmail("guest@example.com");
          setPassword("123456");
        }}
      >
        🎭 Use Guest Credentials
      </Button>
    </VStack>
  );
};

export default Login;
