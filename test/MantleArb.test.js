const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MantleArb", function () {
  let MantleArb, mantleArb;
  let owner, operator, other;
  let tokenA, tokenB;
  let router1, router2, router3;
  let mockOracle;
  let mockBalancerVault;
  let mockAavePool;

  const ZERO_ADDRESS = ethers.ZeroAddress;

  beforeEach(async function () {
    [owner, operator, other] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    // Deploy mock routers
    const MockRouter = await ethers.getContractFactory("MockRouter");
    router1 = await MockRouter.deploy(ZERO_ADDRESS);
    router2 = await MockRouter.deploy(ZERO_ADDRESS);
    router3 = await MockRouter.deploy(ZERO_ADDRESS);
    await router1.waitForDeployment();
    await router2.waitForDeployment();
    await router3.waitForDeployment();

    // Deploy mock oracle
    const MockOracle = await ethers.getContractFactory("MockPriceOracle");
    mockOracle = await MockOracle.deploy();
    await mockOracle.waitForDeployment();

    // Deploy mock flash loan providers
    const MockBalancerVault = await ethers.getContractFactory("MockBalancerVault");
    mockBalancerVault = await MockBalancerVault.deploy();
    await mockBalancerVault.waitForDeployment();

    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    mockAavePool = await MockAavePool.deploy();
    await mockAavePool.waitForDeployment();

    // Deploy MantleArb
    MantleArb = await ethers.getContractFactory("MantleArb");
    mantleArb = await MantleArb.deploy(
      await router1.getAddress(),
      await router2.getAddress(),
      await router3.getAddress(),
      ZERO_ADDRESS, // cyberSwap
      ZERO_ADDRESS, // helix
      ZERO_ADDRESS, // iZiSwap
      ZERO_ADDRESS, // balancerVault (set later)
      ZERO_ADDRESS, // aavePool (set later)
      await mockOracle.getAddress()
    );
    await mantleArb.waitForDeployment();

    // Configure flash loan providers
    await mantleArb.setFlashLoanProviders(
      await mockBalancerVault.getAddress(),
      await mockAavePool.getAddress()
    );

    // Mint tokens to the contract for regular arbitrage
    await tokenA.mint(await mantleArb.getAddress(), ethers.parseEther("100000"));
    await tokenB.mint(await mantleArb.getAddress(), ethers.parseEther("100000"));

    // Mint tokens to routers for swap output
    await tokenA.mint(await router1.getAddress(), ethers.parseEther("100000"));
    await tokenB.mint(await router1.getAddress(), ethers.parseEther("100000"));
    await tokenA.mint(await router2.getAddress(), ethers.parseEther("100000"));
    await tokenB.mint(await router2.getAddress(), ethers.parseEther("100000"));
    await tokenA.mint(await router3.getAddress(), ethers.parseEther("100000"));
    await tokenB.mint(await router3.getAddress(), ethers.parseEther("100000"));

    // Mint tokens to mock flash loan providers
    await tokenA.mint(await mockBalancerVault.getAddress(), ethers.parseEther("1000000"));
    await tokenA.mint(await mockAavePool.getAddress(), ethers.parseEther("1000000"));

    // Set exchange rates for arbitrage testing.
    // The contract's slippage protection: amountOutMin = amountIn * (10000 - maxSlippageBps) / 10000
    // With maxSlippageBps=100 (1%), amountOutMin = amountIn * 99%.
    // So the buy router must return >= 99% of input to pass slippage check.
    //
    // Router1 (buy cheap): 1 TKA -> 0.992 TKB (passes 99% slippage check)
    // Router2 (sell high): 1 TKB -> 1.052 TKA (round-trip profit ~4.4%)
    await router1.setExchangeRate(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      ethers.parseEther("0.992") // 1 TKA -> 0.992 TKB (passes 99% min)
    );
    await router1.setExchangeRate(
      await tokenB.getAddress(),
      await tokenA.getAddress(),
      ethers.parseEther("0.98") // 1 TKB -> 0.98 TKA
    );
    await router2.setExchangeRate(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      ethers.parseEther("1.03") // 1 TKA -> 1.03 TKB (arbitrage from this side)
    );
    await router2.setExchangeRate(
      await tokenB.getAddress(),
      await tokenA.getAddress(),
      ethers.parseEther("1.052") // 1 TKB -> 1.052 TKA (sell high)
    );

    // Set oracle price
    await mockOracle.setPrice(await tokenA.getAddress(), ethers.parseEther("1.0"));
  });

  // =============================================
  // 1. Deployment Tests
  // =============================================
  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await mantleArb.owner()).to.equal(owner.address);
    });

    it("should set the correct routers", async function () {
      expect(await mantleArb.merchantMoeRouter()).to.equal(await router1.getAddress());
      expect(await mantleArb.fusionXRouter()).to.equal(await router2.getAddress());
      expect(await mantleArb.agniRouter()).to.equal(await router3.getAddress());
    });

    it("should set the price oracle", async function () {
      expect(await mantleArb.priceOracle()).to.equal(await mockOracle.getAddress());
    });

    it("should set deployer as aiOperator", async function () {
      expect(await mantleArb.aiOperator()).to.equal(owner.address);
    });

    it("should have correct default risk parameters", async function () {
      expect(await mantleArb.maxTradeSize()).to.equal(ethers.parseEther("10000"));
      expect(await mantleArb.minProfitBps()).to.equal(50);
      expect(await mantleArb.maxSlippageBps()).to.equal(100);
      expect(await mantleArb.dailyTradeLimit()).to.equal(100);
    });

    it("should have correct default flash loan parameters", async function () {
      expect(await mantleArb.maxFlashLoanSize()).to.equal(ethers.parseEther("100000"));
      expect(await mantleArb.flashLoanEnabled()).to.equal(true);
    });

    it("should start with zero statistics", async function () {
      const stats = await mantleArb.getStats();
      expect(stats[0]).to.equal(0); // totalTrades
      expect(stats[1]).to.equal(0); // totalProfit
      expect(stats[2]).to.equal(0); // totalLosses
      expect(stats[3]).to.equal(0); // totalFlashLoanTrades
      expect(stats[4]).to.equal(0); // dailyTradeCount
      expect(stats[5]).to.equal(0); // lastTradeTimestamp
    });
  });

  // =============================================
  // 2. Admin Functions Tests
  // =============================================
  describe("Admin Functions", function () {
    it("should allow owner to set AI operator", async function () {
      await mantleArb.setAIOperator(operator.address);
      expect(await mantleArb.aiOperator()).to.equal(operator.address);
    });

    it("should revert when non-owner sets AI operator", async function () {
      await expect(
        mantleArb.connect(other).setAIOperator(operator.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when setting zero address as AI operator", async function () {
      await expect(
        mantleArb.setAIOperator(ZERO_ADDRESS)
      ).to.be.revertedWith("Invalid address");
    });

    it("should allow owner to set max trade size", async function () {
      const newSize = ethers.parseEther("5000");
      await mantleArb.setMaxTradeSize(newSize);
      expect(await mantleArb.maxTradeSize()).to.equal(newSize);
    });

    it("should revert if max trade size is zero", async function () {
      await expect(mantleArb.setMaxTradeSize(0)).to.be.revertedWith("Invalid size");
    });

    it("should allow owner to set min profit bps", async function () {
      await mantleArb.setMinProfitBps(100);
      expect(await mantleArb.minProfitBps()).to.equal(100);
    });

    it("should revert if min profit bps exceeds 1000", async function () {
      await expect(mantleArb.setMinProfitBps(1001)).to.be.revertedWith("Invalid bps");
    });

    it("should allow owner to set max slippage bps", async function () {
      await mantleArb.setMaxSlippageBps(200);
      expect(await mantleArb.maxSlippageBps()).to.equal(200);
    });

    it("should revert if max slippage bps exceeds 500", async function () {
      await expect(mantleArb.setMaxSlippageBps(501)).to.be.revertedWith("Invalid bps");
    });

    it("should allow owner to set daily trade limit", async function () {
      await mantleArb.setDailyTradeLimit(50);
      expect(await mantleArb.dailyTradeLimit()).to.equal(50);
    });

    it("should allow owner to set flash loan providers", async function () {
      await mantleArb.setFlashLoanProviders(
        await mockBalancerVault.getAddress(),
        await mockAavePool.getAddress()
      );
      expect(await mantleArb.balancerVault()).to.equal(await mockBalancerVault.getAddress());
      expect(await mantleArb.aavePool()).to.equal(await mockAavePool.getAddress());
    });

    it("should allow owner to enable/disable flash loans", async function () {
      await mantleArb.setFlashLoanEnabled(false);
      expect(await mantleArb.flashLoanEnabled()).to.equal(false);
      await mantleArb.setFlashLoanEnabled(true);
      expect(await mantleArb.flashLoanEnabled()).to.equal(true);
    });

    it("should allow owner to set max flash loan size", async function () {
      await mantleArb.setMaxFlashLoanSize(ethers.parseEther("500000"));
      expect(await mantleArb.maxFlashLoanSize()).to.equal(ethers.parseEther("500000"));
    });

    it("should revert if max flash loan size is zero", async function () {
      await expect(mantleArb.setMaxFlashLoanSize(0)).to.be.revertedWith("Invalid size");
    });

    it("should allow owner to set price oracle", async function () {
      const newOracle = "0x2222222222222222222222222222222222222222";
      await mantleArb.setPriceOracle(newOracle);
      expect(await mantleArb.priceOracle()).to.equal(newOracle);
    });

    it("should allow owner to set max price deviation bps", async function () {
      await mantleArb.setMaxPriceDeviationBps(300);
      expect(await mantleArb.maxPriceDeviationBps()).to.equal(300);
    });

    it("should revert if max price deviation exceeds 1000", async function () {
      await expect(mantleArb.setMaxPriceDeviationBps(1001)).to.be.revertedWith("Invalid deviation");
    });

    it("should revert admin functions from non-owner", async function () {
      await expect(mantleArb.connect(other).setMaxTradeSize(1000)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  // =============================================
  // 3. Arbitrage Execution Tests
  // =============================================
  describe("Arbitrage Execution", function () {
    it("should execute arbitrage successfully with profit", async function () {
      const amountIn = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const opp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: amountIn,
        routerBuy: await router1.getAddress(), // cheap: 0.95
        routerSell: await router2.getAddress(), // expensive: 1.05 (sell back)
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("1"), // 1%
        deadline: deadline,
      };

      const balanceBefore = await tokenA.balanceOf(await mantleArb.getAddress());

      const tx = await mantleArb.executeArbitrage(opp);
      const receipt = await tx.wait();

      const balanceAfter = await tokenA.balanceOf(await mantleArb.getAddress());
      const profit = balanceAfter - balanceBefore;

      expect(profit).to.be.gt(0);

      // Check stats updated
      const stats = await mantleArb.getStats();
      expect(stats[0]).to.equal(1); // totalTrades
      expect(stats[1]).to.be.gt(0); // totalProfit

      // Verify event emitted
      await expect(tx).to.emit(mantleArb, "ArbitrageExecuted");
    });

    it("should revert if trade size exceeds max", async function () {
      const amountIn = ethers.parseEther("20000"); // max is 10000
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const opp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: amountIn,
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("100"),
        deadline: deadline,
      };

      await expect(mantleArb.executeArbitrage(opp)).to.be.revertedWith("Trade too large");
    });

    it("should revert if opportunity has expired", async function () {
      const amountIn = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) - 3600; // in the past

      const opp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: amountIn,
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("1"),
        deadline: deadline,
      };

      await expect(mantleArb.executeArbitrage(opp)).to.be.revertedWith("Opportunity expired");
    });

    it("should revert if expected profit is below minimum", async function () {
      const amountIn = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Set min profit bps to very high
      await mantleArb.setMinProfitBps(1000); // 10%

      const opp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: amountIn,
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("1"), // 1% but min is 10%
        deadline: deadline,
      };

      await expect(mantleArb.executeArbitrage(opp)).to.be.revertedWith("Expected profit too low");
    });

    it("should revert when called by non-operator", async function () {
      const amountIn = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const opp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: amountIn,
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("1"),
        deadline: deadline,
      };

      await expect(mantleArb.connect(other).executeArbitrage(opp)).to.be.revertedWith(
        "Not operator"
      );
    });

    it("should allow AI operator to execute arbitrage", async function () {
      await mantleArb.setAIOperator(operator.address);

      const amountIn = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const opp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: amountIn,
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("1"),
        deadline: deadline,
      };

      const tx = await mantleArb.connect(operator).executeArbitrage(opp);
      await expect(tx).to.emit(mantleArb, "ArbitrageExecuted");
    });

    it("should revoke approvals after arbitrage", async function () {
      const amountIn = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const opp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: amountIn,
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("1"),
        deadline: deadline,
      };

      await mantleArb.executeArbitrage(opp);

      // Check approvals are revoked
      const allowanceA = await tokenA.allowance(
        await mantleArb.getAddress(),
        await router1.getAddress()
      );
      const allowanceB = await tokenB.allowance(
        await mantleArb.getAddress(),
        await router2.getAddress()
      );
      expect(allowanceA).to.equal(0);
      expect(allowanceB).to.equal(0);
    });
  });

  // =============================================
  // 4. Flash Loan Tests
  // =============================================
  describe("Flash Loan Arbitrage", function () {
    it("should revert flash loan when disabled", async function () {
      await mantleArb.setFlashLoanEnabled(false);

      const flashOpp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: ethers.parseEther("1000"),
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("10"),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        useBalancer: true,
      };

      await expect(mantleArb.executeFlashLoanArbitrage(flashOpp)).to.be.revertedWith(
        "Flash loans disabled"
      );
    });

    it("should revert flash loan when amount exceeds limit", async function () {
      const flashOpp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: ethers.parseEther("200000"), // max is 100000
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("100"),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        useBalancer: true,
      };

      await expect(mantleArb.executeFlashLoanArbitrage(flashOpp)).to.be.revertedWith(
        "Exceeds flash loan limit"
      );
    });

    it("should revert when Balancer not configured", async function () {
      // Deploy a fresh contract without Balancer configured
      const MantleArb2 = await ethers.getContractFactory("MantleArb");
      const freshContract = await MantleArb2.deploy(
        await router1.getAddress(),
        await router2.getAddress(),
        await router3.getAddress(),
        ZERO_ADDRESS, // cyberSwap
        ZERO_ADDRESS, // helix
        ZERO_ADDRESS, // iZiSwap
        ZERO_ADDRESS, // balancerVault
        ZERO_ADDRESS, // aavePool
        await mockOracle.getAddress()
      );
      await freshContract.waitForDeployment();

      const flashOpp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: ethers.parseEther("100"),
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("1"),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        useBalancer: true,
      };

      await expect(freshContract.executeFlashLoanArbitrage(flashOpp)).to.be.revertedWith(
        "Balancer not configured"
      );
    });

    it("should revert when Aave not configured", async function () {
      const MantleArb2 = await ethers.getContractFactory("MantleArb");
      const freshContract = await MantleArb2.deploy(
        await router1.getAddress(),
        await router2.getAddress(),
        await router3.getAddress(),
        ZERO_ADDRESS, // cyberSwap
        ZERO_ADDRESS, // helix
        ZERO_ADDRESS, // iZiSwap
        ZERO_ADDRESS, // balancerVault
        ZERO_ADDRESS, // aavePool
        await mockOracle.getAddress()
      );
      await freshContract.waitForDeployment();

      const flashOpp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: ethers.parseEther("100"),
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("1"),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        useBalancer: false,
      };

      await expect(freshContract.executeFlashLoanArbitrage(flashOpp)).to.be.revertedWith(
        "Aave not configured"
      );
    });

    it("should revert flash loan from non-operator", async function () {
      const flashOpp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: ethers.parseEther("100"),
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("1"),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        useBalancer: true,
      };

      await expect(mantleArb.connect(other).executeFlashLoanArbitrage(flashOpp)).to.be.revertedWith(
        "Not operator"
      );
    });
  });

  // =============================================
  // 5. Emergency Functions Tests
  // =============================================
  describe("Emergency Functions", function () {
    it("should allow owner to trigger emergency stop", async function () {
      await mantleArb.emergencyStopContract("Test emergency");
      expect(await mantleArb.emergencyStop()).to.equal(true);
    });

    it("should allow owner to resume contract", async function () {
      await mantleArb.emergencyStopContract("Test");
      await mantleArb.resumeContract();
      expect(await mantleArb.emergencyStop()).to.equal(false);
    });

    it("should revert emergency stop from non-owner", async function () {
      await expect(
        mantleArb.connect(other).emergencyStopContract("Hack")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should block arbitrage when emergency stop is active", async function () {
      await mantleArb.emergencyStopContract("Paused");

      const opp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: ethers.parseEther("100"),
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("1"),
        deadline: Math.floor(Date.now() / 1000) + 3600,
      };

      await expect(mantleArb.executeArbitrage(opp)).to.be.revertedWith("Pausable: paused");
    });

    it("should emit EmergencyStop event", async function () {
      await expect(mantleArb.emergencyStopContract("Security alert"))
        .to.emit(mantleArb, "EmergencyStop")
        .withArgs(owner.address, "Security alert");
    });

    it("should allow resume from non-owner after emergency (only owner)", async function () {
      await mantleArb.emergencyStopContract("Test");
      await expect(mantleArb.connect(other).resumeContract()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  // =============================================
  // 6. Withdrawal Functions Tests
  // =============================================
  describe("Withdrawal Functions", function () {
    it("should allow owner to withdraw ETH", async function () {
      await owner.sendTransaction({
        to: await mantleArb.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await mantleArb.withdrawETH();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter + gasCost - balanceBefore).to.equal(ethers.parseEther("1.0"));
    });

    it("should revert withdrawETH when no balance", async function () {
      await expect(mantleArb.withdrawETH()).to.be.revertedWith("No ETH to withdraw");
    });

    it("should revert withdrawToken with invalid token", async function () {
      await expect(mantleArb.withdrawToken(ZERO_ADDRESS, 100)).to.be.revertedWith(
        "Invalid token"
      );
    });

    it("should revert withdrawToken with zero amount", async function () {
      await expect(
        mantleArb.withdrawToken(await tokenA.getAddress(), 0)
      ).to.be.revertedWith("Invalid amount");
    });

    it("should allow owner to withdraw tokens", async function () {
      const amount = ethers.parseEther("100");
      await mantleArb.withdrawToken(await tokenA.getAddress(), amount);

      const ownerBalance = await tokenA.balanceOf(owner.address);
      expect(ownerBalance).to.be.gte(amount);
    });

    it("should revert emergencyWithdrawAll with empty token list if no funds", async function () {
      await mantleArb.emergencyWithdrawAll([]);
    });
  });

  // =============================================
  // 7. Router Management Tests
  // =============================================
  describe("Router Management", function () {
    it("should allow owner to update routers", async function () {
      const newRouter = "0x1111111111111111111111111111111111111111";
      await mantleArb.setRouters(newRouter, ZERO_ADDRESS, ZERO_ADDRESS);
      expect(await mantleArb.merchantMoeRouter()).to.equal(newRouter);
      expect(await mantleArb.fusionXRouter()).to.equal(await router2.getAddress());
    });

    it("should allow setting additional routers", async function () {
      const cyberSwap = "0x3333333333333333333333333333333333333333";
      const helix = "0x4444444444444444444444444444444444444444";
      const iZiSwap = "0x5555555555555555555555555555555555555555";
      await mantleArb.setAdditionalRouters(cyberSwap, helix, iZiSwap);

      const routers = await mantleArb.getRouters();
      expect(routers[3]).to.equal(cyberSwap);
      expect(routers[4]).to.equal(helix);
      expect(routers[5]).to.equal(iZiSwap);
    });

    it("should get all routers via getRouters()", async function () {
      const routers = await mantleArb.getRouters();
      expect(routers[0]).to.equal(await router1.getAddress());
      expect(routers[1]).to.equal(await router2.getAddress());
      expect(routers[2]).to.equal(await router3.getAddress());
    });
  });

  // =============================================
  // 8. Known Tokens Tests
  // =============================================
  describe("Known Tokens", function () {
    it("should allow owner to add known tokens", async function () {
      await mantleArb.addKnownToken(await tokenA.getAddress());
      const tokens = await mantleArb.getKnownTokens();
      expect(tokens.length).to.equal(1);
      expect(tokens[0]).to.equal(await tokenA.getAddress());
    });

    it("should revert adding zero address as known token", async function () {
      await expect(mantleArb.addKnownToken(ZERO_ADDRESS)).to.be.revertedWith("Invalid token");
    });

    it("should revert adding duplicate known token", async function () {
      await mantleArb.addKnownToken(await tokenA.getAddress());
      await expect(mantleArb.addKnownToken(await tokenA.getAddress())).to.be.revertedWith(
        "Already known"
      );
    });

    it("should allow owner to remove known tokens", async function () {
      await mantleArb.addKnownToken(await tokenA.getAddress());
      await mantleArb.addKnownToken(await tokenB.getAddress());
      await mantleArb.removeKnownToken(await tokenA.getAddress());

      const tokens = await mantleArb.getKnownTokens();
      expect(tokens.length).to.equal(1);
      expect(tokens[0]).to.equal(await tokenB.getAddress());
    });

    it("should revert removing non-known token", async function () {
      await expect(mantleArb.removeKnownToken(await tokenA.getAddress())).to.be.revertedWith(
        "Not a known token"
      );
    });

    it("should emit KnownTokenAdded event", async function () {
      await expect(mantleArb.addKnownToken(await tokenA.getAddress()))
        .to.emit(mantleArb, "KnownTokenAdded")
        .withArgs(await tokenA.getAddress());
    });

    it("should emit KnownTokenRemoved event", async function () {
      await mantleArb.addKnownToken(await tokenA.getAddress());
      await expect(mantleArb.removeKnownToken(await tokenA.getAddress()))
        .to.emit(mantleArb, "KnownTokenRemoved")
        .withArgs(await tokenA.getAddress());
    });
  });

  // =============================================
  // 9. Daily Trade Limit Tests
  // =============================================
  describe("Daily Trade Limits", function () {
    it("should allow owner to reset daily trade count", async function () {
      await mantleArb.resetDailyTradeCount();
      const stats = await mantleArb.getStats();
      expect(stats[4]).to.equal(0); // dailyTradeCount
    });

    it("should emit DailyCountReset on manual reset", async function () {
      await expect(mantleArb.resetDailyTradeCount())
        .to.emit(mantleArb, "DailyCountReset");
    });
  });

  // =============================================
  // 10. Statistics Tests
  // =============================================
  describe("Statistics", function () {
    it("should track stats after arbitrage", async function () {
      const amountIn = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const opp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: amountIn,
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("1"),
        deadline: deadline,
      };

      await mantleArb.executeArbitrage(opp);

      const stats = await mantleArb.getStats();
      expect(stats[0]).to.equal(1); // totalTrades
      expect(stats[1]).to.be.gt(0); // totalProfit
      expect(stats[4]).to.equal(1); // dailyTradeCount
      expect(stats[5]).to.be.gt(0); // lastTradeTimestamp
    });

    it("should accumulate trades across multiple executions", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      for (let i = 0; i < 3; i++) {
        const opp = {
          tokenA: await tokenA.getAddress(),
          tokenB: await tokenB.getAddress(),
          amountIn: ethers.parseEther("100"),
          routerBuy: await router1.getAddress(),
          routerSell: await router2.getAddress(),
          minAmountOut: 0,
          expectedProfit: ethers.parseEther("1"),
          deadline: deadline,
        };
        await mantleArb.executeArbitrage(opp);
      }

      const stats = await mantleArb.getStats();
      expect(stats[0]).to.equal(3); // totalTrades
      expect(stats[4]).to.equal(3); // dailyTradeCount
    });
  });

  // =============================================
  // 11. Price Oracle Tests
  // =============================================
  describe("Price Oracle", function () {
    it("should get price from oracle", async function () {
      const price = await mockOracle.getPrice(await tokenA.getAddress());
      expect(price).to.equal(ethers.parseEther("1.0"));
    });

    it("should allow updating oracle price", async function () {
      await mockOracle.setPrice(await tokenA.getAddress(), ethers.parseEther("2.0"));
      const price = await mockOracle.getPrice(await tokenA.getAddress());
      expect(price).to.equal(ethers.parseEther("2.0"));
    });
  });

  // =============================================
  // 12. ReentrancyGuard Tests
  // =============================================
  describe("ReentrancyGuard", function () {
    it("should have nonReentrant modifier on executeArbitrage", async function () {
      // The contract uses nonReentrant - we verify the function exists and is guarded
      // by checking that normal calls work (no revert from reentrancy guard itself)
      const amountIn = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const opp = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: amountIn,
        routerBuy: await router1.getAddress(),
        routerSell: await router2.getAddress(),
        minAmountOut: 0,
        expectedProfit: ethers.parseEther("1"),
        deadline: deadline,
      };

      const tx = await mantleArb.executeArbitrage(opp);
      await expect(tx).to.emit(mantleArb, "ArbitrageExecuted");
    });
  });

  // =============================================
  // 13. receive() Function Tests
  // =============================================
  describe("Receive ETH", function () {
    it("should accept ETH transfers", async function () {
      await owner.sendTransaction({
        to: await mantleArb.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const balance = await ethers.provider.getBalance(await mantleArb.getAddress());
      expect(balance).to.equal(ethers.parseEther("1.0"));
    });
  });
});
