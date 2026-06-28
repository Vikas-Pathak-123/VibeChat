/**
 * Chakra UI component-level theme overrides.
 * Styled to match Instagram's clean aesthetic.
 */
const components = {
  Button: {
    baseStyle: {
      fontWeight: "semibold",
      borderRadius: "8px",
      _focus: { boxShadow: "none" },
    },
    variants: {
      // Primary gradient button — used for main CTAs
      primary: {
        bgGradient: "linear(to-r, #833AB4, #E1306C, #F77737)",
        color: "white",
        _hover: {
          bgGradient: "linear(to-r, #6f2f99, #c1275c, #d4662e)",
          transform: "translateY(-1px)",
          boxShadow: "0 4px 15px rgba(225,48,108,0.35)",
        },
        _active: { transform: "translateY(0)" },
        transition: "all 0.2s",
      },
      // Ghost button for nav items
      nav: {
        bg: "transparent",
        color: "text-secondary",
        _hover: { bg: "bg-elevated", color: "text-primary" },
        borderRadius: "8px",
      },
    },
    defaultProps: { variant: "primary" },
  },
  Input: {
    variants: {
      insta: {
        field: {
          bg: "bg-input",
          border: "1px solid",
          borderColor: "border-subtle",
          color: "text-primary",
          borderRadius: "8px",
          _placeholder: { color: "text-disabled" },
          _focus: {
            borderColor: "accent",
            boxShadow: "0 0 0 1px #E1306C",
            bg: "bg-elevated",
          },
        },
      },
    },
    defaultProps: { variant: "insta", size: "md" },
  },
  Modal: {
    baseStyle: {
      dialog: {
        bg: "bg-surface",
        border: "1px solid",
        borderColor: "border-subtle",
        borderRadius: "12px",
      },
      header: { color: "text-primary", fontWeight: "semibold" },
      body:   { color: "text-primary" },
      closeButton: { color: "text-secondary" },
    },
  },
  Menu: {
    baseStyle: {
      list: {
        bg: "bg-surface",
        border: "1px solid",
        borderColor: "border-subtle",
        borderRadius: "8px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
        py: 1,
      },
      item: {
        bg: "transparent",
        color: "text-primary",
        fontSize: "sm",
        _hover: { bg: "bg-elevated" },
      },
      divider: { borderColor: "border-subtle" },
    },
  },
  Drawer: {
    baseStyle: {
      dialog: { bg: "bg-surface" },
      header: {
        color: "text-primary",
        borderBottomColor: "border-subtle",
        fontWeight: "semibold",
      },
      body: { color: "text-primary" },
    },
  },
  Skeleton: {
    baseStyle: {
      borderRadius: "8px",
    },
  },
};

export default components;
