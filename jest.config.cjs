/** @type {import('jest').Config} */
module.exports = {
  rootDir: "backend",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.jest.json" }],
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  testTimeout: 30000,
};
