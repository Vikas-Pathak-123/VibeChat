import { clearSessionState } from "./session";
import { useChatStore } from "./chatStore";
import { queryClient } from "./queryClient";
import { queryKeys } from "./keys/queryKeys";
import { Chat } from "../types";

describe("clearSessionState", () => {
  it("drops the previous user's open chat and cached server state", () => {
    useChatStore.getState().setSelectedChat({ _id: "chat-x" } as Chat);
    queryClient.setQueryData(queryKeys.notifications.list(), [{ _id: "n1" }]);

    clearSessionState();

    expect(useChatStore.getState().selectedChat).toBeNull();
    expect(queryClient.getQueryData(queryKeys.notifications.list())).toBeUndefined();
  });
});
