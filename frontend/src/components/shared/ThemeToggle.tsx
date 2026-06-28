import { IconButton, useColorMode, Tooltip } from "@chakra-ui/react";
import { SunIcon, MoonIcon } from "@chakra-ui/icons";

/**
 * Theme toggle button — switches between Instagram dark and light mode.
 * Persists preference in localStorage via Chakra UI ColorModeProvider.
 */
const ThemeToggle: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === "dark";

  return (
    <Tooltip label={isDark ? "Switch to Light mode" : "Switch to Dark mode"} hasArrow placement="bottom">
      <IconButton
        aria-label="Toggle theme"
        icon={isDark ? <SunIcon /> : <MoonIcon />}
        onClick={toggleColorMode}
        variant="nav"
        size="sm"
        color="text-secondary"
        _hover={{ color: "text-primary", bg: "bg-elevated" }}
        borderRadius="8px"
      />
    </Tooltip>
  );
};

export default ThemeToggle;
