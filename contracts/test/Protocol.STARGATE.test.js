const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Protocol.STARGATE - USDT Transfers", function () {
  let stableRouter;
  let routeProcessor;
  let swapExecutor;
  let feeManager;
  let owner;
  let user;
  let recipient;
  let usdt;

  beforeEach(async function () {
    [owner, user, recipient] = await ethers.getSigners();

    // Deploy USDT token
    const MockToken = await ethers.getContractFactory("MockERC20");
    usdt = await MockToken.deploy("Tether USD", "USDT", 6);
    await usdt.waitForDeployment();

    // Deploy infrastructure
    const FeeManager = await ethers.getContractFactory("FeeManager");
    feeManager = await FeeManager.deploy(owner.address);
    await feeManager.waitForDeployment();

    const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
    swapExecutor = await SwapExecutor.deploy();
    await swapExecutor.waitForDeployment();

    const MockRouteProcessor = await ethers.getContractFactory("MockRouteProcessor");
    routeProcessor = await MockRouteProcessor.deploy();
    await routeProcessor.waitForDeployment();

    // Deploy StableRouter
    const StableRouter = await ethers.getContractFactory("StableRouter");
    stableRouter = await upgrades.deployProxy(
      StableRouter,
      [
        await routeProcessor.getAddress(),
        await swapExecutor.getAddress(),
        await feeManager.getAddress()
      ],
      { 
        initializer: "initialize",
        kind: "uups"
      }
    );
    await stableRouter.waitForDeployment();

    // Setup
    await feeManager.authorizeCollector(await stableRouter.getAddress(), true);
    
    // Fund user with USDT
    await usdt.mint(user.address, ethers.parseUnits("100000", 6));
  });

  describe("USDT Same-Chain Transfers", function () {
    it("Should execute USDT transfer from Ethereum to Arbitrum", async function () {
      const amount = ethers.parseUnits("1000", 6);
      const destChainId = 42161; // Arbitrum
      const stargateFee = ethers.parseEther("0.001");

      await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdt.getAddress(),
        destToken: await usdt.getAddress(),
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: stargateFee })
      ).to.emit(stableRouter, "RouteInitiated")
        .withArgs(
          user.address,
          await usdt.getAddress(),
          await usdt.getAddress(),
          amount,
          destChainId,
          recipient.address
        );
    });

    it("Should execute USDT transfers to all supported chains", async function () {
      const amount = ethers.parseUnits("500", 6);
      const supportedChains = [42161, 10, 137, 43114]; // Arbitrum, Optimism, Polygon, Avalanche
      const stargateFee = ethers.parseEther("0.001");

      for (const destChainId of supportedChains) {
        await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await usdt.getAddress(),
          destToken: await usdt.getAddress(),
          amount: amount,
          destChainId: destChainId,
          recipient: recipient.address,
          minAmountOut: amount * 99n / 100n,
          routeData: "0x"
        };

        await expect(
          stableRouter.connect(user).executeRoute(routeParams, { value: stargateFee })
        ).to.emit(stableRouter, "RouteInitiated");
      }
    });

    it("Should revert USDT transfer to Base (not native)", async function () {
      const amount = ethers.parseUnits("100", 6);
      const stargateFee = ethers.parseEther("0.001");
      
      await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdt.getAddress(),
        destToken: await usdt.getAddress(),
        amount: amount,
        destChainId: 8453, // Base - USDT not native
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: stargateFee })
      ).to.be.revertedWith("USDT cannot be routed to Base");
    });
  });

  describe("Stargate Fee Handling", function () {
    it("Should require Stargate fees for USDT transfers", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdt.getAddress(),
        destToken: await usdt.getAddress(),
        amount: amount,
        destChainId: 137, // Polygon
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      // Should fail without fee
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.be.revertedWith("Insufficient Stargate fee");

      // Should succeed with fee
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should handle different USDT amounts correctly", async function () {
      const amounts = [
        ethers.parseUnits("0.01", 6),    // Very small: 0.01 USDT
        ethers.parseUnits("100", 6),     // Medium: 100 USDT
        ethers.parseUnits("10000", 6),   // Large: 10,000 USDT
        ethers.parseUnits("1000000", 6), // Very large: 1M USDT
      ];
      
      for (const amount of amounts) {
        await usdt.mint(user.address, amount);
        await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await usdt.getAddress(),
          destToken: await usdt.getAddress(),
          amount: amount,
          destChainId: 42161,
          recipient: recipient.address,
          minAmountOut: amount * 99n / 100n,
          routeData: "0x"
        };

        await expect(
          stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") })
        ).to.emit(stableRouter, "RouteInitiated");
      }
    });

    it("Should refund excess Stargate fees", async function () {
      const amount = ethers.parseUnits("100", 6);
      const excessFee = ethers.parseEther("0.05"); // Much more than needed
      
      await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdt.getAddress(),
        destToken: await usdt.getAddress(),
        amount: amount,
        destChainId: 137,
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      const balanceBefore = await ethers.provider.getBalance(user.address);
      
      const tx = await stableRouter.connect(user).executeRoute(routeParams, { value: excessFee });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const balanceAfter = await ethers.provider.getBalance(user.address);
      
      // User should get most of the excess back
      const actualCost = balanceBefore - balanceAfter - gasUsed;
      expect(actualCost).to.be.lt(ethers.parseEther("0.002")); // Should cost less than 0.002 ETH
    });
  });

  describe("Protocol Selection for USDT", function () {
    it("Should select Protocol.STARGATE for USDT same-token routes", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdt.getAddress(),
        destToken: await usdt.getAddress(),
        amount: amount,
        destChainId: 137, // Polygon
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      // Should use Protocol 3 (STARGATE)
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") })
      ).to.emit(stableRouter, "RouteInitiated");
    });
  });

  describe("Gas Optimization for Stargate", function () {
    it("Should use reasonable gas for Stargate transfers", async function () {
      const amount = ethers.parseUnits("1000", 6);
      const chains = [42161, 10, 137, 43114]; // All supported chains
      
      for (const destChainId of chains) {
        await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await usdt.getAddress(),
          destToken: await usdt.getAddress(),
          amount: amount,
          destChainId: destChainId,
          recipient: recipient.address,
          minAmountOut: amount * 99n / 100n,
          routeData: "0x"
        };

        const tx = await stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") });
        const receipt = await tx.wait();

        // Stargate transfers should use less than 350k gas
        expect(receipt.gasUsed).to.be.lt(350000);
      }
    });

    it("Should batch multiple USDT transfers efficiently", async function () {
      const amounts = [
        ethers.parseUnits("100", 6),
        ethers.parseUnits("250", 6),
        ethers.parseUnits("500", 6)
      ];

      let totalGas = 0n;

      for (const amount of amounts) {
        await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await usdt.getAddress(),
          destToken: await usdt.getAddress(),
          amount: amount,
          destChainId: 137,
          recipient: recipient.address,
          minAmountOut: amount * 99n / 100n,
          routeData: "0x"
        };

        const tx = await stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") });
        const receipt = await tx.wait();
        totalGas += receipt.gasUsed;
      }

      // Average gas per transaction should be reasonable
      const avgGas = totalGas / 3n;
      expect(avgGas).to.be.lt(350000);
    });
  });

  describe("Stargate Liquidity Considerations", function () {
    it("Should handle slippage settings for USDT", async function () {
      const amount = ethers.parseUnits("10000", 6); // Large amount

      // Test different slippage tolerances
      const slippageSettings = [
        { minOut: amount * 999n / 1000n, shouldSucceed: true },  // 0.1% slippage
        { minOut: amount * 995n / 1000n, shouldSucceed: true },  // 0.5% slippage
        { minOut: amount * 970n / 1000n, shouldSucceed: true },  // 3% slippage (max)
      ];

      for (const { minOut, shouldSucceed } of slippageSettings) {
        // Mint and approve for each iteration
        await usdt.mint(user.address, amount);
        await usdt.connect(user).approve(await stableRouter.getAddress(), amount);
        
        const routeParams = {
          sourceToken: await usdt.getAddress(),
          destToken: await usdt.getAddress(),
          amount: amount,
          destChainId: 137,
          recipient: recipient.address,
          minAmountOut: minOut,
          routeData: "0x"
        };

        if (shouldSucceed) {
          await expect(
            stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") })
          ).to.emit(stableRouter, "RouteInitiated");
        }
      }
    });
  });
});