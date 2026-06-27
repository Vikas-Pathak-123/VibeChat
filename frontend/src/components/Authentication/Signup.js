import { Button } from "@chakra-ui/button";
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import { Input, InputGroup, InputRightElement } from "@chakra-ui/input";
import { VStack } from "@chakra-ui/layout";
import { useState } from "react";
import { useToast, Progress, Text, Box } from "@chakra-ui/react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmpassword] = useState("");
  const [pic, setPic] = useState();
  const [picLoading, setPicLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();
  const toast = useToast();

  const getPasswordStrength = () => {
    if (!password) return { value: 0, label: "", color: "gray" };
    if (password.length < 4) return { value: 25, label: "Weak", color: "red" };
    if (password.length < 7) return { value: 50, label: "Fair", color: "orange" };
    if (password.length < 10) return { value: 75, label: "Good", color: "yellow" };
    return { value: 100, label: "Strong 💪", color: "green" };
  };

  const strength = getPasswordStrength();

  const submitHandler = async () => {
    setPicLoading(true);
    if (!name || !email || !password || !confirmpassword) {
      toast({ title: "Please fill all fields", status: "warning", duration: 4000, isClosable: true, position: "top" });
      setPicLoading(false);
      return;
    }
    if (password !== confirmpassword) {
      toast({ title: "Passwords do not match", status: "error", duration: 4000, isClosable: true, position: "top" });
      setPicLoading(false);
      return;
    }
    try {
      const config = { headers: { "Content-type": "application/json" } };
      const { data } = await axios.post(
        "https://vibechat-177v.onrender.com/api/user",
        { name, email, password, pic },
        config
      );
      toast({ title: "Account created! 🎉", description: `Welcome to VibeChat, ${data.name}!`, status: "success", duration: 4000, isClosable: true, position: "top" });
      localStorage.setItem("userInfo", JSON.stringify(data));
      setPicLoading(false);
      navigate("/chats");
    } catch (error) {
      toast({ title: "Registration Failed", description: error.response?.data?.message || "Something went wrong", status: "error", duration: 4000, isClosable: true, position: "top" });
      setPicLoading(false);
    }
  };

  const postDetails = (pics) => {
    setPicLoading(true);
    if (!pics) {
      toast({ title: "Please select an image", status: "warning", duration: 4000, isClosable: true, position: "top" });
      return;
    }
    if (pics.type === "image/jpeg" || pics.type === "image/png") {
      const formData = new FormData();
      formData.append("file", pics);
      formData.append("upload_preset", "VibeChat");
      formData.append("cloud_name", "difmt49ax");
      setUploadProgress(30);
      fetch("https://api.cloudinary.com/v1_1/difmt49ax/image/upload", { method: "post", body: formData })
        .then((res) => res.json())
        .then((data) => {
          setPic(data.url.toString());
          setUploadProgress(100);
          setPicLoading(false);
          toast({ title: "Photo uploaded! ✅", status: "success", duration: 3000, isClosable: true, position: "top" });
        })
        .catch(() => {
          setPicLoading(false);
          setUploadProgress(0);
        });
    } else {
      toast({ title: "Only JPEG/PNG allowed", status: "warning", duration: 4000, isClosable: true, position: "top" });
      setPicLoading(false);
    }
  };

  const inputStyles = {
    bg: "whiteAlpha.100",
    border: "1px solid",
    borderColor: "whiteAlpha.300",
    color: "white",
    _placeholder: { color: "whiteAlpha.400" },
    _focus: { borderColor: "#e94560", boxShadow: "0 0 0 1px #e94560", bg: "whiteAlpha.200" },
    borderRadius: "lg",
    size: "lg",
  };

  return (
    <VStack spacing={4}>
      <FormControl id="first-name" isRequired>
        <FormLabel color="whiteAlpha.800" fontSize="sm">Full Name</FormLabel>
        <Input placeholder="Enter your name" onChange={(e) => setName(e.target.value)} {...inputStyles} />
      </FormControl>

      <FormControl id="email-signup" isRequired>
        <FormLabel color="whiteAlpha.800" fontSize="sm">Email Address</FormLabel>
        <Input type="email" placeholder="Enter your email" onChange={(e) => setEmail(e.target.value)} {...inputStyles} />
      </FormControl>

      <FormControl id="password-signup" isRequired>
        <FormLabel color="whiteAlpha.800" fontSize="sm">Password</FormLabel>
        <InputGroup size="lg">
          <Input type={show ? "text" : "password"} placeholder="Create a password" onChange={(e) => setPassword(e.target.value)} {...inputStyles} />
          <InputRightElement width="4.5rem">
            <Button h="1.75rem" size="sm" onClick={() => setShow(!show)} variant="ghost" color="whiteAlpha.600" _hover={{ color: "white" }}>
              {show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
        {password && (
          <Box mt={2}>
            <Progress value={strength.value} colorScheme={strength.color} size="xs" borderRadius="full" />
            <Text fontSize="xs" color={`${strength.color}.300`} mt={1}>{strength.label}</Text>
          </Box>
        )}
      </FormControl>

      <FormControl id="confirm-password" isRequired>
        <FormLabel color="whiteAlpha.800" fontSize="sm">Confirm Password</FormLabel>
        <InputGroup size="lg">
          <Input
            type={show ? "text" : "password"}
            placeholder="Confirm your password"
            onChange={(e) => setConfirmpassword(e.target.value)}
            {...inputStyles}
            borderColor={confirmpassword && confirmpassword !== password ? "red.400" : "whiteAlpha.300"}
          />
          <InputRightElement width="4.5rem">
            <Button h="1.75rem" size="sm" onClick={() => setShow(!show)} variant="ghost" color="whiteAlpha.600" _hover={{ color: "white" }}>
              {show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
        {confirmpassword && confirmpassword !== password && (
          <Text fontSize="xs" color="red.400" mt={1}>Passwords do not match</Text>
        )}
      </FormControl>

      <FormControl id="pic">
        <FormLabel color="whiteAlpha.800" fontSize="sm">Profile Picture (optional)</FormLabel>
        <Input type="file" p={1.5} accept="image/*" onChange={(e) => postDetails(e.target.files[0])}
          bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.300" color="whiteAlpha.700"
          borderRadius="lg" size="lg" _focus={{ borderColor: "#e94560" }}
        />
        {uploadProgress > 0 && uploadProgress < 100 && (
          <Progress value={uploadProgress} colorScheme="pink" size="xs" mt={2} borderRadius="full" />
        )}
        {uploadProgress === 100 && <Text fontSize="xs" color="green.400" mt={1}>✅ Photo uploaded successfully</Text>}
      </FormControl>

      <Button
        width="100%"
        size="lg"
        mt={2}
        onClick={submitHandler}
        isLoading={picLoading}
        loadingText="Creating account..."
        bgGradient="linear(to-r, #e94560, #0f3460)"
        color="white"
        borderRadius="lg"
        _hover={{ bgGradient: "linear(to-r, #c73652, #0a2a50)", transform: "translateY(-1px)", boxShadow: "0 4px 15px rgba(233,69,96,0.4)" }}
        _active={{ transform: "translateY(0)" }}
        transition="all 0.2s"
      >
        Create Account 🚀
      </Button>
    </VStack>
  );
};

export default Signup;
