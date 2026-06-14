const { ethers, network, run } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * MantleArb Deployment Script
 *
 * Supports:
 *   - Mantle Mainnet (chainId 5000)
 *   - Mantle Testnet (chainId 5001)
 *   - Hardhat local (for development/testing)
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network mantleTestnet
 *   npx hardhat run scripts/deploy.js --network mantle
 *   npx hardhat run scripts/deploy.js --network localhost
 */

// ─── Network-specific addresses ───────────────────────────────────────────────
const DEPLOYMENT_CONFIG = {
  // Mantle Mainnet (chainId 5000)
  5000: {
    name: "Mantle Mainnet",
    routers: {
      merchantMoe: "0xE6d0ED3759709b743707DcfeCAe39BC180C981fe",
      fusionX:     "0x333e3C607bB62054b84E1C3B0bD850A01B62f573",
      agni:        "0x37Ed3a17a0C44E7E91E294a97E0D084f51F9A39A",
      cyberSwap:   "0xe15a4e43B0569D8FCf07956B5E48E1E8e5118218",
      helix:       "0x8cF1DEa2D43b8C68B1c5d9F5e3a4B2c1D0E9F8A7",
      iZiSwap:     "0x2BCE6f3E8A6Ff12b4d7F5c4E3D2C1B0a9f8E7d6C5",
    },
    flashLoanProviders: {
      balancerVault: "0x0000000000000000000000000000000000000000",  // Configure on deploy
      aavePool:      "0x0000000000000000000000000000000000000000",  // Configure on deploy
    },
    priceOracle:  ethers.ZeroAddress,
    explorer:     "https://mantlescan.xyz",
    explorerApi:  "https://api.mantlescan.xyz/api",
  },
  // Mantle Testnet (chainId 5001)
  5001: {
    name: "Mantle Testnet (Sepolia)",
    routers: {
      merchantMoe: "0xE6d0ED3759709b743707DcfeCAe39BC180C981fe",
      fusionX:     "0x333e3C607bB62054b84E1C3B0bD850A01B62f573",
      agni:        "0x37Ed3a17a0C44E7E91E294a97E0D084f51F9A39A",
      cyberSwap:   "0xe15a4e43B0569D8FCf07956B5E48E1E8e5118218",
      helix:       "0x8cF1DEa2D43b8C68B1c5d9F5e3a4B2c1D0E9F8A7",
      iZiSwap:     "0x2BCE6f3E8A6Ff12b4d7F5c4E3D2C1B0a9f8E7d6C5",
    },
    flashLoanProviders: {
      balancerVault: "0x0000000000000000000000000000000000000000",
      aavePool:      "0x0000000000000000000000000000000000000000",
    },
    priceOracle:  ethers.ZeroAddress,
    explorer:     "https://sepolia.mantlescan.xyz",
    explorerApi:  "https://api-sepolia.mantlescan.xyz/api",
  },
};

// Fallback for local / unknown networks: deploy mock contracts
const LOCAL_CONFIG = {
  name: "Local Hardhat",
  routers: { merchantMoe: null, fusionX: null, agni: null, cyberSwap: null, helix: null, iZiSwap: null },
  flashLoanProviders: { balancerVault: null, aavePool: null },
  priceOracle:  ethers.ZeroAddress,
  explorer:     "",
  explorerApi:  "",
};

async function deployMockRouters() {
  console.log("\n  Deploying mock contracts for local testing...");

  const MockRouter = await ethers.getContractFactory("MockRouter");
  const router1 = await MockRouter.deploy();
  await router1.waitForDeployment();
  const router2 = await MockRouter.deploy();
  await router2.waitForDeployment();
  const router3 = await MockRouter.deploy();
  await router3.waitForDeployment();
  const router4 = await MockRouter.deploy();
  await router4.waitForDeployment();
  const router5 = await MockRouter.deploy();
  await router5.waitForDeployment();
  const router6 = await MockRouter.deploy();
  await router6.waitForDeployment();

  const r1 = await router1.getAddress();
  const r2 = await router2.getAddress();
  const r3 = await router3.getAddress();
  const r4 = await router4.getAddress();
  const r5 = await router5.getAddress();
  const r6 = await router6.getAddress();
  console.log("  MockRouter (MerchantMoe):", r1);
  console.log("  MockRouter (FusionX):    ", r2);
  console.log("  MockRouter (Agni):       ", r3);
  console.log("  MockRouter (CyberSwap):  ", r4);
  console.log("  MockRouter (Helix):      ", r5);
  console.log("  MockRouter (iZiSwap):    ", r6);

  const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
  const oracle = await MockPriceOracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log("  MockPriceOracle:         ", oracleAddr);

  return {
    merchantMoe: r1, fusionX: r2, agni: r3,
    cyberSwap: r4, helix: r5, iZiSwap: r6,
    balancerVault: ethers.ZeroAddress, aavePool: ethers.ZeroAddress,
    priceOracle: oracleAddr
  };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("============================================================");
  console.log("           MantleArb - Deployment Script                    ");
  console.log("============================================================");
  console.log();
  console.log("  Network   :", network.name, "(chainId " + chainId + ")");
  console.log("  Deployer  :", deployer.address);
  console.log("  Balance   :", ethers.formatEther(balance), "ETH/MNT");
  console.log();

  // ── Select config based on chain ─────────────────────────────────────────
  let config = DEPLOYMENT_CONFIG[Number(chainId)];

  if (!config) {
    // Local / Hardhat network - deploy mock contracts
    config = { ...LOCAL_CONFIG };
    const mocks = await deployMockRouters();
    config.routers = {
      merchantMoe: mocks.merchantMoe,
      fusionX:     mocks.fusionX,
      agni:        mocks.agni,
      cyberSwap:   mocks.cyberSwap,
      helix:       mocks.helix,
      iZiSwap:     mocks.iZiSwap,
    };
    config.flashLoanProviders = {
      balancerVault: mocks.balancerVault,
      aavePool:      mocks.aavePool,
    };
    config.priceOracle = mocks.priceOracle;
  }

  console.log("-- Deployment Parameters ----------------------------------");
  console.log("  Network         :", config.name);
  console.log("  MerchantMoe     :", config.routers.merchantMoe);
  console.log("  FusionX         :", config.routers.fusionX);
  console.log("  Agni            :", config.routers.agni);
  console.log("  CyberSwap       :", config.routers.cyberSwap);
  console.log("  Helix           :", config.routers.helix);
  console.log("  iZiSwap         :", config.routers.iZiSwap);
  console.log("  BalancerVault   :", config.flashLoanProviders.balancerVault);
  console.log("  AavePool        :", config.flashLoanProviders.aavePool);
  console.log("  PriceOracle     :", config.priceOracle);
  console.log();

  // ── Deploy MantleArb ─────────────────────────────────────────────────────
  console.log("Deploying MantleArb contract...");
  const MantleArb = await ethers.getContractFactory("MantleArb");
  const mantleArb = await MantleArb.deploy(
    config.routers.merchantMoe,
    config.routers.fusionX,
    config.routers.agni,
    config.routers.cyberSwap || ethers.ZeroAddress,
    config.routers.helix || ethers.ZeroAddress,
    config.routers.iZiSwap || ethers.ZeroAddress,
    config.flashLoanProviders.balancerVault || ethers.ZeroAddress,
    config.flashLoanProviders.aavePool || ethers.ZeroAddress,
    config.priceOracle
  );

  await mantleArb.waitForDeployment();
  const contractAddress = await mantleArb.getAddress();

  console.log("  OK  MantleArb deployed to:", contractAddress);
  console.log();

  // ── Deploy FlashLoanArb ─────────────────────────────────────────────
  console.log("Deploying FlashLoanArb contract...");
  const FlashLoanArb = await ethers.getContractFactory("FlashLoanArb");
  const aavePoolForFlash = config.flashLoanProviders.aavePool || ethers.ZeroAddress;
  const flashLoanArb = await FlashLoanArb.deploy(
    aavePoolForFlash,
    deployer.address
  );
  await flashLoanArb.waitForDeployment();
  const flashLoanArbAddress = await flashLoanArb.getAddress();
  console.log("  OK  FlashLoanArb deployed to:", flashLoanArbAddress);
  console.log();

  // ── Wait for confirmations ───────────────────────────────────────────────
  const deployTx = mantleArb.deploymentTransaction();
  let receipt = null;
  if (deployTx) {
    console.log("Waiting for 5 block confirmations...");
    receipt = await deployTx.wait(5);
    console.log("  Block       :", receipt.blockNumber);
    console.log("  Gas used    :", receipt.gasUsed.toString());
    console.log("  Gas price   :", ethers.formatUnits(receipt.gasPrice, "gwei"), "gwei");
    console.log("  Tx hash     :", receipt.hash);
    console.log();
  }

  // ── Verify on block explorer (mainnet/testnet only) ──────────────────────
  if (config.explorer && config.explorerApi) {
    console.log("Verifying contract on block explorer...");
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          config.routers.merchantMoe,
          config.routers.fusionX,
          config.routers.agni,
          config.routers.cyberSwap || ethers.ZeroAddress,
          config.routers.helix || ethers.ZeroAddress,
          config.routers.iZiSwap || ethers.ZeroAddress,
          config.flashLoanProviders.balancerVault || ethers.ZeroAddress,
          config.flashLoanProviders.aavePool || ethers.ZeroAddress,
          config.priceOracle,
        ],
      });
      console.log("  OK  Contract verified!");
      console.log("  Explorer URL:", config.explorer + "/address/" + contractAddress);
    } catch (e) {
      if (e.message.includes("Already Verified")) {
        console.log("  INFO: Contract already verified.");
      } else {
        console.log("  WARN: Verification failed:", e.message);
        console.log("  Manual verify:");
        console.log("    npx hardhat verify --network " + network.name + " " + contractAddress + ' "' + config.routers.merchantMoe + '" "' + config.routers.fusionX + '" "' + config.routers.agni + '" "' + (config.routers.cyberSwap || ethers.ZeroAddress) + '" "' + (config.routers.helix || ethers.ZeroAddress) + '" "' + (config.routers.iZiSwap || ethers.ZeroAddress) + '" "' + (config.flashLoanProviders.balancerVault || ethers.ZeroAddress) + '" "' + (config.flashLoanProviders.aavePool || ethers.ZeroAddress) + '" "' + config.priceOracle + '"');
      }
    }
    console.log();
  }

  // ── Save deployment info ─────────────────────────────────────────────────
  const deploymentInfo = {
    network:          network.name,
    chainId:          Number(chainId),
    contractAddress,
    flashLoanArbAddress,
    deployer:         deployer.address,
    routers:          config.routers,
    flashLoanProviders: config.flashLoanProviders,
    priceOracle:      config.priceOracle,
    explorerUrl:      config.explorer ? config.explorer + "/address/" + contractAddress : "",
    deployedAt:       new Date().toISOString(),
    blockNumber:      receipt ? receipt.blockNumber : null,
    txHash:           receipt ? receipt.hash : null,
    gasUsed:          receipt ? receipt.gasUsed.toString() : null,
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = "deployment-" + network.name + "-" + Date.now() + ".json";
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", filepath);

  const latestPath = path.join(deploymentsDir, network.name + "-latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Latest deployment saved to:", latestPath);

  // ── Print summary ────────────────────────────────────────────────────────
  console.log();
  console.log("============================================================");
  console.log("              Deployment Complete!                          ");
  console.log("============================================================");
  console.log("  Contract : " + contractAddress);
  console.log("  Network  : " + config.name);
  if (config.explorer) {
    console.log("  Explorer : " + config.explorer + "/address/" + contractAddress);
  }
  console.log("  Next steps:");
  console.log("    1. Update .env: CONTRACT_ADDRESS=" + contractAddress);
  console.log("    2. Verify on explorer (if not auto-verified)");
  console.log("    3. Run: npm start   (to start the API server)");
  console.log("============================================================");

  return contractAddress;
}

main()
  .then(function(address) {
    console.log("\nDeployment succeeded:", address);
    process.exit(0);
  })
  .catch(function(error) {
    console.error("\nDeployment failed:", error.message);
    if (error.message.includes("insufficient funds")) {
      console.error("Get testnet tokens from the Mantle faucet:");
      console.error("  https://faucet.testnet.mantle.xyz");
    }
    process.exit(1);
  });
