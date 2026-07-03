const RESET = "\x1b[0m";

// ANSI 256-color escape codes for the Instagram gradient theme: Purple -> Pink -> Orange -> Yellow
const F = "\x1b[94m"; // Frame (Bright Blue)

const colors = [
  "\x1b[38;5;93m",  // Deep Purple
  "\x1b[38;5;129m", // Purple
  "\x1b[38;5;163m", // Magenta/Pink
  "\x1b[38;5;197m", // Bright Pink
  "\x1b[38;5;203m", // Light Red/Orange
  "\x1b[38;5;208m", // Orange
  "\x1b[38;5;214m", // Light Orange
  "\x1b[38;5;220m"  // Gold/Yellow
];

// ASCII characters representation for each of the 8 letters in VIBECHAT (6 lines high)
const LETTERS = [
  // V (index 0)
  [
    "██╗   ██╗",
    "██║   ██║",
    "██║   ██║",
    "╚██╗ ██╔╝",
    "╚████╔╝ ",
    "╚═══╝  "
  ],
  // I (index 1)
  [
    "██╗",
    "██║",
    "██║",
    "██║",
    "██║",
    "╚═╝"
  ],
  // B (index 2)
  [
    "██████╗ ",
    "██╔══██╗",
    "██████╔╝",
    "██╔══██╗",
    "██████╔╝",
    "╚═════╝ "
  ],
  // E (index 3)
  [
    "███████╗ ",
    "██╔════╝",
    "█████╗  ",
    "██╔══╝  ",
    "███████╗",
    "╚══════╝ "
  ],
  // C (index 4)
  [
    "██████╗",
    "██╔════╝",
    "██║     ",
    "██║     ",
    "╚██████╗",
    "╚═════╝"
  ],
  // H (index 5)
  [
    "██╗  ██╗ ",
    "██║  ██║",
    "███████║",
    "██╔══██║",
    "██║  ██║",
    "╚═╝  ╚═╝"
  ],
  // A (index 6)
  [
    "█████╗ ",
    "██╔══██╗",
    "███████║",
    "██╔══██║",
    "██║  ██║",
    "╚═╝  ╚═╝"
  ],
  // T (index 7)
  [
    "████████╗",
    "╚══██╔══╝",
    "   ██║   ",
    "   ██║   ",
    "   ██║   ",
    "   ╚═╝   "
  ]
];

const getLetterBlock = (letterIndex: number, lineIndex: number, revealedCount: number): string => {
  const block = LETTERS[letterIndex][lineIndex];
  if (letterIndex < revealedCount) {
    return block;
  }
  return " ".repeat(block.length);
};

const getLogoString = (frameColors: string[], revealedCount: number): string => {
  const [V_c, I_c, B_c, E_c, C_c, H_c, A_c, T_c] = frameColors;

  const line1 = F + " __________________________________________________________________" + RESET;
  const line2 = F + "/                                                                  \\" + RESET;

  const getStyled = (letterIdx: number, lineIdx: number, colorCode: string): string => {
    const block = getLetterBlock(letterIdx, lineIdx, revealedCount);
    return colorCode + block + RESET;
  };

  const line3 = F + "|  " + getStyled(0, 0, V_c) + getStyled(1, 0, I_c) + getStyled(2, 0, B_c) + getStyled(3, 0, E_c) + getStyled(4, 0, C_c) + getStyled(5, 0, H_c) + getStyled(6, 0, A_c) + getStyled(7, 0, T_c) + F + "   |" + RESET;
  const line4 = F + "|  " + getStyled(0, 1, V_c) + getStyled(1, 1, I_c) + getStyled(2, 1, B_c) + getStyled(3, 1, E_c) + getStyled(4, 1, C_c) + getStyled(5, 1, H_c) + getStyled(6, 1, A_c) + getStyled(7, 1, T_c) + F + "   |" + RESET;
  const line5 = F + "|  " + getStyled(0, 2, V_c) + getStyled(1, 2, I_c) + getStyled(2, 2, B_c) + getStyled(3, 2, E_c) + getStyled(4, 2, C_c) + getStyled(5, 2, H_c) + getStyled(6, 2, A_c) + getStyled(7, 2, T_c) + F + "   |" + RESET;
  const line6 = F + "|  " + getStyled(0, 3, V_c) + getStyled(1, 3, I_c) + getStyled(2, 3, B_c) + getStyled(3, 3, E_c) + getStyled(4, 3, C_c) + getStyled(5, 3, H_c) + getStyled(6, 3, A_c) + getStyled(7, 3, T_c) + F + "   |" + RESET;
  
  // Note: Line 7 starts with 3 spaces in the frame: "|   "
  const line7 = F + "|   " + getStyled(0, 4, V_c) + getStyled(1, 4, I_c) + getStyled(2, 4, B_c) + getStyled(3, 4, E_c) + getStyled(4, 4, C_c) + getStyled(5, 4, H_c) + getStyled(6, 4, A_c) + getStyled(7, 4, T_c) + F + "   |" + RESET;
  
  // Note: Line 8 starts with 4 spaces in the frame: "|    "
  const line8 = F + "|    " + getStyled(0, 5, V_c) + getStyled(1, 5, I_c) + getStyled(2, 5, B_c) + getStyled(3, 5, E_c) + getStyled(4, 5, C_c) + getStyled(5, 5, H_c) + getStyled(6, 5, A_c) + getStyled(7, 5, T_c) + F + "   |" + RESET;

  const line9 = F + "\\__________________________________________________________________/" + RESET;
  const line10 = F + "                                                                  " + RESET;

  return [line1, line2, line3, line4, line5, line6, line7, line8, line9, line10].join("\n");
};

/**
 * Prints a beautiful color-shifting animated VibeChat ANSI logo matching the brand's Instagram-inspired theme to the console.
 * It first reveals the letters character by character, then runs the color wave animation indefinitely in the background.
 */
export const printLogo = async (): Promise<void> => {
  const revealDelay = 120; // 120ms delay per character revealed
  const waveDelay = 100;   // 100ms delay per wave shift frame

  // Clear terminal screen and reset cursor to top-left on startup
  process.stdout.write("\x1b[2J\x1b[1;1H");

  // 1. Reveal Phase (Character by Character)
  for (let revealed = 0; revealed <= 8; revealed++) {
    process.stdout.write("\x1b[1;1H"); // Move cursor to top-left
    process.stdout.write(getLogoString(colors, revealed) + "\n");
    await new Promise((resolve) => setTimeout(resolve, revealDelay));
  }

  // 2. Infinite Wave Phase (Gradient Animation)
  let frame = 1;
  setInterval(() => {
    // Save current cursor position so we don't mess up server logs printing below
    process.stdout.write("\x1b[s");
    
    // Move cursor to top-left of the viewport to overwrite the logo area
    process.stdout.write("\x1b[1;1H");

    // Rotate the colors array for the gradient shift effect
    const shiftedColors = colors.map((_, i) => colors[(i + frame) % colors.length]);
    process.stdout.write(getLogoString(shiftedColors, 8) + "\n");

    // Restore the cursor position to where the server logs are actively writing
    process.stdout.write("\x1b[u");

    frame++;
  }, waveDelay);
};
