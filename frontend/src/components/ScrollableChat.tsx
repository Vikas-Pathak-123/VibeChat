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
import { useChatState } from "../context/ChatProvider";
import { Message } from "../types";

interface ScrollableChatProps {
  messages: Message[];
}

const ScrollableChat: React.FC<ScrollableChatProps> = ({ messages }) => {
  const { user } = useChatState();

  if (!user) return null;

  return (
    <ScrollableFeed>
      {messages.map((m, i) => {
        const isSent     = m.sender._id === user._id;
        const showAvatar = isSameSender(messages, m, i, user._id) || isLastMessage(messages, i, user._id);
        const sameUser   = isSameUser(messages, m, i);
        const margin     = isSameSenderMargin(messages, m, i, user._id);

        // Format timestamp — e.g. "14:32"
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
            {/* Avatar — only on received messages */}
            {!isSent && (
              showAvatar ? (
                <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                  <Avatar
                    mt="4px" mr={2}
                    size="xs"
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

            {/* Bubble + timestamp */}
            <Box
              display="flex"
              flexDir="column"
              alignItems={isSent ? "flex-end" : "flex-start"}
              maxW="70%"
              ml={typeof margin === "number" ? `${margin}px` : margin}
              mt={sameUser ? "2px" : "8px"}
            >
              {/* Sender name — only for group chats on first of group */}
              {!isSent && !sameUser && (
                <Text fontSize="10px" color="text-secondary" mb="2px" ml={1} fontWeight="semibold">
                  {m.sender.name.split(" ")[0]}
                </Text>
              )}

              {/* Message bubble */}
              <Box
                bg={isSent ? "accent" : "bg-elevated"}
                color={isSent ? "white" : "text-primary"}
                px={4}
                py={2}
                borderRadius={
                  isSent
                    ? sameUser ? "18px 18px 4px 18px" : "18px 18px 4px 18px"
                    : sameUser ? "18px 18px 18px 4px" : "18px 18px 18px 4px"
                }
                fontSize="sm"
                lineHeight="1.5"
                wordBreak="break-word"
                boxShadow={isSent
                  ? "0 1px 8px rgba(225,48,108,0.25)"
                  : "0 1px 4px rgba(0,0,0,0.12)"
                }
                position="relative"
              >
                {m.content}
              </Box>

              {/* Timestamp */}
              <Text
                fontSize="10px"
                color="text-disabled"
                mt="2px"
                mx={1}
              >
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
