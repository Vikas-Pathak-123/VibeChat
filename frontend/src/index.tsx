import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter } from "react-router-dom";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import ChatProvider from "./context/ChatProvider";
import vibeChatTheme from "./theme";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    {/* ColorModeScript persists theme preference in localStorage */}
    <ColorModeScript initialColorMode={vibeChatTheme.config.initialColorMode} />
    <BrowserRouter>
      <ChatProvider>
        <ChakraProvider theme={vibeChatTheme}>
          <App />
        </ChakraProvider>
      </ChatProvider>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
