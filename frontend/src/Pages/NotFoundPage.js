import React from "react";
import { Box, Heading } from "@chakra-ui/react";

const NotFoundPage = () => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      textAlign={"center"}
      p={3}
      bg="white"
      w="50%"
      borderRadius="lg"
      borderWidth="1px"
    >
      <Box textAlign="center">
        <Heading as="h1" size="4xl">
          404
        </Heading>
        <Heading as="h2" size="lg" mt={4}>
          Page not found
        </Heading>
      </Box>
    </Box>
  );
};

export default NotFoundPage;
