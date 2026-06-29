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
    display="flex"
    alignItems="center"
    gap={3}
    px={3}
    py={2}
    mb={1}
    borderRadius="10px"
    border="1px solid transparent"
    bg="bg-elevated"
    color="text-primary"
    _hover={{ bg: "bg-input", borderColor: "border-subtle" }}
    transition="all 0.15s"
  >
    <Avatar
      size="sm"
      name={user.name}
      src={user.picture}
      bg="accent"
      color="white"
      flexShrink={0}
      fallbackSrc={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=E1306C&color=fff`}
    />
    <Box overflow="hidden">
      <Text fontSize="sm" fontWeight="semibold" color="text-primary" isTruncated>
        {user.name}
      </Text>
      <Text fontSize="xs" color="text-secondary" isTruncated>
        {user.email}
      </Text>
    </Box>
  </Box>
);

export default UserListItem;
