import { Stack, Skeleton } from "@chakra-ui/react";

/**
 * Skeleton loader displayed while chats are being fetched.
 */
const ChatLoading: React.FC = () => (
  <Stack spacing={2} p={2}>
    {Array.from({ length: 8 }).map((_, i) => (
      <Skeleton
        key={i}
        height="52px"
        borderRadius="10px"
        startColor="bg-elevated"
        endColor="bg-input"
      />
    ))}
  </Stack>
);

export default ChatLoading;
