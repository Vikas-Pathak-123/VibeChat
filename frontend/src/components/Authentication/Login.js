import { Button } from "@chakra-ui/button";
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import { Input, InputGroup, InputRightElement } from "@chakra-ui/input";
import { VStack } from "@chakra-ui/layout";
import { useState } from "react";
import { useToast } from "@chakra-ui/react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
 const [show, setShow] = useState(false);
 const handleClick = () => setShow(!show);
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [loading, setLoading] = useState(false);
 const navigate = useNavigate();
 const toast = useToast({ defaultIsOpen: false });

 const submitHandler = async () => {
   setLoading(true);
   if (!email || !password) {
     toast({
       title: "Please Fill all the Feilds",
       status: "warning",
       duration: 5000,
       isClosable: true,
       position: "bottom",
     });
     setLoading(false);
     return;
   }

   // console.log(email, password);
   try {
     const config = {
       headers: {
         "Content-type": "application/json",
       },
     };

     const { data } = await axios.post(
       "https://vibechat-177v.onrender.com/api/user/login",
       { email, password },
       config
     );

     // console.log(JSON.stringify(data));
     toast({
       title: "Login Successful",
       status: "success",
       duration: 5000,
       isClosable: true,
       position: "bottom",
     });
     localStorage.setItem("userInfo", JSON.stringify(data));
     setLoading(false);
     navigate("/chats");
   } catch (error) {
     toast({
       title: "Error Occured!",
       description: error.response.data.message,
       status: "error",
       duration: 5000,
       isClosable: true,
       position: "bottom",
     });
     setLoading(false);
   }
 };

 return (
   <VStack spacing="10px">
     <FormControl id="email" isRequired>
       <FormLabel>Email Address</FormLabel>
       <Input
         value={email}
         type="email"
         placeholder="Enter Your Email Address"
         onChange={(e) => setEmail(e.target.value)}
       />
     </FormControl>
     <FormControl id="password" isRequired>
       <FormLabel>Password</FormLabel>
       <InputGroup size="md">
         <Input
           value={password}
           onChange={(e) => setPassword(e.target.value)}
           type={show ? "text" : "password"}
           placeholder="Enter password"
         />
         <InputRightElement width="4.5rem">
           <Button h="1.75rem" size="sm" onClick={handleClick}>
             {show ? "Hide" : "Show"}
           </Button>
         </InputRightElement>
       </InputGroup>
     </FormControl>
     <Button
       colorScheme="whatsapp"
       width="100%"
       style={{ marginTop: 15 }}
       onClick={submitHandler}
       isLoading={loading}
     >
       Login
     </Button>
     <Button
       variant="solid"
       colorScheme="cyan"
       color={"white"}
       width="100%"
       onClick={() => {
         setEmail("123Gargi.gd79@gmail.com");
         setPassword("123@Vikas");
       }}
     >
       Get Guest User Credentials
     </Button>
   </VStack>
 );
};

export default Login;
