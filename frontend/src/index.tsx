import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter } from "react-router-dom";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import vibeChatTheme from "./theme";
import { queryClient } from "./store";
import ChatProvider from "./context/ChatProvider";

/**
 * App entry point.
 *
 * Provider order (outermost → innermost):
 * 1. ColorModeScript  — must be first to avoid flash of wrong theme
 * 2. BrowserRouter    — routing context
 * 3. QueryClientProvider — TanStack Query (server state)
 * 4. ChakraProvider   — UI theme
 * 5. ChatProvider     — Legacy Context (temporary until migrated in VIB-19/20)
 */
const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <ColorModeScript initialColorMode={vibeChatTheme.config.initialColorMode} />
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={vibeChatTheme}>
          <ChatProvider>
            <App />
          </ChatProvider>
        </ChakraProvider>
        {/* DevTools only in development — tree-shaken out of production build */}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
