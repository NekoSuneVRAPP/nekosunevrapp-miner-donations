// This file is required by the index.html file and is executed in the
// renderer process. Node.js APIs are available because this app targets
// legacy Electron with nodeIntegration enabled.

var fs = require("fs");
var path = require("path");
var https = require("https");
var http = require("http");
var urlParser = require("url");
var { spawn, exec } = require("child_process");
var remoteApp = require("electron").remote.app;
var { shell, clipboard } = require("electron");
var settings = require("electron-settings");
var axios = require("axios");
var toastr = require("toastr");
var moment = require("moment");
var numeral = require("numeral");
var $ = require("jquery");

window.jQuery = window.$ = $;
require("bootstrap");

const MINER_ROOT = path.join(__dirname, "miner", "multi");
const CURRENT_RUNTIME = {
  platform: process.platform,
  arch: process.arch,
  isWindows: process.platform === "win32",
  isLinux: process.platform === "linux",
  label: `${process.platform} ${process.arch}`
};

function minerExecutableName(binaryNames) {
  if (CURRENT_RUNTIME.isWindows) {
    return binaryNames.win32;
  }

  return binaryNames.linux || binaryNames.win32;
}

function minerExpectedPath(id, binaryNames) {
  return path.join(MINER_ROOT, id, minerExecutableName(binaryNames));
}

const UNMINEABLE_POOLS = {
  cpu: [
    {
      id: "randomx",
      name: "RandomX CPU",
      algo: "rx/0",
      url: "rx.unmineable.com:3333",
      displayUrl: "rx.unmineable.com:3333",
      hardware: "CPU",
      minerIds: ["xmrig"],
      stabilityWeight: 1.15,
      note: "Best default for CPU mining and low-power AMD APUs/Raspberry Pi."
    },
    {
      id: "ghostrider",
      name: "GhostRider CPU",
      algo: "ghostrider",
      url: "ghostrider.unmineable.com:3333",
      displayUrl: "ghostrider.unmineable.com:3333",
      hardware: "CPU",
      minerIds: ["xmrig"],
      stabilityWeight: 0.95,
      note: "CPU alternative; benchmark before using long term."
    }
  ],
  gpu: [
    {
      id: "etchash",
      name: "Etchash GPU",
      algo: "etchash",
      url: "stratum+tcp://etchash.unmineable.com:3333",
      displayUrl: "etchash.unmineable.com:3333",
      hardware: "GPU",
      minerIds: ["trex", "lolminer", "nbminer", "gminer"],
      stabilityWeight: 1.1,
      note: "Good first choice for GPUs with enough VRAM."
    },
    {
      id: "kawpow",
      name: "KawPow GPU",
      algo: "kawpow",
      url: "stratum+tcp://kp.unmineable.com:3333",
      displayUrl: "kp.unmineable.com:3333",
      hardware: "GPU",
      minerIds: ["trex", "nbminer", "gminer"],
      stabilityWeight: 1,
      note: "Often useful on NVIDIA cards and some AMD cards."
    },
    {
      id: "autolykos2",
      name: "Autolykos2 GPU",
      algo: "autolykos2",
      url: "stratum+tcp://autolykos.unmineable.com:3333",
      displayUrl: "autolykos.unmineable.com:3333",
      hardware: "GPU",
      minerIds: ["trex", "lolminer", "nbminer", "gminer"],
      stabilityWeight: 0.95,
      note: "Memory-oriented GPU algorithm."
    },
    {
      id: "octopus",
      name: "Octopus GPU",
      algo: "octopus",
      url: "stratum+tcp://octopus.unmineable.com:3333",
      displayUrl: "octopus.unmineable.com:3333",
      hardware: "GPU",
      minerIds: ["trex", "nbminer", "gminer"],
      stabilityWeight: 0.9,
      note: "GPU alternative; can be good on selected NVIDIA cards."
    },
    {
      id: "kheavyhash",
      name: "KHeavyHash GPU",
      algo: "kheavyhash",
      url: "stratum+tcp://kheavyhash.unmineable.com:3333",
      displayUrl: "kheavyhash.unmineable.com:3333",
      hardware: "GPU",
      minerIds: ["lolminer", "gminer", "rigel", "bzminer", "srbminer"],
      stabilityWeight: 0.9,
      note: "Low-power GPU option on supported miners."
    },
    {
      id: "karlsenhash",
      name: "KarlsenHash GPU",
      algo: "karlsenhash",
      url: "stratum+tcp://karlsenhash.unmineable.com:3333",
      displayUrl: "karlsenhash.unmineable.com:3333",
      hardware: "GPU",
      minerIds: ["rigel", "bzminer", "srbminer"],
      stabilityWeight: 0.86,
      note: "Newer GPU algorithm; support depends on miner version."
    },
    {
      id: "nexapow",
      name: "Nexapow GPU",
      algo: "nexapow",
      url: "stratum+tcp://nexapow.unmineable.com:3333",
      displayUrl: "nexapow.unmineable.com:3333",
      hardware: "GPU",
      minerIds: ["rigel", "bzminer"],
      stabilityWeight: 0.86,
      note: "GPU option for NEXA-based mining."
    },
    {
      id: "zelhash",
      name: "ZelHash GPU",
      algo: "zelhash",
      url: "stratum+tcp://zelhash.unmineable.com:3333",
      displayUrl: "zelhash.unmineable.com:3333",
      hardware: "GPU",
      minerIds: ["gminer"],
      stabilityWeight: 0.85,
      note: "Equihash-family GPU option."
    },
    {
      id: "beamhash",
      name: "BeamHash GPU",
      algo: "beamhash",
      url: "stratum+tcp://beamhash.unmineable.com:3333",
      displayUrl: "beamhash.unmineable.com:3333",
      hardware: "GPU",
      minerIds: ["lolminer", "gminer"],
      stabilityWeight: 0.85,
      note: "Supported by selected AMD/NVIDIA miners."
    },
    {
      id: "blake3",
      name: "Blake3 GPU",
      algo: "blake3",
      url: "stratum+tcp://blake3.unmineable.com:3333",
      displayUrl: "blake3.unmineable.com:3333",
      hardware: "GPU",
      minerIds: ["lolminer", "rigel", "bzminer", "srbminer"],
      stabilityWeight: 0.85,
      note: "unMineable documents Blake3 pool setup for GPU mining."
    },
    {
      id: "fishhash",
      name: "FishHash GPU",
      algo: "fishhash",
      url: "stratum+tcp://fishhash.unmineable.com:3333",
      displayUrl: "fishhash.unmineable.com:3333",
      hardware: "GPU",
      minerIds: ["lolminer", "rigel", "bzminer", "srbminer"],
      stabilityWeight: 0.85,
      note: "Newer GPU algorithm; benchmark before long sessions."
    },
    {
      id: "xelishash",
      name: "XelisHash GPU",
      algo: "xelishash",
      url: "stratum+tcp://xelishash.unmineable.com:3333",
      displayUrl: "xelishash.unmineable.com:3333",
      hardware: "GPU",
      minerIds: ["lolminer", "rigel", "bzminer", "srbminer"],
      stabilityWeight: 0.85,
      note: "Newer GPU algorithm; support depends on miner version."
    }
  ]
};

const MINER_SOFTWARE = [
  {
    id: "xmrig",
    name: "XMRig",
    role: "CPU RandomX / GhostRider",
    binaryNames: { win32: "xmrig.exe", linux: "xmrig" },
    expectedPath: minerExpectedPath("xmrig", { win32: "xmrig.exe", linux: "xmrig" }),
    executableName: minerExecutableName({ win32: "xmrig.exe", linux: "xmrig" }),
    repo: "xmrig/xmrig",
    assetMatchers: {
      win32: [/windows-x64\.zip$/i, /msvc-win64\.zip$/i, /win64.*\.zip$/i],
      linuxX64: [/linux-static-x64\.tar\.gz$/i, /linux.*x64.*\.tar\.gz$/i],
      linuxArm64: [/linux.*arm64.*\.tar\.gz$/i, /linux.*armv8.*\.tar\.gz$/i],
      linuxArmv7: [/linux.*armv7.*\.tar\.gz$/i, /linux.*armhf.*\.tar\.gz$/i, /linux.*arm.*\.tar\.gz$/i]
    },
    supportedPools: ["randomx", "ghostrider"],
    supportedPlatforms: ["win32-x64", "linux-x64", "linux-arm64", "linux-arm"],
    downloadUrl: "https://github.com/xmrig/xmrig/releases",
    requiredFor: "CPU mining, AMD APU fallback, and Raspberry Pi CPU mining"
  },
  {
    id: "trex",
    name: "T-Rex Miner",
    role: "NVIDIA GPU",
    binaryNames: { win32: "t-rex.exe", linux: "t-rex" },
    expectedPath: minerExpectedPath("trex", { win32: "t-rex.exe", linux: "t-rex" }),
    executableName: minerExecutableName({ win32: "t-rex.exe", linux: "t-rex" }),
    repo: "trexminer/T-Rex",
    assetMatchers: {
      win32: [/win.*\.zip$/i],
      linuxX64: [/linux.*\.tar\.gz$/i]
    },
    supportedPools: ["etchash", "kawpow", "autolykos2", "octopus"],
    supportedPlatforms: ["win32-x64", "linux-x64"],
    downloadUrl: "https://github.com/trexminer/T-Rex/releases",
    requiredFor: "NVIDIA GPU mining and benchmark"
  },
  {
    id: "lolminer",
    name: "lolMiner",
    role: "AMD/NVIDIA GPU",
    binaryNames: { win32: "lolMiner.exe", linux: "lolMiner" },
    expectedPath: minerExpectedPath("lolminer", { win32: "lolMiner.exe", linux: "lolMiner" }),
    executableName: minerExecutableName({ win32: "lolMiner.exe", linux: "lolMiner" }),
    repo: "Lolliedieb/lolMiner-releases",
    assetMatchers: {
      win32: [/win64.*\.zip$/i, /win.*\.zip$/i],
      linuxX64: [/linux.*\.tar\.gz$/i]
    },
    supportedPools: ["etchash", "autolykos2", "kheavyhash", "beamhash", "blake3", "fishhash", "xelishash"],
    supportedPlatforms: ["win32-x64", "linux-x64"],
    downloadUrl: "https://github.com/Lolliedieb/lolMiner-releases/releases",
    requiredFor: "AMD/NVIDIA GPU mining and broader unMineable algorithm testing"
  },
  {
    id: "nbminer",
    name: "NBMiner",
    role: "GPU",
    binaryNames: { win32: "nbminer.exe", linux: "nbminer" },
    expectedPath: minerExpectedPath("nbminer", { win32: "nbminer.exe", linux: "nbminer" }),
    executableName: minerExecutableName({ win32: "nbminer.exe", linux: "nbminer" }),
    repo: "NebuTech/NBMiner",
    assetMatchers: {
      win32: [/win.*\.zip$/i],
      linuxX64: [/linux.*\.tgz$/i, /linux.*\.tar\.gz$/i]
    },
    supportedPools: ["etchash", "kawpow", "autolykos2", "octopus"],
    supportedPlatforms: ["win32-x64", "linux-x64"],
    downloadUrl: "https://github.com/NebuTech/NBMiner/releases",
    requiredFor: "Optional GPU miner"
  },
  {
    id: "gminer",
    name: "GMiner",
    role: "GPU",
    binaryNames: { win32: "miner.exe", linux: "miner" },
    expectedPath: minerExpectedPath("gminer", { win32: "miner.exe", linux: "miner" }),
    executableName: minerExecutableName({ win32: "miner.exe", linux: "miner" }),
    repo: "develsoftware/GMinerRelease",
    assetMatchers: {
      win32: [/windows64.*\.zip$/i, /win64.*\.zip$/i],
      linuxX64: [/linux64.*\.tar\.xz$/i, /linux.*\.tar\.xz$/i, /linux.*\.tar\.gz$/i]
    },
    supportedPools: ["etchash", "kawpow", "autolykos2", "octopus", "kheavyhash", "zelhash", "beamhash"],
    supportedPlatforms: ["win32-x64", "linux-x64"],
    downloadUrl: "https://github.com/develsoftware/GMinerRelease/releases",
    requiredFor: "Optional GPU miner"
  },
  {
    id: "srbminer",
    name: "SRBMiner-Multi",
    role: "CPU/GPU multi-algorithm",
    binaryNames: { win32: "SRBMiner-MULTI.exe", linux: "SRBMiner-MULTI" },
    expectedPath: minerExpectedPath("srbminer", { win32: "SRBMiner-MULTI.exe", linux: "SRBMiner-MULTI" }),
    executableName: minerExecutableName({ win32: "SRBMiner-MULTI.exe", linux: "SRBMiner-MULTI" }),
    repo: "doktor83/SRBMiner-Multi",
    assetMatchers: {
      win32: [/win64\.zip$/i, /windows.*\.zip$/i],
      linuxX64: [/linux\.tar\.gz$/i, /linux.*\.tar\.gz$/i]
    },
    supportedPools: ["randomx", "ghostrider", "kheavyhash", "karlsenhash", "blake3", "fishhash", "xelishash"],
    supportedPlatforms: ["win32-x64", "linux-x64"],
    downloadUrl: "https://github.com/doktor83/SRBMiner-Multi/releases",
    requiredFor: "Broad CPU/GPU algorithm testing"
  },
  {
    id: "bzminer",
    name: "BzMiner",
    role: "GPU multi-algorithm",
    binaryNames: { win32: "bzminer.exe", linux: "bzminer" },
    expectedPath: minerExpectedPath("bzminer", { win32: "bzminer.exe", linux: "bzminer" }),
    executableName: minerExecutableName({ win32: "bzminer.exe", linux: "bzminer" }),
    repo: "bzminer/bzminer",
    assetMatchers: {
      win32: [/windows.*\.zip$/i, /win.*\.zip$/i],
      linuxX64: [/linux.*\.tar\.gz$/i]
    },
    supportedPools: ["kheavyhash", "karlsenhash", "nexapow", "blake3", "fishhash", "xelishash"],
    supportedPlatforms: ["win32-x64", "linux-x64"],
    downloadUrl: "https://github.com/bzminer/bzminer/releases",
    requiredFor: "Newer GPU algorithm testing"
  },
  {
    id: "rigel",
    name: "Rigel",
    role: "NVIDIA GPU multi-algorithm",
    binaryNames: { win32: "rigel.exe", linux: "rigel" },
    expectedPath: minerExpectedPath("rigel", { win32: "rigel.exe", linux: "rigel" }),
    executableName: minerExecutableName({ win32: "rigel.exe", linux: "rigel" }),
    repo: "rigelminer/rigel",
    assetMatchers: {
      win32: [/win.*\.zip$/i],
      linuxX64: [/linux.*\.tar\.gz$/i]
    },
    supportedPools: ["kheavyhash", "karlsenhash", "nexapow", "blake3", "fishhash", "xelishash", "autolykos2"],
    supportedPlatforms: ["win32-x64", "linux-x64"],
    downloadUrl: "https://github.com/rigelminer/rigel/releases",
    requiredFor: "NVIDIA testing on newer GPU algorithms"
  }
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

window.addEventListener("keydown", function(e) {
  if (e.keyCode === 13) {
    e.preventDefault();
  }
});

function getSetting(key, fallback) {
  var value = settings.get(key, fallback);
  return value === undefined || value === null ? fallback : value;
}

function toNumber(value) {
  var parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function getRuntimePlatformKey() {
  if (CURRENT_RUNTIME.platform === "win32") {
    return "win32-" + CURRENT_RUNTIME.arch;
  }

  if (CURRENT_RUNTIME.platform === "linux" && CURRENT_RUNTIME.arch === "x64") {
    return "linux-x64";
  }

  if (CURRENT_RUNTIME.platform === "linux" && CURRENT_RUNTIME.arch === "arm64") {
    return "linux-arm64";
  }

  if (CURRENT_RUNTIME.platform === "linux" && /^arm/.test(CURRENT_RUNTIME.arch)) {
    return "linux-arm";
  }

  return CURRENT_RUNTIME.platform + "-" + CURRENT_RUNTIME.arch;
}

function getAssetMatcherGroup(item) {
  if (CURRENT_RUNTIME.platform === "win32") {
    return item.assetMatchers.win32 || [];
  }

  if (CURRENT_RUNTIME.platform === "linux" && CURRENT_RUNTIME.arch === "x64") {
    return item.assetMatchers.linuxX64 || [];
  }

  if (CURRENT_RUNTIME.platform === "linux" && CURRENT_RUNTIME.arch === "arm64") {
    return item.assetMatchers.linuxArm64 || item.assetMatchers.linuxArmv7 || [];
  }

  if (CURRENT_RUNTIME.platform === "linux" && /^arm/.test(CURRENT_RUNTIME.arch)) {
    return item.assetMatchers.linuxArmv7 || item.assetMatchers.linuxArm64 || [];
  }

  return [];
}

function isRuntimeSupported(item) {
  return (item.supportedPlatforms || []).indexOf(getRuntimePlatformKey()) !== -1;
}

function hashrateToHps(value, unit) {
  var multiplier = 1;
  var normalized = (unit || "h/s").toLowerCase();

  if (normalized.indexOf("kh") === 0) multiplier = 1e3;
  if (normalized.indexOf("mh") === 0) multiplier = 1e6;
  if (normalized.indexOf("gh") === 0) multiplier = 1e9;
  if (normalized.indexOf("th") === 0) multiplier = 1e12;
  if (normalized.indexOf("ph") === 0) multiplier = 1e15;

  return toNumber(value) * multiplier;
}

function formatHashrateValue(hashrate) {
  var value = toNumber(hashrate);

  if (value < 1e3) return `${value.toFixed(2)} H/s`;
  if (value < 1e6) return `${(value / 1e3).toFixed(2)} KH/s`;
  if (value < 1e9) return `${(value / 1e6).toFixed(2)} MH/s`;
  if (value < 1e12) return `${(value / 1e9).toFixed(2)} GH/s`;
  if (value < 1e15) return `${(value / 1e12).toFixed(2)} TH/s`;
  return `${(value / 1e15).toFixed(2)} PH/s`;
}

function sanitizePathPart(value) {
  return String(value || "latest").replace(/[^a-z0-9._-]/gi, "_");
}

function escapePowerShellString(value) {
  return String(value).replace(/'/g, "''");
}

function ensureDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    return;
  }

  ensureDirectory(path.dirname(dirPath));
  fs.mkdirSync(dirPath);
}

function isPathInside(childPath, parentPath) {
  var child = path.resolve(childPath).toLowerCase();
  var parent = path.resolve(parentPath).toLowerCase();
  return child === parent || child.indexOf(parent + path.sep) === 0;
}

function removeDirectoryRecursive(dirPath, allowedRoot) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  if (!isPathInside(dirPath, allowedRoot)) {
    throw new Error("Refusing to remove a directory outside the installer workspace.");
  }

  fs.readdirSync(dirPath).forEach(function(entry) {
    var entryPath = path.join(dirPath, entry);
    var stat = fs.lstatSync(entryPath);

    if (stat.isDirectory()) {
      removeDirectoryRecursive(entryPath, allowedRoot);
    } else {
      fs.unlinkSync(entryPath);
    }
  });

  fs.rmdirSync(dirPath);
}

function copyDirectoryRecursive(sourceDir, targetDir) {
  ensureDirectory(targetDir);

  fs.readdirSync(sourceDir).forEach(function(entry) {
    var sourcePath = path.join(sourceDir, entry);
    var targetPath = path.join(targetDir, entry);
    var stat = fs.lstatSync(sourcePath);

    if (stat.isDirectory()) {
      copyDirectoryRecursive(sourcePath, targetPath);
    } else {
      fs.writeFileSync(targetPath, fs.readFileSync(sourcePath));
    }
  });
}

function findFileRecursive(rootDir, fileName) {
  if (!fs.existsSync(rootDir)) {
    return null;
  }

  var entries = fs.readdirSync(rootDir);

  for (var i = 0; i < entries.length; i++) {
    var entryPath = path.join(rootDir, entries[i]);
    var stat = fs.lstatSync(entryPath);

    if (stat.isDirectory()) {
      var found = findFileRecursive(entryPath, fileName);
      if (found) {
        return found;
      }
    } else if (entries[i].toLowerCase() === fileName.toLowerCase()) {
      return entryPath;
    }
  }

  return null;
}

function getMinerMetadataPath(item) {
  return path.join(path.dirname(item.expectedPath), ".miner-install.json");
}

function readMinerInstallMetadata(item) {
  var metadataPath = getMinerMetadataPath(item);

  if (!fs.existsSync(metadataPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  } catch (error) {
    return {};
  }
}

function writeMinerInstallMetadata(item) {
  var metadataPath = getMinerMetadataPath(item);
  ensureDirectory(path.dirname(metadataPath));
  fs.writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        minerId: item.id,
        name: item.name,
        version: item.latestVersion || null,
        assetName: item.assetName || null,
        installedAt: new Date().toISOString(),
        platform: CURRENT_RUNTIME.platform,
        arch: CURRENT_RUNTIME.arch
      },
      null,
      2
    )
  );
}

function getInstalledMinerVersion(item) {
  var metadata = readMinerInstallMetadata(item);
  return metadata.version || getSetting(`miner_${item.id}_version`, null);
}

function downloadFile(url, destinationPath, redirectsRemaining) {
  redirectsRemaining = redirectsRemaining === undefined ? 5 : redirectsRemaining;

  return new Promise(function(resolve, reject) {
    var client = /^https:/i.test(url) ? https : http;
    var requestOptions = urlParser.parse(url);
    requestOptions.headers = {
      "User-Agent": "NekoSuneVR-Donation-Miner"
    };

    var request = client.get(requestOptions, function(response) {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location &&
          redirectsRemaining > 0
        ) {
          response.resume();
          resolve(downloadFile(urlParser.resolve(url, response.headers.location), destinationPath, redirectsRemaining - 1));
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error("Download failed with HTTP " + response.statusCode));
          return;
        }

        var file = fs.createWriteStream(destinationPath);
        var done = false;
        var finish = function(error) {
          if (done) {
            return;
          }

          done = true;

          if (error) {
            try {
              fs.unlinkSync(destinationPath);
            } catch (unlinkError) {}

            reject(error);
            return;
          }

          resolve();
        };

        response.on("error", finish);
        file.on("error", finish);
        file.on("close", function() {
          finish();
        });
        response.pipe(file);
      });

    request.on("error", function(error) {
      try {
        fs.unlinkSync(destinationPath);
      } catch (unlinkError) {}

      reject(error);
    });
  });
}

var app = new Vue({
  el: "#app",

  data: {
    url: "https://api.nekosunevr.co.uk",
    minerGPU: null,
    minerCPU: null,
    activeMiningType: null,
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
      type: getSetting("type", "auto"),
      cputype: getSetting("cputype", "all"),
      cryptotype: getSetting("cryptotype", "XMR"),
      workerId: getSetting("worker_id", "1"),
      userId: getSetting("user_id", null),
      unmineableAccount: getSetting("unmineable_account", "nekosunevr"),
      poolMode: getSetting("pool_mode", "auto"),
      cpuPoolId: getSetting("cpu_pool_id", "randomx"),
      gpuPoolId: getSetting("gpu_pool_id", "etchash"),
      cpuMinerId: getSetting("cpu_miner_id", "xmrig"),
      gpuMinerId: getSetting("gpu_miner_id", "auto"),
      estimatedUsdHour: getSetting("estimated_usd_hour", "0")
    },
    pools: UNMINEABLE_POOLS,
    minerSoftware: [],
    platformInfo: {
      os: CURRENT_RUNTIME.platform,
      arch: CURRENT_RUNTIME.arch,
      key: getRuntimePlatformKey(),
      label: CURRENT_RUNTIME.label,
      minerRoot: MINER_ROOT
    },
    installState: {
      checking: false,
      activeId: null,
      message: "Release check has not run yet."
    },
    security: {
      loading: false,
      providers: [],
      message: "Security software detection has not run yet.",
      minerRoot: MINER_ROOT
    },
    hardware: {
      loading: false,
      cpuName: "Detecting CPU...",
      cpuCores: 0,
      cpuThreads: 0,
      gpus: [],
      apuDetected: false,
      discreteGpuDetected: false,
      recommendation: "Run hardware detection to pick a profile."
    },
    benchmarkState: {
      running: false,
      summary: "Benchmark has not run yet.",
      results: [],
      recommendedType: null
    },
    failoverState: {
      attempts: 0,
      maxAttempts: 3
    },
    version: remoteApp.getVersion(),
    update: null
  },

  mounted: function() {
    this.logMessage("Log started.");
    this.checkMinerSoftware();
    this.checkMinerUpdates();
    this.detectSecuritySoftware();
    this.detectHardware();
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
      settings.set("unmineable_account", this.formSettings.unmineableAccount);
      settings.set("pool_mode", this.formSettings.poolMode);
      settings.set("cpu_pool_id", this.formSettings.cpuPoolId);
      settings.set("gpu_pool_id", this.formSettings.gpuPoolId);
      settings.set("cpu_miner_id", this.formSettings.cpuMinerId);
      settings.set("gpu_miner_id", this.formSettings.gpuMinerId);
      settings.set("estimated_usd_hour", this.formSettings.estimatedUsdHour);

      toastr.remove();
      toastr.success("Settings saved.");
    },

    toggleMiner: function() {
      if (!this.isMining()) {
        this.startMiner();
      } else {
        this.stopMiner();
      }
    },

    checkMinerSoftware: function() {
      var previousById = {};
      this.minerSoftware.forEach(function(item) {
        previousById[item.id] = item;
      });

      this.minerSoftware = MINER_SOFTWARE.map(function(item) {
        var previous = previousById[item.id] || {};
        var installed = fs.existsSync(item.expectedPath);
        var localVersion = getInstalledMinerVersion(item);
        var latestVersion = previous.latestVersion || null;
        var updateAvailable = Boolean(installed && localVersion && latestVersion && localVersion !== latestVersion);

        return Object.assign({}, item, {
          installed: installed,
          folder: path.dirname(item.expectedPath),
          platformSupported: isRuntimeSupported(item),
          localVersion: localVersion,
          latestVersion: latestVersion,
          latestUrl: previous.latestUrl || item.downloadUrl,
          assetName: previous.assetName || null,
          assetUrl: previous.assetUrl || null,
          releaseError: previous.releaseError || null,
          updateAvailable: updateAvailable,
          installedLabel: installed ? localVersion || "Manual install" : "Not installed",
          latestLabel: latestVersion || "Not checked",
          platformLabel: getRuntimePlatformKey()
        });
      });
    },

    checkMinerUpdates: function() {
      var self = this;

      this.checkMinerSoftware();
      this.installState.checking = true;
      this.installState.message = "Checking official GitHub releases...";

      Promise.all(
        this.minerSoftware.map(function(item) {
          return self.fetchLatestMinerRelease(item);
        })
      )
        .then(function(updatedItems) {
          self.minerSoftware = updatedItems;
          self.installState.checking = false;
          self.installState.message = "Release check completed.";
          var updates = updatedItems.filter(function(item) {
            return item.updateAvailable;
          });

          if (updates.length) {
            toastr.remove();
            toastr.info(`${updates.length} miner update${updates.length === 1 ? "" : "s"} available in Install Center.`);
          }
        })
        .catch(function(error) {
          self.installState.checking = false;
          self.installState.message = "Release check failed.";
          self.logMessage("Release check failed: " + error.message);
        });
    },

    fetchLatestMinerRelease: function(item) {
      var self = this;

      return axios({
        method: "GET",
        url: `https://api.github.com/repos/${item.repo}/releases/latest`,
        headers: {
          Accept: "application/vnd.github+json"
        }
      })
        .then(function(response) {
          var release = response.data || {};
          var asset = self.pickReleaseAsset(item, release.assets || []);
          var localVersion = getInstalledMinerVersion(item);
          var installed = fs.existsSync(item.expectedPath);
          var latestVersion = release.tag_name || release.name || null;

          return Object.assign({}, item, {
            installed: installed,
            platformSupported: isRuntimeSupported(item),
            localVersion: localVersion,
            latestVersion: latestVersion,
            latestUrl: release.html_url || item.downloadUrl,
            assetName: asset ? asset.name : null,
            assetUrl: asset ? asset.browser_download_url : null,
            releaseError: asset ? null : "No compatible package asset found in latest release.",
            updateAvailable: Boolean(installed && localVersion && latestVersion && localVersion !== latestVersion),
            installedLabel: installed ? localVersion || "Manual install" : "Not installed",
            latestLabel: latestVersion || "Unknown",
            platformLabel: getRuntimePlatformKey()
          });
        })
        .catch(function(error) {
          var installed = fs.existsSync(item.expectedPath);
          var localVersion = getInstalledMinerVersion(item);

          return Object.assign({}, item, {
            installed: installed,
            platformSupported: isRuntimeSupported(item),
            localVersion: localVersion,
            releaseError: error.message,
            installedLabel: installed ? localVersion || "Manual install" : "Not installed",
            latestLabel: item.latestVersion || "Check failed",
            platformLabel: getRuntimePlatformKey()
          });
        });
    },

    pickReleaseAsset: function(item, assets) {
      var packages = assets.filter(function(asset) {
        return /\.(zip|tar\.gz|tgz|tar\.xz)$/i.test(asset.name || "") && !/source code/i.test(asset.name || "");
      });
      var matchers = getAssetMatcherGroup(item);

      for (var i = 0; i < matchers.length; i++) {
        var matcher = matchers[i];
        var matched = packages.find(function(asset) {
          return matcher.test(asset.name || "");
        });

        if (matched) {
          return matched;
        }
      }

      return packages.find(function(asset) {
        if (CURRENT_RUNTIME.isWindows) {
          return /win|windows/i.test(asset.name || "") && !/arm/i.test(asset.name || "");
        }

        if (CURRENT_RUNTIME.isLinux && CURRENT_RUNTIME.arch === "x64") {
          return /linux/i.test(asset.name || "") && /x64|64/i.test(asset.name || "") && !/arm/i.test(asset.name || "");
        }

        if (CURRENT_RUNTIME.isLinux && /arm/.test(CURRENT_RUNTIME.arch)) {
          return /linux/i.test(asset.name || "") && /arm/i.test(asset.name || "");
        }

        return false;
      });
    },

    installOrUpdateMiner: function(item) {
      var self = this;

      if (this.isMining()) {
        toastr.remove();
        toastr.error("Stop mining before installing or updating miner software.");
        return;
      }

      if (!item.assetUrl) {
        toastr.remove();
        toastr.error("No downloadable package was found for this platform. Open the release page manually.");
        return;
      }

      this.installState.activeId = item.id;
      this.installState.message = `Downloading ${item.name} ${item.latestLabel}...`;
      this.logMessage(`Downloading ${item.name} ${item.latestLabel}.`);

      this.downloadAndInstallMiner(item)
        .then(function() {
          var installedItem = Object.assign({}, item, {
            installed: true,
            localVersion: item.latestVersion,
            installedLabel: item.latestVersion || "Installed",
            updateAvailable: false
          });
          settings.set(`miner_${item.id}_version`, item.latestVersion);
          settings.set(`miner_${item.id}_asset`, item.assetName);
          self.installState.activeId = null;
          self.installState.message = `${item.name} ${item.latestLabel} installed.`;
          self.minerSoftware = self.minerSoftware.map(function(existing) {
            return existing.id === item.id ? Object.assign({}, existing, installedItem) : existing;
          });
          self.checkMinerUpdates();
          toastr.remove();
          toastr.success(`${item.name} installed.`);
        })
        .catch(function(error) {
          self.installState.activeId = null;
          self.installState.message = `${item.name} install failed.`;
          self.logMessage(`${item.name} install failed: ${error.stack || error.message}`);
          toastr.remove();
          toastr.error(`${item.name} install failed. Check logs.`);
        });
    },

    updateAllMiners: function() {
      var self = this;
      var queue = this.minerSoftware.filter(function(item) {
        return item.updateAvailable && item.assetUrl && item.platformSupported;
      });

      if (!queue.length) {
        toastr.remove();
        toastr.info("No miner updates are available.");
        return;
      }

      queue
        .reduce(function(chain, item) {
          return chain.then(function() {
            self.installState.activeId = item.id;
            self.installState.message = `Updating ${item.name} ${item.latestLabel}...`;
            return self.downloadAndInstallMiner(item).then(function() {
              settings.set(`miner_${item.id}_version`, item.latestVersion);
              settings.set(`miner_${item.id}_asset`, item.assetName);
            });
          });
        }, Promise.resolve())
        .then(function() {
          self.installState.activeId = null;
          self.installState.message = "All available miner updates installed.";
          self.minerSoftware = self.minerSoftware.map(function(existing) {
            var updated = queue.find(function(item) {
              return item.id === existing.id;
            });

            if (!updated) {
              return existing;
            }

            return Object.assign({}, existing, {
              installed: true,
              localVersion: updated.latestVersion,
              installedLabel: updated.latestVersion || "Installed",
              updateAvailable: false
            });
          });
          self.checkMinerUpdates();
          toastr.remove();
          toastr.success("Miner updates installed.");
        })
        .catch(function(error) {
          self.installState.activeId = null;
          self.installState.message = "Update all failed.";
          self.logMessage("Update all miners failed: " + (error.stack || error.message));
          toastr.remove();
          toastr.error("Update all failed. Check logs.");
        });
    },

    downloadAndInstallMiner: function(item) {
      var self = this;
      var downloadRoot = path.join(remoteApp.getPath("userData"), "miner-downloads");
      var workDir = path.join(downloadRoot, item.id + "-" + sanitizePathPart(item.latestVersion));
      var extractDir = path.join(workDir, "extract");
      var packagePath = path.join(workDir, sanitizePathPart(item.assetName || item.id + ".zip"));

      ensureDirectory(downloadRoot);
      removeDirectoryRecursive(workDir, downloadRoot);
      ensureDirectory(extractDir);

      return downloadFile(item.assetUrl, packagePath)
        .then(function() {
          self.installState.message = `Extracting ${item.name}...`;
          return self.extractPackage(packagePath, extractDir);
        })
        .then(function() {
          var executablePath = findFileRecursive(extractDir, item.executableName);

          if (!executablePath) {
            throw new Error(`Could not find ${item.executableName} inside ${item.assetName}.`);
          }

          var sourceDir = path.dirname(executablePath);
          var targetDir = path.dirname(item.expectedPath);

          if (!isPathInside(targetDir, MINER_ROOT)) {
            throw new Error("Refusing to install outside the miner folder.");
          }

          self.installState.message = `Installing ${item.name}...`;
          copyDirectoryRecursive(sourceDir, targetDir);

          if (!CURRENT_RUNTIME.isWindows) {
            try {
              fs.chmodSync(item.expectedPath, 0o755);
            } catch (chmodError) {
              self.logMessage("Could not chmod miner executable: " + chmodError.message);
            }
          }

          if (!fs.existsSync(item.expectedPath)) {
            throw new Error(`${item.executableName} was not copied to the expected folder.`);
          }

          writeMinerInstallMetadata(item);
        });
    },

    extractPackage: function(packagePath, extractDir) {
      return new Promise(function(resolve, reject) {
        var command;

        if (/\.zip$/i.test(packagePath)) {
          if (CURRENT_RUNTIME.isWindows) {
            command =
              "powershell -NoProfile -ExecutionPolicy Bypass -Command " +
              `"Expand-Archive -LiteralPath '${escapePowerShellString(packagePath)}' -DestinationPath '${escapePowerShellString(extractDir)}' -Force"`;
          } else {
            command = `unzip -o "${packagePath}" -d "${extractDir}"`;
          }
        } else if (/\.(tar\.gz|tgz)$/i.test(packagePath)) {
          command = `tar -xzf "${packagePath}" -C "${extractDir}"`;
        } else if (/\.tar\.xz$/i.test(packagePath)) {
          command = `tar -xJf "${packagePath}" -C "${extractDir}"`;
        } else {
          reject(new Error("Unsupported miner package type."));
          return;
        }

        exec(command, { timeout: 120000 }, function(error) {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },

    getMinerSoftware: function(id) {
      return this.minerSoftware.find(function(item) {
        return item.id === id;
      });
    },

    openMinerFolder: function(item) {
      if (item.installed) {
        shell.showItemInFolder(item.expectedPath);
        return;
      }

      if (fs.existsSync(item.folder)) {
        shell.openItem(item.folder);
      } else {
        shell.openItem(__dirname);
      }
    },

    detectSecuritySoftware: function() {
      var self = this;
      this.security.loading = true;

      if (process.platform !== "win32") {
        this.security.loading = false;
        this.security.message = "Security software detection is currently Windows-only.";
        return;
      }

      var command =
        'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct | Select-Object displayName,pathToSignedProductExe,productState | ConvertTo-Json -Depth 3"';

      exec(command, { timeout: 15000 }, function(error, stdout) {
        self.security.loading = false;

        if (error || !stdout.trim()) {
          self.security.providers = [];
          self.security.message = "No antivirus provider was detected through Windows Security Center.";
          return;
        }

        try {
          var parsed = JSON.parse(stdout);
          var providers = Array.isArray(parsed) ? parsed : [parsed];
          self.security.providers = providers
            .filter(function(provider) {
              return provider && provider.displayName;
            })
            .map(function(provider) {
              return {
                name: provider.displayName,
                productState: provider.productState,
                path: provider.pathToSignedProductExe || ""
              };
            });
          self.security.message = self.security.providers.length
            ? "Security providers detected. Add exclusions only after reviewing the files yourself."
            : "No antivirus provider was detected through Windows Security Center.";
        } catch (parseError) {
          self.security.providers = [];
          self.security.message = "Security provider output could not be parsed.";
          self.logMessage("Security detection parse failed: " + parseError.message);
        }
      });
    },

    copyMinerRootPath: function() {
      clipboard.writeText(MINER_ROOT);
      toastr.remove();
      toastr.success("Miner folder path copied.");
    },

    openWindowsSecurity: function() {
      shell.openExternal("windowsdefender:");
    },

    openFirewallSettings: function() {
      exec("control firewall.cpl");
    },

    detectHardware: function() {
      var self = this;
      this.hardware.loading = true;

      return new Promise(function(resolve) {
        var command;

        if (process.platform === "win32") {
          command =
            'powershell -NoProfile -ExecutionPolicy Bypass -Command "$cpu=Get-CimInstance Win32_Processor | Select-Object -First 1 Name,NumberOfCores,NumberOfLogicalProcessors; $gpus=Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM; [PSCustomObject]@{Cpu=$cpu;Gpus=@($gpus);Platform=' +
            "'win32';Arch='" +
            process.arch +
            '\'} | ConvertTo-Json -Depth 4"';
        } else if (process.platform === "linux") {
          command =
            "sh -c \"cpu=$(lscpu 2>/dev/null | awk -F: '/Model name/ {gsub(/^[ \\t]+/, \\\"\\\", $2); print $2; exit}'); cores=$(getconf _NPROCESSORS_ONLN 2>/dev/null || nproc 2>/dev/null || echo 0); gpus=$(lspci 2>/dev/null | grep -Ei 'vga|3d|display' || true); printf '{\\\"Cpu\\\":{\\\"Name\\\":\\\"%s\\\",\\\"NumberOfCores\\\":%s,\\\"NumberOfLogicalProcessors\\\":%s},\\\"GpusText\\\":\\\"%s\\\",\\\"Platform\\\":\\\"linux\\\",\\\"Arch\\\":\\\"" +
            process.arch +
            "\\\"}' \\\"${cpu:-Unknown Linux CPU}\\\" \\\"${cores:-0}\\\" \\\"${cores:-0}\\\" \\\"$(printf '%s' \\\"$gpus\\\" | sed 's/\\\\/\\\\\\\\/g; s/\\\"/\\\\\\\"/g')\\\"\"";
        } else {
          self.hardware = {
            loading: false,
            cpuName: "Unsupported platform detection",
            cpuCores: 0,
            cpuThreads: 0,
            gpus: [],
            apuDetected: false,
            discreteGpuDetected: false,
            recommendation: "Automatic detection currently supports Windows and Linux."
          };
          resolve(self.hardware);
          return;
        }

        exec(command, { timeout: 15000 }, function(error, stdout) {
          if (error || !stdout.trim()) {
            self.hardware = {
              loading: false,
              cpuName: "Hardware detection failed",
              cpuCores: 0,
              cpuThreads: 0,
              gpus: [],
              apuDetected: false,
              discreteGpuDetected: false,
              recommendation: "Use CPU RandomX if GPU detection is unavailable."
            };
            self.logMessage("Hardware detection failed: " + (error ? error.message : "No output"));
            resolve(self.hardware);
            return;
          }

          try {
            self.applyDetectedHardware(JSON.parse(stdout));
          } catch (parseError) {
            self.hardware.loading = false;
            self.hardware.recommendation = "Hardware detection output could not be parsed.";
            self.logMessage("Hardware detection parse failed: " + parseError.message);
          }

          resolve(self.hardware);
        });
      });
    },

    applyDetectedHardware: function(payload) {
      var cpu = payload.Cpu || {};
      var rawGpus = payload.Gpus || [];

      if (!Array.isArray(rawGpus)) {
        rawGpus = rawGpus ? [rawGpus] : [];
      }

      if ((!rawGpus || !rawGpus.length) && payload.GpusText) {
        rawGpus = String(payload.GpusText)
          .split(/\r?\n/)
          .filter(function(line) {
            return line.trim();
          })
          .map(function(line) {
            return {
              Name: line.trim(),
              AdapterRAM: 0
            };
          });
      }

      var cpuName = cpu.Name || "Unknown CPU";
      var gpus = rawGpus.map(
        function(gpu, index) {
          var name = gpu.Name || "Unknown GPU";
          var memoryBytes = toNumber(gpu.AdapterRAM);
          var memoryGb = memoryBytes > 0 ? memoryBytes / 1024 / 1024 / 1024 : 0;
          var lower = name.toLowerCase();
          var isAmd = lower.indexOf("amd") !== -1 || lower.indexOf("radeon") !== -1;
          var isNvidia = lower.indexOf("nvidia") !== -1 || lower.indexOf("geforce") !== -1 || lower.indexOf("rtx") !== -1 || lower.indexOf("gtx") !== -1;
          var isIntel = lower.indexOf("intel") !== -1 || lower.indexOf("uhd") !== -1 || lower.indexOf("iris") !== -1;
          var integrated =
            lower.indexOf("radeon graphics") !== -1 ||
            lower.indexOf("vega") !== -1 ||
            lower.indexOf("apu") !== -1 ||
            lower.indexOf("integrated") !== -1 ||
            isIntel;

          return {
            id: index + 1,
            name: name,
            memoryGb: memoryGb,
            vendor: isNvidia ? "NVIDIA" : isAmd ? "AMD" : isIntel ? "Intel" : "Unknown",
            integrated: integrated,
            label: `${name}${memoryGb ? " (" + memoryGb.toFixed(1) + " GB)" : ""}`
          };
        }.bind(this)
      );

      var apuDetected = /amd/i.test(cpuName) && gpus.some(function(gpu) {
        return gpu.vendor === "AMD" && gpu.integrated;
      });

      var discreteGpuDetected = gpus.some(function(gpu) {
        return !gpu.integrated && (gpu.vendor === "NVIDIA" || gpu.vendor === "AMD");
      });

      this.hardware = {
        loading: false,
        cpuName: cpuName,
        cpuCores: toNumber(cpu.NumberOfCores),
        cpuThreads: toNumber(cpu.NumberOfLogicalProcessors),
        gpus: gpus,
        apuDetected: apuDetected,
        discreteGpuDetected: discreteGpuDetected,
        recommendation: this.getHardwareRecommendation(cpuName, gpus, apuDetected, discreteGpuDetected)
      };

      this.logMessage("Hardware detection finished.");
    },

    getHardwareRecommendation: function(cpuName, gpus, apuDetected, discreteGpuDetected) {
      if (CURRENT_RUNTIME.isLinux && /arm/.test(CURRENT_RUNTIME.arch)) {
        return "Linux ARM detected. Use XMRig CPU mining; Raspberry Pi-style hardware is CPU-only for this app.";
      }

      if (apuDetected && !discreteGpuDetected) {
        return "AMD APU detected. Use CPU RandomX first; integrated Radeon graphics usually benchmark low for GPU mining.";
      }

      if (discreteGpuDetected) {
        return "Discrete GPU detected. GPU Etchash is the default, and CPU RandomX can run beside it if temperatures are acceptable.";
      }

      if (cpuName && cpuName !== "Unknown CPU") {
        return "CPU detected. Use RandomX on XMRig.";
      }

      return "Use Auto Benchmark after installing miners.";
    },

    applyHardwareRecommendation: function() {
      if (this.hardware.apuDetected && !this.hardware.discreteGpuDetected) {
        this.formSettings.type = "cpu";
        this.formSettings.cpuPoolId = "randomx";
        this.formSettings.cpuMinerId = "xmrig";
      } else if (this.hardware.discreteGpuDetected) {
        this.formSettings.type = "gpu_and_cpu";
        this.formSettings.gpuPoolId = "etchash";
        this.formSettings.cpuPoolId = "randomx";
        this.formSettings.cpuMinerId = "xmrig";
        this.formSettings.gpuMinerId = "auto";
      } else {
        this.formSettings.type = "cpu";
        this.formSettings.cpuPoolId = "randomx";
        this.formSettings.cpuMinerId = "xmrig";
      }

      this.formSettings.poolMode = "auto";
      this.saveSettings();
      toastr.remove();
      toastr.success("Recommended mining profile applied.");
    },

    minerSupportsPool: function(miner, pool) {
      return (
        miner &&
        pool &&
        isRuntimeSupported(miner) &&
        (miner.supportedPools || []).indexOf(pool.id) !== -1 &&
        (pool.minerIds || []).indexOf(miner.id) !== -1
      );
    },

    getBenchmarkCandidates: function(device) {
      var self = this;
      var pools = UNMINEABLE_POOLS[device] || [];

      return pools.reduce(function(list, pool) {
        self.minerSoftware.forEach(function(miner) {
          if (miner.installed && self.minerSupportsPool(miner, pool)) {
            list.push({
              device: device,
              pool: pool,
              miner: miner
            });
          }
        });

        return list;
      }, []);
    },

    getInstalledMinersForDevice: function(device) {
      var pools = UNMINEABLE_POOLS[device] || [];
      var poolIds = pools.map(function(pool) {
        return pool.id;
      });

      return this.minerSoftware.filter(function(miner) {
        return (
          miner.installed &&
          isRuntimeSupported(miner) &&
          (miner.supportedPools || []).some(function(poolId) {
            return poolIds.indexOf(poolId) !== -1;
          })
        );
      });
    },

    getBestInstalledMinerForPool: function(device, pool) {
      var selectedId = device === "cpu" ? this.formSettings.cpuMinerId : this.formSettings.gpuMinerId;
      var selected = selectedId && selectedId !== "auto" ? this.getMinerSoftware(selectedId) : null;

      if (selected && selected.installed && this.minerSupportsPool(selected, pool)) {
        return selected;
      }

      return this.minerSoftware.find(
        function(miner) {
          return miner.installed && this.minerSupportsPool(miner, pool);
        }.bind(this)
      );
    },

    getWorkerName: function() {
      return `${this.formSettings.userId || "benchmark"}_${this.formSettings.workerId || "1"}`;
    },

    parsePoolEndpoint: function(pool) {
      var raw = pool.url.replace(/^stratum\+tcp:\/\//i, "").replace(/^stratum\+ssl:\/\//i, "");
      var parts = raw.split(":");

      return {
        host: parts[0],
        port: parts[1] || "3333"
      };
    },

    buildMinerArgs: function(miner, pool, device, benchmarkMode) {
      var workerName = this.getWorkerName();
      var minerUser = (this.formSettings.unmineableAccount || "nekosunevr").trim();
      var endpoint = this.parsePoolEndpoint(pool);
      var threadArg = this.getCpuThreadArg();

      if (miner.id === "xmrig") {
        var xmrigArgs = [
          "--url",
          pool.url,
          "--user",
          minerUser,
          "--pass",
          workerName,
          "--algo",
          pool.algo,
          "--http-host=127.0.0.1",
          "--http-port=8888",
          "--donate-level=5"
        ];

        if (threadArg) {
          xmrigArgs.push(threadArg);
        }

        return xmrigArgs;
      }

      if (miner.id === "trex") {
        var trexArgs = [
          "-a",
          pool.algo,
          "-o",
          pool.url,
          "-u",
          minerUser,
          "-p",
          workerName,
          "-w",
          workerName,
          "--api-bind-http",
          "127.0.0.1:4067"
        ];

        return trexArgs;
      }

      if (miner.id === "lolminer") {
        return [
          "--algo",
          pool.algo,
          "--pool",
          endpoint.host + ":" + endpoint.port,
          "--user",
          minerUser,
          "--pass",
          workerName,
          "--worker",
          workerName
        ];
      }

      if (miner.id === "nbminer") {
        return ["-a", pool.algo, "-o", pool.url, "-u", minerUser + "." + workerName, "-p", "x"];
      }

      if (miner.id === "gminer") {
        return [
          "--algo",
          pool.algo,
          "--server",
          endpoint.host,
          "--port",
          endpoint.port,
          "--user",
          minerUser,
          "--pass",
          workerName
        ];
      }

      if (miner.id === "srbminer") {
        return [
          "--algorithm",
          pool.algo,
          "--pool",
          pool.url,
          "--wallet",
          minerUser,
          "--password",
          workerName
        ];
      }

      if (miner.id === "bzminer") {
        return ["-a", pool.algo, "-p", pool.url, "-w", minerUser, "-r", workerName];
      }

      if (miner.id === "rigel") {
        return ["-a", pool.algo, "-o", pool.url, "-u", minerUser, "-w", workerName, "--no-watchdog"];
      }

      throw new Error("No command template exists for " + miner.name + ".");
    },

    runAutoBenchmark: async function() {
      if (this.isMining()) {
        toastr.remove();
        toastr.error("Stop the miner before running a benchmark.");
        return;
      }

      this.checkMinerSoftware();
      await this.detectHardware();

      var results = [];
      var cpuCandidates = this.getBenchmarkCandidates("cpu");
      var gpuCandidates = this.hardware.apuDetected && !this.hardware.discreteGpuDetected ? [] : this.getBenchmarkCandidates("gpu");
      var candidates = cpuCandidates.concat(gpuCandidates);

      this.benchmarkState.running = true;
      this.benchmarkState.summary = "Benchmark running across installed compatible miners and unMineable pools.";
      this.benchmarkState.results = [];
      this.logMessage("Benchmark started.");

      if (!cpuCandidates.length) {
        results.push({
          device: "CPU",
          poolId: "randomx",
          poolName: "RandomX CPU",
          minerName: "XMRig",
          ok: false,
          error: "No compatible CPU miner is installed for this platform."
        });
      }

      if (!gpuCandidates.length && !(this.hardware.apuDetected && !this.hardware.discreteGpuDetected)) {
        results.push({
          device: "GPU",
          poolId: "etchash",
          poolName: "Etchash GPU",
          minerName: "Any supported GPU miner",
          ok: false,
          error: "No compatible GPU miner is installed for this platform."
        });
      }

      for (var i = 0; i < candidates.length; i++) {
        this.benchmarkState.summary = `Testing ${candidates[i].miner.name} on ${candidates[i].pool.name} (${i + 1}/${candidates.length}).`;
        results.push(await this.runMinerBenchmark(candidates[i]));
        this.benchmarkState.results = results.slice();
      }

      var successfulGpu = results
        .filter(function(result) {
          return result.ok && result.device === "GPU";
        })
        .sort(function(a, b) {
          return b.score - a.score;
        })[0];

      var successfulCpu = results
        .filter(function(result) {
          return result.ok && result.device === "CPU";
        })
        .sort(function(a, b) {
          return b.score - a.score;
        })[0];

      if (successfulGpu) {
        this.formSettings.gpuPoolId = successfulGpu.poolId;
        this.formSettings.gpuMinerId = successfulGpu.minerId;
      }

      if (successfulCpu) {
        this.formSettings.cpuPoolId = successfulCpu.poolId;
        this.formSettings.cpuMinerId = successfulCpu.minerId;
      }

      if (successfulGpu && successfulCpu) {
        this.formSettings.type = this.hardware.apuDetected ? "cpu" : "gpu_and_cpu";
      } else if (successfulGpu) {
        this.formSettings.type = "gpu";
      } else if (successfulCpu) {
        this.formSettings.type = "cpu";
      } else {
        if (this.hardware.apuDetected && !this.hardware.discreteGpuDetected) {
          this.formSettings.type = "cpu";
          this.formSettings.cpuPoolId = "randomx";
          this.formSettings.cpuMinerId = "xmrig";
        } else if (this.hardware.discreteGpuDetected) {
          this.formSettings.type = "gpu_and_cpu";
          this.formSettings.gpuPoolId = "etchash";
          this.formSettings.cpuPoolId = "randomx";
          this.formSettings.cpuMinerId = "xmrig";
          this.formSettings.gpuMinerId = "auto";
        } else {
          this.formSettings.type = "cpu";
          this.formSettings.cpuPoolId = "randomx";
          this.formSettings.cpuMinerId = "xmrig";
        }
        this.formSettings.poolMode = "auto";
      }

      this.benchmarkState.running = false;
      this.benchmarkState.results = results;
      this.benchmarkState.recommendedType = this.formSettings.type;
      this.benchmarkState.summary = this.buildBenchmarkSummary(results);
      this.saveSettings();
      this.logMessage("Benchmark finished.");
    },

    runMinerBenchmark: function(candidate) {
      var self = this;
      var device = candidate.device;
      var pool = candidate.pool;
      var software = candidate.miner;

      return new Promise(function(resolve) {
        if (!software || !software.installed || !self.minerSupportsPool(software, pool)) {
          resolve({
            device: device.toUpperCase(),
            poolId: pool.id,
            poolName: pool.name,
            minerId: software ? software.id : null,
            minerName: software ? software.name : "Unknown miner",
            ok: false,
            error: `${software ? software.name : device} is not installed or cannot run this algorithm.`
          });
          return;
        }

        var args;
        try {
          args = self.buildMinerArgs(software, pool, device, true);
        } catch (buildError) {
          resolve({
            device: device.toUpperCase(),
            poolId: pool.id,
            poolName: pool.name,
            minerId: software.id,
            minerName: software.name,
            ok: false,
            error: buildError.message
          });
          return;
        }

        var output = "";
        var bestHashrate = 0;
        var startedAt = Date.now();
        var completed = false;

        self.logMessage(`Benchmarking ${software.name} on ${pool.name}.`);
        var miner = spawn(software.expectedPath, args);
        var finish = function(ok, errorMessage) {
          if (completed) {
            return;
          }

          completed = true;
          var score = bestHashrate * (pool.stabilityWeight || 1);

          resolve({
            device: device.toUpperCase(),
            poolId: pool.id,
            poolName: pool.name,
            minerId: software.id,
            minerName: software.name,
            ok: ok && bestHashrate > 0,
            hashrate: bestHashrate,
            score: score,
            formattedHashrate: formatHashrateValue(bestHashrate),
            error: ok && bestHashrate > 0 ? null : errorMessage || "No stable hashrate was detected."
          });
        };

        var timer = setTimeout(function() {
          miner.kill("SIGINT");
          finish(true);
        }, 45000);

        miner.stdout.on("data", function(data) {
          var text = data.toString();
          output += text;
          bestHashrate = Math.max(bestHashrate, self.parseBenchmarkHashrate(text), self.parseBenchmarkHashrate(output));
        });

        miner.stderr.on("data", function(data) {
          var text = data.toString();
          output += text;
          bestHashrate = Math.max(bestHashrate, self.parseBenchmarkHashrate(text), self.parseBenchmarkHashrate(output));
        });

        miner.on("error", function(error) {
          clearTimeout(timer);
          finish(false, error.message);
        });

        miner.on("close", function(code) {
          clearTimeout(timer);
          var ranForMs = Date.now() - startedAt;

          if (bestHashrate > 0 && (code === 0 || ranForMs > 10000)) {
            finish(true);
            return;
          }

          finish(false, `Miner exited with code ${code}.`);
        });
      });
    },

    parseBenchmarkHashrate: function(output) {
      var regexes = [
        /hashrate[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*([kmgtp]?h\/s)/i,
        /speed[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*([kmgtp]?h\/s)/i,
        /([0-9]+(?:\.[0-9]+)?)\s*([kmgtp]?h\/s)/i
      ];

      for (var i = 0; i < regexes.length; i++) {
        var match = output.match(regexes[i]);
        if (match) {
          return hashrateToHps(match[1], match[2]);
        }
      }

      return 0;
    },

    buildBenchmarkSummary: function(results) {
      var successful = results.filter(function(result) {
        return result.ok;
      });

      if (!successful.length) {
        return "Benchmark could not measure a miner. Check the install tab and miner paths.";
      }

      return successful
        .map(function(result) {
          return `${result.device} ${result.minerName} on ${result.poolName}: ${result.formattedHashrate}`;
        })
        .join(" | ");
    },

    startMiner: function(isFailover) {
      if (!isFailover) {
        this.failoverState.attempts = 0;
      }

      if (!/^[0-9]+$/.test(this.formSettings.userId || "")) {
        toastr.remove();
        toastr.error('Please set a valid Miner UserID in the "Settings" tab.');
        return;
      }

      if (!this.formSettings.unmineableAccount || !this.formSettings.unmineableAccount.trim()) {
        toastr.remove();
        toastr.error("Please set the unMineable account or wallet user field.");
        return;
      }

      this.checkMinerSoftware();

      var miningType = this.getEffectiveMiningType();
      var needsGpu = miningType === "gpu" || miningType === "gpu_and_cpu";
      var needsCpu = miningType === "cpu" || miningType === "gpu_and_cpu";
      var gpuPool = this.getSelectedPool("gpu");
      var cpuPool = this.getSelectedPool("cpu");
      var gpuMiner = needsGpu ? this.getBestInstalledMinerForPool("gpu", gpuPool) : null;
      var cpuMiner = needsCpu ? this.getBestInstalledMinerForPool("cpu", cpuPool) : null;

      if (needsGpu && (!gpuMiner || !gpuMiner.installed)) {
        toastr.remove();
        toastr.error("No compatible GPU miner is installed for the selected pool.");
        this.changeActiveTab("install");
        return;
      }

      if (needsCpu && (!cpuMiner || !cpuMiner.installed)) {
        toastr.remove();
        toastr.error("No compatible CPU miner is installed for the selected pool.");
        this.changeActiveTab("install");
        return;
      }

      this.logMessage(`Miner starting with profile ${miningType}.`);

      if (needsGpu) {
        this.minerGPU = spawn(gpuMiner.expectedPath, this.buildMinerArgs(gpuMiner, gpuPool, "gpu", false));
      }

      if (needsCpu) {
        this.minerCPU = spawn(cpuMiner.expectedPath, this.buildMinerArgs(cpuMiner, cpuPool, "cpu", false));
      }

      this.activeMiningType = miningType;
      this.attachMinerEvents(this.minerGPU, "GPU");
      this.attachMinerEvents(this.minerCPU, "CPU");

      toastr.remove();
      toastr.success("Miner started.");
    },

    attachMinerEvents: function(miner, label) {
      if (!miner) {
        return;
      }

      miner.stdout.on("data", data => {
        this.updateHashrateFromLog(label, data.toString());
        this.logMessage(data.toString());
      });
      miner.stderr.on("data", data => {
        this.updateHashrateFromLog(label, data.toString());
        this.logMessage(data.toString());
      });
      miner.on("close", code => {
        this.logMessage(`${label} miner exited with code ${code}.`);

        if (label === "GPU") {
          this.minerGPU = null;
        }

        if (label === "CPU") {
          this.minerCPU = null;
        }

        if (code !== 0 && this.activeMiningType !== null) {
          if (this.tryFailover(label)) {
            return;
          }

          toastr.remove();
          toastr.error(`${label} miner stopped. Check logs and install status.`);
        }

        if (!this.isMining()) {
          this.activeMiningType = null;
        }
      });
      miner.on("error", err => this.logMessage(`Failed to start ${label} miner: ${err}`));
    },

    updateHashrateFromLog: function(label, message) {
      var hashrate = this.parseBenchmarkHashrate(message);

      if (hashrate <= 0) {
        return;
      }

      if (label === "GPU") {
        this.stats.GPU.hashrate = hashrate;
      }

      if (label === "CPU") {
        this.stats.CPU.hashrate = hashrate;
      }
    },

    tryFailover: function(label) {
      if (this.formSettings.poolMode !== "auto" || this.benchmarkState.running) {
        return false;
      }

      if (this.failoverState.attempts >= this.failoverState.maxAttempts) {
        this.logMessage("Failover limit reached.");
        return false;
      }

      var device = label === "GPU" ? "gpu" : "cpu";
      var currentPoolId = device === "gpu" ? this.formSettings.gpuPoolId : this.formSettings.cpuPoolId;
      var currentMinerId = device === "gpu" ? this.formSettings.gpuMinerId : this.formSettings.cpuMinerId;
      var next = this.getBenchmarkCandidates(device)
        .filter(function(candidate) {
          return candidate.pool.id !== currentPoolId || candidate.miner.id !== currentMinerId;
        })
        .sort(function(a, b) {
          return (b.pool.stabilityWeight || 1) - (a.pool.stabilityWeight || 1);
        })[0];

      if (!next) {
        this.logMessage("No compatible failover option is installed.");
        return false;
      }

      this.failoverState.attempts++;
      this.logMessage(`Failover ${this.failoverState.attempts}/${this.failoverState.maxAttempts}: switching ${label} to ${next.miner.name} on ${next.pool.name}.`);

      if (device === "gpu") {
        this.formSettings.gpuPoolId = next.pool.id;
        this.formSettings.gpuMinerId = next.miner.id;
      } else {
        this.formSettings.cpuPoolId = next.pool.id;
        this.formSettings.cpuMinerId = next.miner.id;
      }

      this.saveSettings();
      this.stopMiner();

      setTimeout(
        function() {
          this.startMiner(true);
        }.bind(this),
        1200
      );

      return true;
    },

    stopMiner: function() {
      var hadMiner = this.isMining();

      [this.minerGPU, this.minerCPU].forEach(miner => {
        if (miner) {
          miner.kill("SIGINT");
        }
      });

      this.minerGPU = null;
      this.minerCPU = null;
      this.activeMiningType = null;
      this.resetStats();

      if (hadMiner) {
        this.logMessage("Miner stopped.");
      }
    },

    getCpuThreadArg: function() {
      switch (this.formSettings.cputype) {
        case "high":
          return "--threads=8";
        case "medium-4":
          return "--threads=7";
        case "medium-3":
          return "--threads=6";
        case "medium-2":
          return "--threads=5";
        case "medium-1":
          return "--threads=4";
        case "medium":
          return "--threads=3";
        case "low":
          return "--threads=2";
        case "verylow":
          return "--threads=1";
        default:
          return null;
      }
    },

    getEffectiveMiningType: function() {
      if (this.formSettings.type !== "auto") {
        return this.formSettings.type;
      }

      if (this.hardware.apuDetected && !this.hardware.discreteGpuDetected) {
        return "cpu";
      }

      if (this.hardware.discreteGpuDetected) {
        return "gpu_and_cpu";
      }

      return "cpu";
    },

    getSelectedPool: function(device) {
      var selectedId = device === "cpu" ? this.formSettings.cpuPoolId : this.formSettings.gpuPoolId;
      var poolList = UNMINEABLE_POOLS[device] || [];

      return (
        poolList.find(function(pool) {
          return pool.id === selectedId;
        }) || poolList[0]
      );
    },

    scrollToLogBottom: function() {
      setTimeout(
        function() {
          var box = this.$el.querySelector("#logs-box");
          if (box) {
            box.scrollTop = box.scrollHeight;
          }
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

      if (this.minerCPU) {
        axios
          .get("http://localhost:8888/1/summary")
          .then(function(response) {
            self.stats.CPU.hashrate = response.data.hashrate.total[0] || 0;
            self.stats.CPU.totalHashes = response.data.results.hashes_total || 0;
            self.stats.CPU.ping = response.data.connection.ping || 0;
            self.stats.CPU.threads = response.data.hashrate.threads.length || 0;
          })
          .catch(function(error) {
            console.log(error);
          });
      }

      if (this.minerGPU) {
        axios
          .get("http://localhost:4067/summary")
          .then(function(response) {
            self.stats.GPU.hashrate = response.data.hashrate || 0;
            self.stats.GPU.totalHashes =
              response.data.gpus && response.data.gpus[0] && response.data.gpus[0].shares
                ? response.data.gpus[0].shares.accepted_count
                : 0;
            self.stats.GPU.ping = response.data.active_pool ? response.data.active_pool.ping : 0;
            self.stats.GPU.threads = response.data.gpu_total || 0;
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
      var regex = /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] : /;
      var messages = message.toString().split(regex);
      messages.forEach(
        function(msg) {
          if (msg !== "") {
            var obj = {
              date: "[" + moment().format("YYYY-MM-DD HH:mm:ss") + "]",
              message: msg.trim()
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
        url: this.urls.api.CheckForUpdates
      })
        .then(function(response) {
          self.update = response.data.version;
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
    },

    formatHashrate: function(value) {
      return formatHashrateValue(value);
    }
  },

  computed: {
    toggleMinerText: function() {
      return !this.isMining() ? "Start Mining" : "Stop Mining";
    },

    minerWatch: function() {
      var duration = moment.duration(this.stats.timer, "seconds");
      var hours = Math.floor(duration.asHours());
      return `${hours}h ${duration.minutes()}m ${duration.seconds()}s`;
    },

    minerHashrate: function() {
      var cpuHashrate = this.stats.CPU.hashrate === null ? 0 : this.stats.CPU.hashrate;
      var gpuHashrate = this.stats.GPU.hashrate === null ? 0 : this.stats.GPU.hashrate;

      if (this.minerCPU && this.minerGPU) {
        return `CPU ${formatHashrateValue(cpuHashrate)} | GPU ${formatHashrateValue(gpuHashrate)}`;
      }

      if (this.minerGPU) {
        return formatHashrateValue(gpuHashrate);
      }

      return formatHashrateValue(cpuHashrate);
    },

    minerHashes: function() {
      var cpuHashes = this.stats.CPU.totalHashes === null ? 0 : this.stats.CPU.totalHashes;
      var gpuHashes = this.stats.GPU.totalHashes === null ? 0 : this.stats.GPU.totalHashes;

      if (this.minerCPU && this.minerGPU) {
        return `CPU ${numeral(cpuHashes).format("0,0")} | GPU ${numeral(gpuHashes).format("0,0")}`;
      }

      if (this.minerGPU) {
        return `${numeral(gpuHashes).format("0,0")} shares`;
      }

      return `${numeral(cpuHashes).format("0,0")} hashes`;
    },

    minerPing: function() {
      var cpuPing = this.stats.CPU.ping === null ? 0 : this.stats.CPU.ping;
      var gpuPing = this.stats.GPU.ping === null ? 0 : this.stats.GPU.ping;

      if (this.minerCPU && this.minerGPU) {
        return `CPU ${numeral(cpuPing).format("0,0")} ms | GPU ${numeral(gpuPing).format("0,0")} ms`;
      }

      if (this.minerGPU) {
        return `${numeral(gpuPing).format("0,0")} ms`;
      }

      return `${numeral(cpuPing).format("0,0")} ms`;
    },

    minerThreads: function() {
      if (this.minerCPU && this.minerGPU) {
        return `CPU ${this.stats.CPU.threads} | GPU ${this.stats.GPU.threads}`;
      }

      if (this.minerGPU) {
        return `${this.stats.GPU.threads}`;
      }

      return `${this.stats.CPU.threads}`;
    },

    estimatedUsdPerHour: function() {
      return toNumber(this.formSettings.estimatedUsdHour);
    },

    donatedUsd: function() {
      return (this.stats.timer / 3600) * this.estimatedUsdPerHour;
    },

    donatedUsdDisplay: function() {
      return "$" + numeral(this.donatedUsd).format("0,0.00");
    },

    hourlyUsdDisplay: function() {
      return "$" + numeral(this.estimatedUsdPerHour).format("0,0.00") + "/hr";
    },

    projectedDayUsd: function() {
      return this.estimatedUsdPerHour * 24;
    },

    projectedWeekUsd: function() {
      return this.estimatedUsdPerHour * 24 * 7;
    },

    projectedMonthUsd: function() {
      return this.estimatedUsdPerHour * 24 * 30;
    },

    projectedDayUsdDisplay: function() {
      return "$" + numeral(this.projectedDayUsd).format("0,0.00");
    },

    projectedWeekUsdDisplay: function() {
      return "$" + numeral(this.projectedWeekUsd).format("0,0.00");
    },

    projectedMonthUsdDisplay: function() {
      return "$" + numeral(this.projectedMonthUsd).format("0,0.00");
    },

    effectiveMiningTypeLabel: function() {
      var type = this.activeMiningType || this.getEffectiveMiningType();
      var labels = {
        auto: "Auto",
        cpu: "CPU only",
        gpu: "GPU only",
        gpu_and_cpu: "GPU + CPU"
      };

      return labels[type] || "Auto";
    },

    selectedCpuPool: function() {
      return this.getSelectedPool("cpu");
    },

    selectedGpuPool: function() {
      return this.getSelectedPool("gpu");
    },

    selectedCpuMiner: function() {
      return this.getBestInstalledMinerForPool("cpu", this.selectedCpuPool) || { name: "Auto / not installed" };
    },

    selectedGpuMiner: function() {
      return this.getBestInstalledMinerForPool("gpu", this.selectedGpuPool) || { name: "Auto / not installed" };
    },

    installedMinerCount: function() {
      return this.minerSoftware.filter(function(item) {
        return item.installed;
      }).length;
    },

    minerUpdateCount: function() {
      return this.minerSoftware.filter(function(item) {
        return item.updateAvailable;
      }).length;
    },

    minerID: function() {
      return `${this.stats.id}`;
    },

    urls: function() {
      return {
        api: {
          CheckForUpdates:
            "https://raw.githubusercontent.com/ChisdealHDAPP/nekosunevrapp-miner-donations/refs/heads/windows/package.json"
        },
        web: {
          EarnMining:
            "https://github.com/ChisdealHDAPP/nekosunevrapp-miner-donations/releases/windows-automated",
          PanelAccountDetails: "https://apps.nekosunevr.co.uk/",
          Unmineable: "https://unmineable.com/",
          UnmineableWizard: "https://unmineable.com/wizard"
        }
      };
    }
  },

  watch: {
    log: function() {
      this.scrollToLogBottom();
    },

    activeTab: function(newVal) {
      if (newVal === "logs") {
        this.scrollToLogBottom();
      }

      if (newVal === "install") {
        this.checkMinerSoftware();
        this.checkMinerUpdates();
        this.detectSecuritySoftware();
      }
    },

    update: function(newVal) {
      if (this.version && newVal && this.version !== newVal) {
        setTimeout(function() {
          $("#updateModal").modal();
        }, 1000);
      }
    }
  }
});
