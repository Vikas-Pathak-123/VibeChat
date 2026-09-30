import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Homepage from "./Homepage";
import { completeGoogleLogin } from "../store/session";
import { API_BASE_URL } from "../constants/api.constants";

jest.mock("../store/session", () => ({ completeGoogleLogin: jest.fn() }));

const CurrentUrl = () => {
  const location = useLocation();
  return <div data-testid="url">{location.pathname + location.search}</div>;
};

const renderAt = (url: string) =>
  render(
    <React.StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <ChakraProvider>
          <MemoryRouter initialEntries={[url]}>
            <Routes>
              <Route path="/" element={<><Homepage /><CurrentUrl /></>} />
            </Routes>
          </MemoryRouter>
        </ChakraProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );

beforeEach(() => {
  (completeGoogleLogin as jest.Mock).mockResolvedValue({ _id: "u1" });
});

describe("Homepage Google sign-in", () => {
  it("links to the Google OAuth flow", () => {
    renderAt("/");

    const link = screen.getByRole("link", { name: /continue with google/i });
    expect(link).toHaveAttribute("href", `${API_BASE_URL}/api/user/auth/google`);
  });

  it("exchanges the one-time code from the callback exactly once", async () => {
    renderAt("/?oauthCode=abc");

    await waitFor(() => expect(completeGoogleLogin).toHaveBeenCalledWith("abc"));
    expect(completeGoogleLogin).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId("url")).toHaveTextContent(/^\/$/));
  });

  it("explains when Google sign-in is not available", async () => {
    renderAt("/?authError=google_unavailable");

    expect(await screen.findByText(/google sign-in isn't available/i)).toBeInTheDocument();
    expect(completeGoogleLogin).not.toHaveBeenCalled();
  });

  it("reports an expired or reused code", async () => {
    (completeGoogleLogin as jest.Mock).mockRejectedValue(new Error("401"));
    renderAt("/?oauthCode=used");

    expect(await screen.findByText(/google sign-in expired/i)).toBeInTheDocument();
  });
});
