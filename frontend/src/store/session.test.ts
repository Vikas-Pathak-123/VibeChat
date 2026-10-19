import { Socket } from "socket.io-client";
import {
  clearSessionState,
  restoreSession,
  endSession,
  logoutSession,
  completeGoogleLogin,
  startGoogleLogin,
} from "./session";
import { AxiosError, AxiosResponse } from "axios";
import { API_ORIGIN } from "../constants/api.constants";
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

const httpError = (status: number) =>
  new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, { status } as AxiosResponse);

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
    (refreshSession as jest.Mock).mockRejectedValue(httpError(401));

    await restoreSession();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthLoading).toBe(false);
  });

  it("removes the legacy persisted token", async () => {
    localStorage.setItem("vibe-auth", JSON.stringify({ state: { user: { token: "old-30d-token" } } }));
    (refreshSession as jest.Mock).mockRejectedValue(httpError(401));

    await restoreSession();

    expect(localStorage.getItem("vibe-auth")).toBeNull();
  });

  it("retries while the API is waking up (5xx / network error), then signs in", async () => {
    (refreshSession as jest.Mock)
      .mockRejectedValueOnce(httpError(504))
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce(alice);

    await restoreSession({ retryDelaysMs: [0, 0] });

    expect(refreshSession).toHaveBeenCalledTimes(3);
    expect(useAuthStore.getState().user).toEqual(alice);
  });

  it("does not retry when there is simply no session (401)", async () => {
    (refreshSession as jest.Mock).mockRejectedValue(httpError(401));

    await restoreSession({ retryDelaysMs: [0, 0] });

    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it("gives up and shows signed out when the API stays down", async () => {
    (refreshSession as jest.Mock).mockRejectedValue(httpError(503));

    await restoreSession({ retryDelaysMs: [0, 0] });

    expect(refreshSession).toHaveBeenCalledTimes(3);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthLoading).toBe(false);
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

describe("Google sign-in binding", () => {
  it("starts the flow with a fresh nonce remembered by this browser", () => {
    const first = new URL(startGoogleLogin());
    const second = new URL(startGoogleLogin());

    // A top-level navigation straight to the API server: its OAuth state cookie lives there
    expect(first.origin + first.pathname).toBe(`${API_ORIGIN}/api/user/auth/google`);
    const nonce = second.searchParams.get("nonce")!;
    expect(nonce).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
    expect(nonce).not.toBe(first.searchParams.get("nonce"));
  });

  it("exchanges the one-time code for the flow this browser started", async () => {
    (exchangeGoogleCode as jest.Mock).mockResolvedValue(alice);
    const nonce = new URL(startGoogleLogin()).searchParams.get("nonce")!;

    const user = await completeGoogleLogin("one-time-code", nonce);

    expect(exchangeGoogleCode).toHaveBeenCalledWith("one-time-code");
    expect(user).toEqual(alice);
    expect(useAuthStore.getState().user).toEqual(alice);
  });

  it("refuses a code from a flow this browser did not start (login CSRF)", async () => {
    startGoogleLogin();

    await expect(completeGoogleLogin("attacker-code", "attacker-nonce-0123456")).rejects.toThrow();
    expect(exchangeGoogleCode).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("uses each nonce once", async () => {
    (exchangeGoogleCode as jest.Mock).mockResolvedValue(alice);
    const nonce = new URL(startGoogleLogin()).searchParams.get("nonce")!;
    await completeGoogleLogin("code-1", nonce);

    await expect(completeGoogleLogin("code-2", nonce)).rejects.toThrow();
    expect(exchangeGoogleCode).toHaveBeenCalledTimes(1);
  });
});
