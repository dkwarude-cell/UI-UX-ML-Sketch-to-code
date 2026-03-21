module.exports = {
  apps: [
    {
      name: "sketchtocode-ml",
      script: "ml/daemon.py",
      interpreter: "python3",
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      log_file: "ml/engine/daemon.log",
    },
  ],
};
