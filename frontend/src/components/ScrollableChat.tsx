import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import { Box, Text } from "@chakra-ui/react";
import ScrollableFeed from "react-scrollable-feed";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { useAuthStore } from "../store/authStore";
import { Message } from "../types";

interface ScrollableChatProps {
  messages: Message[];
}

/**
 * ScrollableChat — Renders message bubbles.
 * Reads logged-in user from useAuthStore (Zustand) instead of useChatState.
 * No server state — messages are passed as props from SingleChat.
 */
const ScrollableChat: React.FC<ScrollableChatProps> = ({ messages }) => {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <ScrollableFeed>
      {messages.map((m, i) => {
        const isSent     = m.sender._id === user._id;
        const showAvatar = isSameSender(messages, m, i, user._id) || isLastMessage(messages, i, user._id);
        const sameUser   = isSameUser(messages, m, i);
        const margin     = isSameSenderMargin(messages, m, i, user._id);

        const time = new Date(m.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <Box
            key={m._id}
            display="flex"
            alignItems="flex-end"
            justifyContent={isSent ? "flex-end" : "flex-start"}
            mb={sameUser ? "2px" : "6px"}
            px={2}
          >
            {!isSent && (
              showAvatar ? (
                <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                  <Avatar
                    mt="4px" mr={2} size="xs"
                    cursor="pointer"
                    name={m.sender.name}
                    src={m.sender.picture}
                    flexShrink={0}
                  />
                </Tooltip>
              ) : (
                <Box w="24px" mr={2} flexShrink={0} />
              )
            )}

            <Box
              display="flex"
              flexDir="column"
              alignItems={isSent ? "flex-end" : "flex-start"}
              maxW="70%"
              ml={typeof margin === "number" ? `${margin}px` : margin}
              mt={sameUser ? "2px" : "8px"}
            >
              {!isSent && !sameUser && (
                <Text fontSize="10px" color="text-secondary" mb="2px" ml={1} fontWeight="semibold">
                  {m.sender.name.split(" ")[0]}
                </Text>
              )}
              <Box
                bg={isSent ? "accent" : "bg-elevated"}
                color={isSent ? "white" : "text-primary"}
                px={4} py={2}
                borderRadius={
                  isSent ? "18px 18px 4px 18px" : "18px 18px 18px 4px"
                }
                fontSize="sm"
                lineHeight="1.5"
                wordBreak="break-word"
                boxShadow={isSent
                  ? "0 1px 8px rgba(225,48,108,0.25)"
                  : "0 1px 4px rgba(0,0,0,0.12)"
                }
              >
                {m.content}
              </Box>
              <Text fontSize="10px" color="text-disabled" mt="2px" mx={1}>
                {time}
              </Text>
            </Box>
          </Box>
        );
      })}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
