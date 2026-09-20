import { useState } from "react";
import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import {
  Box, IconButton, Popover, PopoverBody, PopoverContent, PopoverTrigger, Text,
  Menu, MenuButton, MenuList, MenuItem,
  Image, Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalBody,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import ScrollableFeed from "react-scrollable-feed";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { useAuthStore } from "../store/authStore";
import { Message, Reaction } from "../types";

interface ScrollableChatProps {
  messages: Message[];
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
}

const groupReactions = (reactions: Reaction[]): { emoji: string; userIds: string[] }[] => {
  const groups: Record<string, string[]> = {};
  reactions.forEach((r) => {
    groups[r.emoji] = groups[r.emoji] ? [...groups[r.emoji], r.userId] : [r.userId];
  });
  return Object.entries(groups).map(([emoji, userIds]) => ({ emoji, userIds }));
};

/**
 * ScrollableChat — Renders message bubbles.
 * Reads logged-in user from useAuthStore (Zustand) instead of useChatState.
 * No server state — messages are passed as props from SingleChat.
 */
const ScrollableChat: React.FC<ScrollableChatProps> = ({ messages, onReact, onDelete }) => {
  const { user } = useAuthStore();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!user) return null;

  return (
    <>
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

                <Box display="flex" alignItems="center" gap={1}>
                  {m.isDeleted ? (
                    <Box
                      bg="bg-elevated" color="text-disabled" fontStyle="italic"
                      px={4} py={2} borderRadius="18px" fontSize="sm"
                    >
                      This message was deleted
                    </Box>
                  ) : m.messageType === "image" ? (
                    <Image
                      src={m.content} alt="Shared image"
                      borderRadius="12px" maxW="220px" maxH="220px"
                      objectFit="cover" cursor="pointer"
                      onClick={() => setLightboxUrl(m.content)}
                    />
                  ) : (
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
                  )}

                  {!m.isDeleted && (
                    <Popover placement="top" isLazy>
                      <PopoverTrigger>
                        <IconButton
                          aria-label="Add reaction"
                          icon={<Text fontSize="xs">🙂</Text>}
                          size="xs" variant="ghost" borderRadius="full"
                          minW="20px" h="20px" flexShrink={0}
                        />
                      </PopoverTrigger>
                      <PopoverContent w="auto" border="none" bg="transparent" boxShadow="none">
                        <PopoverBody p={0}>
                          <EmojiPicker
                            onEmojiClick={(data: EmojiClickData) => onReact(m._id, data.emoji)}
                            height={350}
                            width={300}
                          />
                        </PopoverBody>
                      </PopoverContent>
                    </Popover>
                  )}

                  {isSent && !m.isDeleted && (
                    <Menu placement="top-end">
                      <MenuButton
                        as={IconButton}
                        aria-label="Message options"
                        icon={<ChevronDownIcon />}
                        size="xs" variant="ghost" minW="20px" h="20px" flexShrink={0}
                      />
                      <MenuList minW="120px">
                        <MenuItem onClick={() => onDelete(m._id)} color="red.400">
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  )}
                </Box>

                {!m.isDeleted && (m.reactions?.length ?? 0) > 0 && (
                  <Box display="flex" flexWrap="wrap" gap={1} mt="2px">
                    {groupReactions(m.reactions ?? []).map(({ emoji, userIds }) => (
                      <Box
                        key={emoji}
                        as="button"
                        onClick={() => onReact(m._id, emoji)}
                        display="flex" alignItems="center" gap="2px"
                        px={2} py="1px" borderRadius="full"
                        fontSize="xs"
                        bg={userIds.includes(user._id) ? "accent" : "bg-elevated"}
                        color={userIds.includes(user._id) ? "white" : "text-primary"}
                        border="1px solid" borderColor="border-subtle"
                      >
                        <span>{emoji}</span>
                        <span>{userIds.length}</span>
                      </Box>
                    ))}
                  </Box>
                )}

                <Text fontSize="10px" color="text-disabled" mt="2px" mx={1}>
                  {time}
                </Text>
              </Box>
            </Box>
          );
        })}
      </ScrollableFeed>

      <Modal isOpen={!!lightboxUrl} onClose={() => setLightboxUrl(null)} isCentered size="xl">
        <ModalOverlay backdropFilter="blur(6px)" />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalCloseButton color="white" />
          <ModalBody p={0} display="flex" justifyContent="center">
            <Image src={lightboxUrl ?? ""} alt="Full size" maxH="80vh" borderRadius="8px" />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ScrollableChat;
