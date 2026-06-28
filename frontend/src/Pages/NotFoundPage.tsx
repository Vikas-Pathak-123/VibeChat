import { Box, Text, Button } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box minH="100vh" bg="bg-app" display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={4}>
      <Text fontSize="6xl" fontWeight="bold" bgGradient="linear(to-r, #833AB4, #E1306C)" bgClip="text">404</Text>
      <Text color="text-secondary" fontSize="lg">Page not found</Text>
      <Button variant="primary" onClick={() => navigate("/")}>Go Home</Button>
    </Box>
  );
};

export default NotFoundPage;
