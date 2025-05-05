// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

var fs = require("fs");

var path = require("path");

var { spawn, exec } = require("child_process");

var remoteApp = require("electron").remote.app;

var { shell } = require("electron");

var ipcRenderer = require("electron").ipcRenderer;

var settings = require("electron-settings");

var axios = require("axios");

var toastr = require("toastr");

var moment = require("moment");

var numeral = require("numeral");

var $ = require("jquery");

var popper = require("popper.js");

require("bootstrap");

const gpuPools = [
  {
    name: "Ethermine",
    algo: "ethash",
    url: "stratum+tcp://us1.ethermine.org:4444"
  },
  {
    name: "NiceHash",
    algo: "kawpow",
    url: "stratum+tcp://kawpow.eu.nicehash.com:3385"
  },
  { name: "F2Pool", algo: "ethash", url: "stratum+tcp://eth.f2pool.com:6688" },
  {
    name: "2Miners",
    algo: "kawpow",
    url: "stratum+tcp://kawpow.2miners.com:6060"
  }
];

const miners = [
  { name: "T-Rex Miner", command: "t-rex" },
  { name: "lolMiner", command: "lolMiner" },
  { name: "NBMiner", command: "nbminer" },
  { name: "GMiner", command: "gminer" }
];

toastr.options = {
  closeButton: false,
  debug: false,
  newestOnTop: false,
  progressBar: true,
  positionClass: "toast-bottom-full-width",
  preventDuplicates: false,
  onclick: null,
  showDuration: "300",
  hideDuration: "1000",
  timeOut: "3000",
  extendedTimeOut: "1000",
  showEasing: "swing",
  hideEasing: "linear",
  showMethod: "fadeIn",
  hideMethod: "fadeOut"
};

// prevent ENTER to submit our forms
window.addEventListener("keydown", function(e) {
  if (e.keyCode === 13) {
    e.preventDefault();
  }
});

var app = new Vue({
  el: "#app",

  data: {
    url: "https://api.nekosunevr.co.uk",
    minerGPU: null,
    minerCPU: null,
    activeTab: "miner",
    log: [],
    stats: {
      CPU: {
        hashrate: 0,
        totalHashes: 0,
        ping: 0,
        threads: 0
      },
      GPU: {
        hashrate: 0,
        totalHashes: 0,
        ping: 0,
        threads: 0
      },
      timer: 0,
      id: 0
    },
    formSettings: {
      type: settings.get("type", "cpu"),
      cputype: settings.get("cputype", "all"),
      cryptotype: settings.get("cryptotype", "XMR"),
      workerId: settings.get("worker_id", "1"),
      userId: settings.get("user_id", null),
      uac: settings.get("uac", "disabled")
    },
    formEstimateEarnings: {
      hashrate: null
    },
    estimatedEarnings: [],
    version: remoteApp.getVersion(),
    update: null
  },

  mounted: function() {
    this.logMessage("Log started.");

    this.checkForUpdates();

    setInterval(this.updateStats, 1000);

    setInterval(
      function() {
        if (this.isMining()) {
          this.stats.timer++;
        }
      }.bind(this),
      1000
    );
  },

  methods: {
    saveSettings: function() {
      settings.set("type", this.formSettings.type);
      settings.set("cputype", this.formSettings.cputype);
      settings.set("worker_id", this.formSettings.workerId);
      settings.set("cryptotype", this.formSettings.cryptotype);
      settings.set("user_id", this.formSettings.userId);
      settings.set("uac", this.formSettings.uac);

      toastr.remove();
      toastr.success("Successfully saved settings.");
    },

    toggleMiner: function() {
      if (!this.isMining()) {
        this.startMiner();
      } else {
        this.stopMiner();
      }
    },

    detectgpus: async function() {
      return new Promise(resolve => {
        exec(
          "nvidia-smi --query-gpu=name --format=csv,noheader",
          (error, stdout) => {
            let gpus = [];
            if (!error && stdout.trim()) {
              stdout.trim().split("\n").forEach((gpu, index) => {
                gpus.push({ id: `NVIDIA-${index}`, name: gpu.trim() });
              });
            }

            exec(
              "lspci | grep -i 'VGA' | grep -i 'AMD'",
              (amdError, amdStdout) => {
                if (!amdError && amdStdout.trim()) {
                  amdStdout.trim().split("\n").forEach((gpu, index) => {
                    gpus.push({ id: `AMD-${index}`, name: "AMD GPU" });
                  });
                }
                resolve(gpus);
              }
            );
          }
        );
      });
    },

    benchmark: async function() {
      var minerPath = path.join(
        __dirname,
        "miner",
        "multi",
        "trex",
        "t-rex"
      );

      const pools = [
        {
          name: "Ethereum Classic",
          algo: "etchash",
          url: "stratum+tcp://etc.kryptex.network:7777"
        },
        {
          name: "Ravencoin",
          algo: "kawpow",
          url: "stratum+tcp://rvn.kryptex.network:7777"
        }
      ];

      let bestPool = null;
      let bestHashRate = 0;

      for (const pool of pools) {
        const command = `${minerPath} --algo ${pool.algo} -o ${pool.url} -u krxXKVVKR6.worker -p x --benchmark`;
        try {
          const hashRate = await new Promise((resolve, reject) => {
            exec(command, { timeout: 30000 }, (error, stdout) => {
              if (error) reject(new Error("Failed"));
              const match = stdout.match(/hashrate: ([0-9.]+) MH\/s/i);
              if (match) resolve(parseFloat(match[1]));
              else reject(new Error("No Hashrate"));
            });
          });

          if (hashRate > bestHashRate) {
            bestHashRate = hashRate;
            bestPool = pool;
          }
        } catch (error) {
          console.log(`Skipping ${pool.name}`);
        }
      }

      return bestPool;
    },

    loadGPUs: async function() {
      const gpus = await this.detectgpus();
      const gpuList = document.getElementById("gpu-list");
      gpuList.innerHTML = "";
      gpus.forEach(gpu => {
        const li = document.createElement("li");
        li.textContent = gpu.name;
        gpuList.appendChild(li);
      });
    },

    startMiner: function() {
      if (!/^[0-9]+$/.test(this.formSettings.userId)) {
        toastr.remove();
        toastr.error('Please set a valid Miner UserID in the "Settings" tab.');
        return;
      }

      this.logMessage("Miner started.");

      const minerPathTRex = path.join(
        __dirname,
        "miner",
        "multi",
        "trex",
        "t-rex.exe"
      );
      const minerPathXmRig = path.join(
        __dirname,
        "miner",
        "multi",
        "xmrig",
        "xmrig"
      );

      const parameterstrex = [
        "-o", "stratum+tcp://etc.kryptex.network:7777",
        "-u", `krxXKVVKR6.${this.formSettings.userId}_${this.formSettings.workerId}`,
        "-p", "x",
        "-w", `NekoSuneVRMinerDonor_${this.formSettings.userId}_${this.formSettings.workerId}`,
        "-a", "etchash",
        "--api-bind-http",  "127.0.0.1:4067"
      ];

      let minerCpuThreads = ""; // Default to lowest setting
      switch (this.formSettings.cputype) {
        case "all":
          minerCpuThreads = ``
          break;
        case "high":
          minerCpuThreads = `--threads=8`;
          break;
        case "medium-4":
          minerCpuThreads = `--threads=7`;
          break;
        case "medium-3":
          minerCpuThreads = `--threads=6`;
          break;
        case "medium-2":
          minerCpuThreads = `--threads=5`;
          break;
        case "medium-1":
          minerCpuThreads = `--threads=4`;
          break;
        case "medium":
          minerCpuThreads = `--threads=3`;
          break;
        case "low":
          minerCpuThreads = `--threads=2`;
          break;
        case "verylow":
          minerCpuThreads = `--threads=1`;
          break;
      }

      const parametersxmrig = [
        "--url", "xmr.kryptex.network:7777",
        "--user", `krxXKVVKR6.${this.formSettings.userId}_${this.formSettings.workerId}`,
        "--pass", `x`,
        "--algo=RandomX",
        "--http-host=127.0.0.1",
        "--http-port=8888",
        "--donate-level=5",
        minerCpuThreads
      ];

      if (this.formSettings.type === "gpu_and_cpu") {
        this.minerGPU = spawn(minerPathTRex, parameterstrex);
        this.minerCPU = spawn(minerPathXmRig, parametersxmrig);
      } else if (this.formSettings.type === "gpu") {
        this.minerGPU = spawn(minerPathTRex, parameterstrex);
      } else if (this.formSettings.type === "cpu") {
        this.minerCPU = spawn(minerPathXmRig, parametersxmrig);
      }

      [this.minerGPU, this.minerCPU].forEach(miner => {
        if (miner) {
          miner.stdout.on("data", data => this.logMessage(data.toString()));
          miner.stderr.on("data", data => this.logMessage(data.toString()));
          miner.on("close", code => {
            this.logMessage(`Miner exited with code ${code}.`);
            if (code !== 0) {
              toastr.remove();
              toastr.error(
                'Miner stopped! Try running as administrator or use "Separate Console" option in Settings.'
              );
            }
            this.stopMiner();
          });
          miner.on("error", err =>
            this.logMessage(`Failed to start miner: ${err}`)
          );
        }
      });
    },

    stopMiner: function() {
      [this.minerGPU, this.minerCPU].forEach(miner => {
        if (miner) {
          miner.kill("SIGINT");
        }
      });
      this.minerGPU = null;
      this.minerCPU = null;
      this.resetStats();
      this.logMessage("Miner stopped.");
    },

    scrollToLogBottom: function() {
      setTimeout(
        function() {
          var box = this.$el.querySelector("#logs-box");
          //box.scrollTop = box.scrollHeight;
        }.bind(this),
        100
      );
    },

    changeActiveTab: function(name) {
      this.activeTab = name;
    },

    isMining: function() {
      return this.minerGPU !== null || this.minerCPU !== null;
    },

    updateStats: function() {
      if (!this.isMining()) {
        return;
      }

      var self = this;

      if (this.formSettings.type === "gpu_and_cpu") {
          Promise.all([
            axios.get("http://localhost:8888/1/summary"), // CPU stats
            axios.get("http://localhost:4067/summary")   // GPU stats
         ])
         .then(function([cpuResponse, gpuResponse]) {         
            self.stats.CPU.hashrate = cpuResponse.data.hashrate.total[0];
            self.stats.GPU.hashrate = gpuResponse.data.hashrate;
            self.stats.CPU.totalHashes = cpuResponse.data.results.hashes_total;
            self.stats.GPU.totalHashes = gpuResponse.data.gpus[0].shares.accepted_count;
            self.stats.CPU.ping = cpuResponse.data.connection.ping;
            self.stats.GPU.ping = gpuResponse.data.active_pool.ping;
            self.stats.CPU.threads = cpuResponse.data.hashrate.threads.length;
            self.stats.GPU.threads = gpuResponse.data.gpu_total;
        })
        .catch(function(error) {
          console.log(error);
        });
      } else if (this.formSettings.type === "gpu") {
        axios.get('http://localhost:4067/summary')
         .then(function(response) {
            self.stats.GPU.hashrate = response.data.hashrate;
            self.stats.GPU.totalHashes = response.data.gpus[0].shares.accepted_count;
            self.stats.GPU.ping = response.data.active_pool.ping;
            self.stats.GPU.threads = response.data.gpu_total;
        }).catch(function(error) {
           console.log(error);
        });
      } else if (this.formSettings.type === "cpu") {
        axios
        .get("http://localhost:8888/1/summary")
        .then(function(response) {
          self.stats.CPU.hashrate = response.data.hashrate.total[0];
          self.stats.CPU.totalHashes = response.data.results.hashes_total;
          self.stats.CPU.ping = response.data.connection.ping;
          self.stats.CPU.threads = response.data.hashrate.threads.length;
        })
        .catch(function(error) {
          console.log(error);
        });
      }
    },

    resetStats: function() {
      this.stats.CPU.hashrate = 0;
      this.stats.GPU.hashrate = 0;
      this.stats.CPU.totalHashes = 0;
      this.stats.GPU.totalHashes = 0;
      this.stats.CPU.ping = 0;
      this.stats.GPU.ping = 0;
      this.stats.CPU.threads = 0;
      this.stats.GPU.threads = 0;
      this.stats.timer = 0;
      this.stats.pending = 0;
    },

    logMessage: function(message) {
      // sometimes the miner logs 2 messages at once,
      // we need to split them by the date prefix each message has
      var regex = /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] : /;
      var messages = message.toString().split(regex);
      messages.forEach(
        function(msg) {
          if (msg !== "") {
            var obj = {
              date: "[" + moment().format("YYYY-MM-DD HH:mm:ss") + "]",
              message: msg
            };
            this.log.push(obj);
            console.log(`${obj.date} ${obj.message}`);
            if (this.log.length > 1000) {
              this.log.shift();
            }
          }
        }.bind(this)
      );
    },

    openExternal: function(url) {
      shell.openExternal(url);
    },

    checkForUpdates: function() {
      var self = this;
      axios({
        method: "GET",
        url: this.urls.api.CheckForUpdates + self.version
      })
        .then(function(response) {
          self.update = response.data.support.result;
        })
        .catch(function(error) {
          console.log(error);
        });
    },

    formatInteger: function(value) {
      return numeral(value).format("0,0");
    },

    formatFloat: function(value) {
      return numeral(value).format("0,0.00");
    }
  },

  computed: {
    toggleMinerText: function() {
      if (!this.isMining()) {
        return "Start Miner";
      } else {
        return "Stop Miner";
      }
    },

    toggleMinerClass: function() {
      return {
        "btn-primary": !this.isMining(),
        "btn-danger": this.isMining()
      };
    },

    minerWatch: function() {
      var duration = moment.duration(this.stats.timer, "seconds");
      return `${duration.years()} years, ${duration.months()} months, ${duration.days()} days, ${duration.hours()} hours, ${duration.minutes()} minutes, ${duration.seconds()} seconds`;
    },

    minerHashrate: function() {
      var cpuHashrate = this.stats.CPU.hashrate === null ? 0 : this.stats.CPU.hashrate;
      var gpuHashrate = this.stats.GPU.hashrate === null ? 0 : this.stats.GPU.hashrate;

      function formatHashrate(hashrate) {
        if (hashrate < 1e3) {
            return `${hashrate.toFixed(2)} H/s`;
        } else if (hashrate < 1e6) {
            return `${(hashrate / 1e3).toFixed(2)} KH/s`;
        } else if (hashrate < 1e9) {
            return `${(hashrate / 1e6).toFixed(2)} MH/s`;
        } else if (hashrate < 1e12) {
            return `${(hashrate / 1e9).toFixed(2)} GH/s`;
        } else if (hashrate < 1e15) {
            return `${(hashrate / 1e12).toFixed(2)} TH/s`;
        } else if (hashrate < 1e18) {
            return `${(hashrate / 1e15).toFixed(2)} PH/s`;
        } else {
            return `${(hashrate / 1e18).toFixed(2)} EH/s`; // Exahashes per second
        }
      }

      if (this.formSettings.type === "gpu_and_cpu") {
         return `CPU: ${formatHashrate(cpuHashrate)}, GPU: ${formatHashrate(gpuHashrate)}`;
      } else if (this.formSettings.type === "gpu") {
        return `${formatHashrate(gpuHashrate)}`; // Exahashes per second
      } else if (this.formSettings.type === "cpu") {
        return `${formatHashrate(cpuHashrate)}`; // Exahashes per second
      }      
    },

    minerHashes: function() {
      var cpuHashes = this.stats.CPU.totalHashes === null ? 0 : this.stats.CPU.totalHashes;
      var gpuHashes = this.stats.GPU.totalHashes === null ? 0 : this.stats.GPU.totalHashes;
      if (this.formSettings.type === "gpu_and_cpu") {
         return `CPU: ${numeral(cpuHashes).format("0,0")} Hashes, GPU: ${numeral(gpuHashes).format("0,0")} Hashes`;
      } else if (this.formSettings.type === "gpu") {
        return `${numeral(gpuHashes).format("0,0")} Hashes`;
      } else if (this.formSettings.type === "cpu") {
        return `${numeral(cpuHashes).format("0,0")} Hashes`;
      }
    },

    minerPing: function() {
      var cpuPing = this.stats.CPU.ping === null ? 0 : this.stats.CPU.ping ;
      var gpuPing = this.stats.GPU.ping === null ? 0 : this.stats.GPU.ping;
      if (this.formSettings.type === "gpu_and_cpu") {
         return `CPU: ${numeral(cpuPing).format("0,0")} ms, GPU: ${numeral(gpuPing).format("0,0")} ms`;
      } else if (this.formSettings.type === "gpu") {
        return `${numeral(gpuPing).format("0,0")} ms`;
      } else if (this.formSettings.type === "cpu") {
        return `${numeral(cpuPing).format("0,0")} ms`;
      }
    },

    minerThreads: function() {
      if (this.formSettings.type === "gpu_and_cpu") {
         return `CPU: ${this.stats.CPU.threads}, GPU: ${this.stats.GPU.threads}`;
      } else if (this.formSettings.type === "gpu") {
        return `${this.stats.GPU.threads}`;
      } else if (this.formSettings.type === "cpu") {
        return `${this.stats.CPU.threads}`;
      }
    },

    minerID: function() {
      return `${this.stats.id}`;
    },

    urls: function() {
      var self = this;
      return {
        api: {
          CheckForUpdates: `${this
            .url}/v4/cryptoendpoint/miner/CheckForUpdates/`
        },
        web: {
          EarnMining:
            `https://github.com/ChisdealHDAPP/nekosunevrapp-miner-donations/releases/` +
            self.version,
          PanelAccountDetails: `https://apps.nekosunevr.co.uk/`
        }
      };
    }
  },

  watch: {
    log: function(newVal, oldVal) {
      this.scrollToLogBottom();
    },

    activeTab: function(newVal, oldVal) {
      if (newVal === "logs") {
        this.scrollToLogBottom();
      }
    },

    update: function(newVal, oldVal) {
      if (newVal.update_available && newVal.backward_compatible) {
        setTimeout(function() {
          $("#updateModal").modal();
        }, 1000);
      }
    }
  }
});
