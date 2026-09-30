import { useAuthStore } from "./authStore";
import { User } from "../types";

const user: User = { _id: "u1", name: "Alice", email: "a@test.com", picture: "", token: "access-token" };

describe("authStore", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the access token in memory only", () => {
    useAuthStore.getState().setUser(user);

    expect(useAuthStore.getState().user?.token).toBe("access-token");
    expect(JSON.stringify({ ...localStorage })).not.toContain("access-token");
    expect(localStorage.length).toBe(0);
  });

  it("clears the user on logout", () => {
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthLoading).toBe(false);
  });
});
