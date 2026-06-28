import { extendTheme, type ThemeConfig } from "@chakra-ui/react";
import colors from "./colors";
import typography from "./typography";
import components from "./components";
import darkTokens from "./foundations/dark";
import lightTokens from "./foundations/light";

/**
 * Chakra UI config — defaults to dark mode, persists in localStorage.
 */
const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

/**
 * Semantic tokens map dark/light values to a single token name.
 * Usage in components: color="text-primary" (auto-switches with color mode)
 */
const semanticTokens = {
  colors: {
    "bg-app":          { default: lightTokens["bg-app"].default,          _dark: darkTokens["bg-app"].default },
    "bg-surface":      { default: lightTokens["bg-surface"].default,      _dark: darkTokens["bg-surface"].default },
    "bg-elevated":     { default: lightTokens["bg-elevated"].default,     _dark: darkTokens["bg-elevated"].default },
    "bg-input":        { default: lightTokens["bg-input"].default,        _dark: darkTokens["bg-input"].default },
    "border-subtle":   { default: lightTokens["border-subtle"].default,   _dark: darkTokens["border-subtle"].default },
    "border-strong":   { default: lightTokens["border-strong"].default,   _dark: darkTokens["border-strong"].default },
    "text-primary":    { default: lightTokens["text-primary"].default,    _dark: darkTokens["text-primary"].default },
    "text-secondary":  { default: lightTokens["text-secondary"].default,  _dark: darkTokens["text-secondary"].default },
    "text-disabled":   { default: lightTokens["text-disabled"].default,   _dark: darkTokens["text-disabled"].default },
    "accent":          { default: lightTokens["accent"].default,          _dark: darkTokens["accent"].default },
    "accent-hover":    { default: lightTokens["accent-hover"].default,    _dark: darkTokens["accent-hover"].default },
    "bubble-sent":     { default: lightTokens["bubble-sent"].default,     _dark: darkTokens["bubble-sent"].default },
    "bubble-received": { default: lightTokens["bubble-received"].default, _dark: darkTokens["bubble-received"].default },
    "online":          { default: lightTokens["online"].default,          _dark: darkTokens["online"].default },
  },
};

/**
 * Main VibeChat theme.
 * Import and pass to <ChakraProvider theme={vibeChatTheme}>.
 */
const vibeChatTheme = extendTheme({
  config,
  colors,
  semanticTokens,
  ...typography,
  components,
  styles: {
    global: {
      "html, body": {
        bg: "bg-app",
        color: "text-primary",
        fontFamily: "body",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      },
      // Custom Instagram-style scrollbar
      "::-webkit-scrollbar":       { width: "4px" },
      "::-webkit-scrollbar-track": { bg: "transparent" },
      "::-webkit-scrollbar-thumb": { bg: "accent", borderRadius: "full", opacity: 0.5 },
      // Remove blue outline on all focusable elements
      "*:focus": { outline: "none !important", boxShadow: "none !important" },
      "input:focus, textarea:focus": {
        borderColor: "accent !important",
        boxShadow: "0 0 0 1px #E1306C !important",
      },
    },
  },
});

export default vibeChatTheme;
