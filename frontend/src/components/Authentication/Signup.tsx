import { Button } from "@chakra-ui/button";
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import { Input, InputGroup, InputRightElement } from "@chakra-ui/input";
import { VStack } from "@chakra-ui/layout";
import { useState } from "react";
import { Progress, Text, Box, useToast } from "@chakra-ui/react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../constants/api.constants";
import { useChatState } from "../../context/ChatProvider";

const Signup: React.FC = () => {
  const [show, setShow]                       = useState<boolean>(false);
  const [name, setName]                       = useState<string>("");
  const [email, setEmail]                     = useState<string>("");
  const [password, setPassword]               = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [pic, setPic]                         = useState<string>("");
  const [picLoading, setPicLoading]           = useState<boolean>(false);
  const [uploadProgress, setUploadProgress]   = useState<number>(0);
  const navigate  = useNavigate();
  const toast     = useToast();
  const { setUser } = useChatState();

  const getStrength = (): { value: number; label: string; color: string } => {
    if (!password) return { value: 0, label: "", color: "gray" };
    if (password.length < 4)  return { value: 25, label: "Weak",   color: "red" };
    if (password.length < 7)  return { value: 50, label: "Fair",   color: "orange" };
    if (password.length < 10) return { value: 75, label: "Good",   color: "yellow" };
    return { value: 100, label: "Strong 💪", color: "green" };
  };
  const strength = getStrength();

  const submitHandler = async (): Promise<void> => {
    if (!name || !email || !password || !confirmPassword) {
      toast({ title: "Please fill all fields", status: "warning", duration: 4000, isClosable: true, position: "top" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", status: "error", duration: 4000, isClosable: true, position: "top" });
      return;
    }
    try {
      setPicLoading(true);
      const { data } = await axios.post(`${API_BASE_URL}/api/user`, { name, email, password, pic });
      toast({ title: `Welcome to VibeChat, ${data.name}! 🎉`, status: "success", duration: 4000, isClosable: true, position: "top" });
      // Update localStorage AND context simultaneously
      localStorage.setItem("userInfo", JSON.stringify(data));
      setUser(data);
      navigate("/chats");
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.response?.data?.message, status: "error", duration: 4000, isClosable: true, position: "top" });
    } finally {
      setPicLoading(false);
    }
  };

  const postDetails = (file: File | undefined): void => {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast({ title: "Only JPEG/PNG allowed", status: "warning", duration: 4000, isClosable: true, position: "top" });
      return;
    }
    setPicLoading(true);
    setUploadProgress(30);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "VibeChat");
    formData.append("cloud_name", "difmt49ax");
    fetch("https://api.cloudinary.com/v1_1/difmt49ax/image/upload", { method: "post", body: formData })
      .then((r) => r.json())
      .then((data) => {
        setPic(data.url);
        setUploadProgress(100);
        toast({ title: "Photo uploaded ✅", status: "success", duration: 3000, isClosable: true, position: "top" });
      })
      .catch(() => toast({ title: "Upload failed", status: "error", duration: 4000, isClosable: true, position: "top" }))
      .finally(() => setPicLoading(false));
  };

  const inputStyles = {
    bg: "bg-input", border: "1px solid", borderColor: "border-subtle",
    color: "text-primary", _placeholder: { color: "text-disabled" },
    _focus: { borderColor: "accent", boxShadow: "0 0 0 1px #E1306C" },
    borderRadius: "8px", size: "lg" as const,
  };

  return (
    <VStack spacing={4}>
      <FormControl isRequired>
        <FormLabel color="text-secondary" fontSize="sm">Full Name</FormLabel>
        <Input placeholder="Your name" onChange={(e) => setName(e.target.value)} {...inputStyles} />
      </FormControl>

      <FormControl isRequired>
        <FormLabel color="text-secondary" fontSize="sm">Email</FormLabel>
        <Input type="email" placeholder="Your email" onChange={(e) => setEmail(e.target.value)} {...inputStyles} />
      </FormControl>

      <FormControl isRequired>
        <FormLabel color="text-secondary" fontSize="sm">Password</FormLabel>
        <InputGroup size="lg">
          <Input type={show ? "text" : "password"} placeholder="Create a password"
            onChange={(e) => setPassword(e.target.value)} {...inputStyles} />
          <InputRightElement width="4.5rem">
            <Button h="1.75rem" size="sm" onClick={() => setShow(!show)}
              variant="ghost" color="text-secondary">{show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
        {password && (
          <Box mt={2}>
            <Progress value={strength.value} colorScheme={strength.color} size="xs" borderRadius="full" />
            <Text fontSize="xs" color={`${strength.color}.400`} mt={1}>{strength.label}</Text>
          </Box>
        )}
      </FormControl>

      <FormControl isRequired>
        <FormLabel color="text-secondary" fontSize="sm">Confirm Password</FormLabel>
        <InputGroup size="lg">
          <Input type={show ? "text" : "password"} placeholder="Confirm password"
            onChange={(e) => setConfirmPassword(e.target.value)}
            {...inputStyles}
            borderColor={confirmPassword && confirmPassword !== password ? "red.400" : "border-subtle"}
          />
          <InputRightElement width="4.5rem">
            <Button h="1.75rem" size="sm" onClick={() => setShow(!show)}
              variant="ghost" color="text-secondary">{show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
        {confirmPassword && confirmPassword !== password && (
          <Text fontSize="xs" color="red.400" mt={1}>Passwords do not match</Text>
        )}
      </FormControl>

      <FormControl>
        <FormLabel color="text-secondary" fontSize="sm">Profile Picture (optional)</FormLabel>
        <Input type="file" p={1.5} accept="image/*"
          onChange={(e) => postDetails(e.target.files?.[0])}
          bg="bg-input" border="1px solid" borderColor="border-subtle"
          color="text-secondary" borderRadius="8px" size="lg"
          _focus={{ borderColor: "accent" }}
        />
        {uploadProgress > 0 && uploadProgress < 100 && (
          <Progress value={uploadProgress} colorScheme="pink" size="xs" mt={2} borderRadius="full" />
        )}
        {uploadProgress === 100 && <Text fontSize="xs" color="green.400" mt={1}>✅ Uploaded</Text>}
      </FormControl>

      <Button w="100%" size="lg" mt={2} onClick={submitHandler}
        isLoading={picLoading} loadingText="Creating account..." variant="primary">
        Create Account 🚀
      </Button>
    </VStack>
  );
};

export default Signup;
