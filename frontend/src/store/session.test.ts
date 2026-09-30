import { Socket } from "socket.io-client";
import {
  clearSessionState,
  restoreSession,
  endSession,
  logoutSession,
  completeGoogleLogin,
} from "./session";
import { useChatStore } from "./chatStore";
import { useAuthStore } from "./authStore";
import { useSocketStore } from "./socketStore";
import { queryClient } from "./queryClient";
import { queryKeys } from "./keys/queryKeys";
import { refreshSession, setSessionExpiredHandler } from "./api/apiClient";
import { logoutUser, exchangeGoogleCode } from "./api/userApi";
import { Chat, User } from "../types";

jest.mock("./api/apiClient", () => ({
  __esModule: true,
  default: {},
  refreshSession: jest.fn(),
  setSessionExpiredHandler: jest.fn(),
}));
jest.mock("./api/userApi", () => ({ logoutUser: jest.fn(), exchangeGoogleCode: jest.fn() }));

const alice: User = { _id: "u1", name: "Alice", email: "a@test.com", picture: "", token: "t1" };

const signedInWithOpenChat = () => {
  useAuthStore.setState({ user: alice, isAuthLoading: false });
  useChatStore.getState().setSelectedChat({ _id: "chat-x" } as Chat);
  queryClient.setQueryData(queryKeys.notifications.list(), [{ _id: "n1" }]);
  const disconnect = jest.fn();
  useSocketStore.setState({ socket: { disconnect } as unknown as Socket, isConnected: true });
  return { disconnect };
};

const expectSignedOut = () => {
  expect(useAuthStore.getState().user).toBeNull();
  expect(useAuthStore.getState().isAuthLoading).toBe(false);
  expect(useChatStore.getState().selectedChat).toBeNull();
  expect(queryClient.getQueryData(queryKeys.notifications.list())).toBeUndefined();
  expect(useSocketStore.getState().socket).toBeNull();
};

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ user: null, isAuthLoading: true });
});

describe("clearSessionState", () => {
  it("drops the previous user's open chat and cached server state", () => {
    useChatStore.getState().setSelectedChat({ _id: "chat-x" } as Chat);
    queryClient.setQueryData(queryKeys.notifications.list(), [{ _id: "n1" }]);

    clearSessionState();

    expect(useChatStore.getState().selectedChat).toBeNull();
    expect(queryClient.getQueryData(queryKeys.notifications.list())).toBeUndefined();
  });
});

describe("restoreSession", () => {
  it("signs the user in from the refresh cookie", async () => {
    (refreshSession as jest.Mock).mockResolvedValue(alice);

    await restoreSession();

    expect(useAuthStore.getState().user).toEqual(alice);
    expect(useAuthStore.getState().isAuthLoading).toBe(false);
  });

  it("resolves to signed out when there is no valid refresh cookie", async () => {
    (refreshSession as jest.Mock).mockRejectedValue(new Error("401"));

    await restoreSession();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthLoading).toBe(false);
  });

  it("removes the legacy persisted token", async () => {
    localStorage.setItem("vibe-auth", JSON.stringify({ state: { user: { token: "old-30d-token" } } }));
    (refreshSession as jest.Mock).mockRejectedValue(new Error("401"));

    await restoreSession();

    expect(localStorage.getItem("vibe-auth")).toBeNull();
  });

  it("ends the session whenever the refresh token is later rejected", async () => {
    (refreshSession as jest.Mock).mockResolvedValue(alice);
    await restoreSession();

    expect(setSessionExpiredHandler).toHaveBeenCalledWith(endSession);
  });
});

describe("endSession", () => {
  it("disconnects the socket and clears the user, open chat and cache", () => {
    const { disconnect } = signedInWithOpenChat();

    endSession();

    expect(disconnect).toHaveBeenCalled();
    expectSignedOut();
  });
});

describe("logoutSession", () => {
  it("revokes the refresh cookie on the server, then signs out", async () => {
    (logoutUser as jest.Mock).mockResolvedValue(undefined);
    signedInWithOpenChat();

    await logoutSession();

    expect(logoutUser).toHaveBeenCalledTimes(1);
    expectSignedOut();
  });

  it("still signs out locally when the server call fails", async () => {
    (logoutUser as jest.Mock).mockRejectedValue(new Error("network"));
    signedInWithOpenChat();

    await logoutSession();

    expectSignedOut();
  });
});

describe("completeGoogleLogin", () => {
  it("exchanges the one-time code and signs the user in", async () => {
    (exchangeGoogleCode as jest.Mock).mockResolvedValue(alice);

    const user = await completeGoogleLogin("one-time-code");

    expect(exchangeGoogleCode).toHaveBeenCalledWith("one-time-code");
    expect(user).toEqual(alice);
    expect(useAuthStore.getState().user).toEqual(alice);
  });
});
