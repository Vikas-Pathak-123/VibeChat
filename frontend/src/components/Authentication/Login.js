import { Button } from "@chakra-ui/button";
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import { Input, InputGroup, InputRightElement } from "@chakra-ui/input";
import { VStack, Text, Box } from "@chakra-ui/layout";
import { useState } from "react";
import { useToast } from "@chakra-ui/react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const submitHandler = async () => {
    setLoading(true);
    if (!email || !password) {
      toast({
        title: "Please fill all fields",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
      setLoading(false);
      return;
    }
    try {
      const config = { headers: { "Content-type": "application/json" } };
      const { data } = await axios.post(
        "https://vibechat-177v.onrender.com/api/user/login",
        { email, password },
        config
      );
      toast({
        title: "Welcome back! 👋",
        description: `Logged in as ${data.name}`,
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
      localStorage.setItem("userInfo", JSON.stringify(data));
      setLoading(false);
      navigate("/chats");
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error.response?.data?.message || "Something went wrong",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
      setLoading(false);
    }
  };

  return (
    <VStack spacing={5}>
      <FormControl id="email" isRequired>
        <FormLabel color="whiteAlpha.800" fontSize="sm">
          Email Address
        </FormLabel>
        <Input
          value={email}
          type="email"
          placeholder="Enter your email"
          onChange={(e) => setEmail(e.target.value)}
          bg="whiteAlpha.100"
          border="1px solid"
          borderColor="whiteAlpha.300"
          color="white"
          _placeholder={{ color: "whiteAlpha.400" }}
          _focus={{
            borderColor: "#e94560",
            boxShadow: "0 0 0 1px #e94560",
            bg: "whiteAlpha.200",
          }}
          borderRadius="lg"
          size="lg"
        />
      </FormControl>

      <FormControl id="password" isRequired>
        <FormLabel color="whiteAlpha.800" fontSize="sm">
          Password
        </FormLabel>
        <InputGroup size="lg">
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={show ? "text" : "password"}
            placeholder="Enter your password"
            bg="whiteAlpha.100"
            border="1px solid"
            borderColor="whiteAlpha.300"
            color="white"
            _placeholder={{ color: "whiteAlpha.400" }}
            _focus={{
              borderColor: "#e94560",
              boxShadow: "0 0 0 1px #e94560",
              bg: "whiteAlpha.200",
            }}
            borderRadius="lg"
          />
          <InputRightElement width="4.5rem">
            <Button
              h="1.75rem"
              size="sm"
              onClick={() => setShow(!show)}
              variant="ghost"
              color="whiteAlpha.600"
              _hover={{ color: "white" }}
            >
              {show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <Button
        width="100%"
        size="lg"
        mt={2}
        onClick={submitHandler}
        isLoading={loading}
        loadingText="Logging in..."
        bgGradient="linear(to-r, #e94560, #0f3460)"
        color="white"
        borderRadius="lg"
        _hover={{
          bgGradient: "linear(to-r, #c73652, #0a2a50)",
          transform: "translateY(-1px)",
          boxShadow: "0 4px 15px rgba(233,69,96,0.4)",
        }}
        _active={{ transform: "translateY(0)" }}
        transition="all 0.2s"
      >
        Login
      </Button>

      <Box w="100%" position="relative" py={1}>
        <Box borderTop="1px solid" borderColor="whiteAlpha.200" />
        <Text
          position="absolute"
          top="-10px"
          left="50%"
          transform="translateX(-50%)"
          bg="transparent"
          px={3}
          color="whiteAlpha.500"
          fontSize="xs"
        >
          OR
        </Text>
      </Box>

      <Button
        width="100%"
        size="lg"
        onClick={() => {
          setEmail("guest@example.com");
          setPassword("123456");
        }}
        variant="outline"
        borderColor="whiteAlpha.300"
        color="whiteAlpha.700"
        borderRadius="lg"
        _hover={{
          bg: "whiteAlpha.100",
          borderColor: "whiteAlpha.500",
          color: "white",
        }}
        transition="all 0.2s"
      >
        🎭 Use Guest Credentials
      </Button>
    </VStack>
  );
};

export default Login;
