import { Message, User } from "../types";

/**
 * Determines left margin for a message bubble based on sender grouping.
 */
export const isSameSenderMargin = (
  messages: Message[],
  m: Message,
  i: number,
  userId: string
): number | "auto" => {
  if (
    i < messages.length - 1 &&
    messages[i + 1].sender._id === m.sender._id &&
    messages[i].sender._id !== userId
  )
    return 33;
  if (
    (i < messages.length - 1 &&
      messages[i + 1].sender._id !== m.sender._id &&
      messages[i].sender._id !== userId) ||
    (i === messages.length - 1 && messages[i].sender._id !== userId)
  )
    return 0;
  return "auto";
};

/** Returns true if the avatar should be shown for this message */
export const isSameSender = (
  messages: Message[],
  m: Message,
  i: number,
  userId: string
): boolean =>
  i < messages.length - 1 &&
  (messages[i + 1].sender._id !== m.sender._id ||
    messages[i + 1].sender._id === undefined) &&
  messages[i].sender._id !== userId;

/** Returns true if this is the last received message in the list */
export const isLastMessage = (
  messages: Message[],
  i: number,
  userId: string
): boolean =>
  i === messages.length - 1 &&
  messages[messages.length - 1].sender._id !== userId &&
  !!messages[messages.length - 1].sender._id;

/** Returns true if consecutive messages are from the same sender */
export const isSameUser = (
  messages: Message[],
  m: Message,
  i: number
): boolean => i > 0 && messages[i - 1].sender._id === m.sender._id;

/** Returns the display name of the other participant in a 1:1 chat */
export const getSender = (loggedUser: User, users: User[]): string =>
  users[0]._id === loggedUser._id ? users[1].name : users[0].name;

/** Returns the full User object of the other participant in a 1:1 chat */
export const getSenderFull = (loggedUser: User, users: User[]): User =>
  users[0]._id === loggedUser._id ? users[1] : users[0];
