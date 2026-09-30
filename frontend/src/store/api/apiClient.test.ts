import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import apiClient, { setSessionExpiredHandler } from "./apiClient";
import { useAuthStore } from "../authStore";
import { User } from "../../types";

const userWith = (token: string): User => ({
  _id: "u1", name: "Alice", email: "a@test.com", picture: "", token,
});

type Reply = { status: number; data?: unknown };
type Handler = (config: InternalAxiosRequestConfig) => Reply | Promise<Reply>;

let requests: InternalAxiosRequestConfig[];

// Stand-in for the network: `handler` decides each response.
const serve = (handler: Handler) => {
  apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    const { status, data } = await handler(config);
    const response = { data, status, statusText: "", headers: {}, config } as AxiosResponse;
    if (status >= 400) {
      throw new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, null, response);
    }
    return response;
  };
};

const authOf = (config: InternalAxiosRequestConfig) => config.headers.Authorization;
const refreshCalls = () => requests.filter((c) => c.url === "/api/user/refresh").length;

// Accepts only the "fresh" token; refresh hands one out
const tokenCheckingServer: Handler = (config) => {
  if (config.url === "/api/user/refresh") return { status: 200, data: userWith("fresh") };
  return authOf(config) === "Bearer fresh" ? { status: 200, data: "ok" } : { status: 401 };
};

let onExpired: jest.Mock;

beforeEach(() => {
  requests = [];
  useAuthStore.setState({ user: userWith("stale"), isAuthLoading: false });
  onExpired = jest.fn();
  setSessionExpiredHandler(onExpired);
});

describe("apiClient", () => {
  it("sends cookies with every request", () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  it("attaches the in-memory access token", async () => {
    serve(() => ({ status: 200 }));
    await apiClient.get("/api/chat");
    expect(authOf(requests[0])).toBe("Bearer stale");
  });

  it("refreshes on 401 and retries the request with the new token", async () => {
    serve(tokenCheckingServer);

    const res = await apiClient.get("/api/chat");

    expect(res.data).toBe("ok");
    expect(refreshCalls()).toBe(1);
    expect(authOf(requests[requests.length - 1])).toBe("Bearer fresh");
    expect(useAuthStore.getState().user?.token).toBe("fresh");
  });

  it("shares one refresh between concurrent 401s", async () => {
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => { releaseRefresh = resolve; });
    serve(async (config) => {
      if (config.url === "/api/user/refresh") {
        await refreshGate;
        return { status: 200, data: userWith("fresh") };
      }
      return tokenCheckingServer(config);
    });

    const all = Promise.all([apiClient.get("/a"), apiClient.get("/b"), apiClient.get("/c")]);
    await new Promise((r) => setTimeout(r, 0));
    releaseRefresh();
    const results = await all;

    expect(results.map((r) => r.data)).toEqual(["ok", "ok", "ok"]);
    expect(refreshCalls()).toBe(1);
  });

  it("ends the session once when the refresh token is rejected", async () => {
    serve(() => ({ status: 401 }));

    await expect(Promise.all([apiClient.get("/a"), apiClient.get("/b")])).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(refreshCalls()).toBe(1);
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("does not refresh when login itself answers 401", async () => {
    serve(() => ({ status: 401 }));

    await expect(apiClient.post("/api/user/login", {})).rejects.toBeTruthy();

    expect(refreshCalls()).toBe(0);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it("does not refresh twice for the same request", async () => {
    serve((config) =>
      config.url === "/api/user/refresh" ? { status: 200, data: userWith("fresh") } : { status: 401 }
    );

    await expect(apiClient.get("/api/chat")).rejects.toMatchObject({ response: { status: 401 } });

    expect(refreshCalls()).toBe(1);
  });
});
