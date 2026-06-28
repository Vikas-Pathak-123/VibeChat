import { Box, CloseButton, Text } from "@chakra-ui/react";
import { User } from "../../types";

interface UserBadgeItemProps {
  user: User;
  handleFunction: () => void;
  admin?: User;
}

const UserBadgeItem: React.FC<UserBadgeItemProps> = ({ user, handleFunction, admin }) => (
  <Box
    px={2} py={1} m={1}
    fontSize="xs"
    borderRadius="full"
    display="flex"
    alignItems="center"
    gap={1}
    bgGradient="linear(to-r, #833AB4, #E1306C)"
    color="white"
    cursor="pointer"
  >
    <Text>{user.name}</Text>
    {admin && admin._id === user._id && <Text fontSize="9px">(Admin)</Text>}
    <CloseButton size="sm" onClick={handleFunction} />
  </Box>
);

export default UserBadgeItem;
