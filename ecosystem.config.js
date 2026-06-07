module.exports = {
  apps: [
    {
      name: "trade-backend",
      cwd: "./backend",
      script: "npm",
      args: "run start:prod",
      env: {
        PORT: 8989,
        NODE_ENV: "production",
      },
      watch: false,
    },
    {
      name: "trade-frontend",
      cwd: "./frontend",
      script: "npm",
      args: "run start -- -p 8386",
      env: {
        PORT: 8386,
        NODE_ENV: "production",
      },
      watch: false,
    },
    {
      name: "trade-worker",
      cwd: "./worker",
      script: "dotnet",
      args: "run --project worker.csproj -c Release",
      env: {
        PORT: 5001,
      },
      watch: false,
    },
  ],
};
