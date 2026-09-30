import { io } from "socket.io-client";
import { useSocketStore } from "./socketStore";
import { User } from "../types";

jest.mock("socket.io-client", () => ({ io: jest.fn() }));

// socketStore → notificationApi → apiClient → axios (ESM, not transformed by CRA's Jest)
jest.mock("./api/notificationApi", () => ({ markChatNotificationsRead: jest.fn() }));

const user = { _id: "u1", name: "Alice", email: "a@test.com", picture: "", token: "t" } as User;

describe("socketStore.connect", () => {
  beforeEach(() => {
    useSocketStore.setState({ socket: null, isConnected: false });
    // CRA's Jest resets mock implementations before each test
    (io as jest.Mock).mockImplementation(() => ({
      on: jest.fn(), emit: jest.fn(), disconnect: jest.fn(), connected: false,
    }));
  });

  it("opens one socket even when called again before the first one connects", () => {
    // login's connect() and Chatpage's reconnect-on-refresh effect can both fire
    useSocketStore.getState().connect(user);
    useSocketStore.getState().connect(user);

    expect(io).toHaveBeenCalledTimes(1);
  });

  it("opens a fresh socket after disconnect", () => {
    useSocketStore.getState().connect(user);
    useSocketStore.getState().disconnect();
    useSocketStore.getState().connect(user);

    expect(io).toHaveBeenCalledTimes(2);
  });
});
