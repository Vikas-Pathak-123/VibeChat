import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import { Box } from "@chakra-ui/react";
import ScrollableFeed from "react-scrollable-feed";
import { isLastMessage, isSameSender, isSameSenderMargin, isSameUser } from "../config/ChatLogics";
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
      {messages.map((m, i) => (
        <Box key={m._id} display="flex" alignItems="flex-end" mb={isSameUser(messages, m, i) ? 1 : 2}>
          {/* Show avatar for received messages */}
          {(isSameSender(messages, m, i, user._id) || isLastMessage(messages, i, user._id)) ? (
            <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
              <Avatar
                mt="7px" mr={1} size="xs"
                cursor="pointer"
                name={m.sender.name}
                src={m.sender.picture}
              />
            </Tooltip>
          ) : (
            <Box w="26px" mr={1} flexShrink={0} />
          )}

          {/* Message bubble */}
          <Box
            bg={m.sender._id === user._id ? "bubble-sent" : "bubble-received"}
            color="text-primary"
            ml={isSameSenderMargin(messages, m, i, user._id)}
            mt={isSameUser(messages, m, i) ? "3px" : "10px"}
            borderRadius={
              m.sender._id === user._id
                ? "18px 18px 4px 18px"
                : "18px 18px 18px 4px"
            }
            px={4}
            py={2}
            maxW="75%"
            fontSize="sm"
            border="1px solid"
            borderColor="border-subtle"
            wordBreak="break-word"
          >
            {m.content}
          </Box>
        </Box>
      ))}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
