import { Avatar } from "@chakra-ui/avatar";
import { Box, Text } from "@chakra-ui/layout";
import { User } from "../../types";

interface UserListItemProps {
  user: User;
  handleFunction: () => void;
}

const UserListItem: React.FC<UserListItemProps> = ({ user, handleFunction }) => (
  <Box
    onClick={handleFunction}
    cursor="pointer"
    bg="bg-elevated"
    _hover={{ bg: "bg-input", color: "text-primary" }}
    w="100%"
    display="flex"
    alignItems="center"
    color="text-primary"
    px={3}
    py={2}
    mb={2}
    borderRadius="10px"
    transition="all 0.15s"
  >
    <Avatar mr={3} size="sm" name={user.name} src={user.picture} />
    <Box>
      <Text fontSize="sm" fontWeight="semibold">{user.name}</Text>
      <Text fontSize="xs" color="text-secondary">{user.email}</Text>
    </Box>
  </Box>
);

export default UserListItem;
