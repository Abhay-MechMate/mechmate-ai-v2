const localPath = (relative: string) =>
  decodeURIComponent(new URL(relative, import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");

const config = {
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    pool: "threads",
  },
  resolve: {
    alias: {
      "@": localPath("./src"),
      "server-only": localPath("./src/lib/test/server-only-stub.ts"),
    },
  },
};

export default config;
