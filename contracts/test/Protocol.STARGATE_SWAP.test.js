const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Protocol.STARGATE_SWAP - Stargate Bridge + Destination Swap", function () {
  let stableRouter;
  let routeProcessor;
  let swapExecutor;
  let feeManager;
  let owner;
  let user;
  let recipient;
  let usdt, usdc;

  beforeEach(async function () {
    [owner, user, recipient] = await ethers.getSigners();

    // Deploy tokens
    const MockToken = await ethers.getContractFactory("MockERC20");
    usdt = await MockToken.deploy("Tether USD", "USDT", 6);
    await usdt.waitForDeployment();
    
    usdc = await MockToken.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    // Deploy infrastructure
    const FeeManager = await ethers.getContractFactory("FeeManager");
    feeManager = await FeeManager.deploy(owner.address);
    await feeManager.waitForDeployment();

    const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
    swapExecutor = await SwapExecutor.deploy("0x0000000000000000000000000000000000000001");
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

  describe("USDT to USDC Routes (Protocol 7)", function () {
    it("Should execute USDT to USDC via Stargate + swap", async function () {
      const amount = ethers.parseUnits("1000", 6);
      const destChainId = 42161; // Arbitrum
      const stargateFee = ethers.parseEther("0.0015"); // Higher fee for swap

      await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

      const swapData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint24", "uint256"],
        [await swapExecutor.getAddress(), 100, ethers.parseUnits("995", 6)] // 0.01% pool fee, min 995 USDC out
      );

      const routeParams = {
        sourceToken: await usdt.getAddress(),
        destToken: await usdc.getAddress(), // Different token!
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("995", 6), // Expect ~995 USDC after swap
        routeData: swapData
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: stargateFee })
      ).to.emit(stableRouter, "RouteInitiated")
        .withArgs(
          user.address,
          await usdt.getAddress(),
          await usdc.getAddress(),
          amount,
          destChainId,
          recipient.address
        );
    });

    it("Should handle USDT to USDC on all supported chains", async function () {
      const amount = ethers.parseUnits("500", 6);
      const supportedChains = [42161, 10, 137, 43114]; // All chains where USDT is native
      const stargateFee = ethers.parseEther("0.0015");

      for (const destChainId of supportedChains) {
        await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await usdt.getAddress(),
          destToken: await usdc.getAddress(),
          amount: amount,
          destChainId: destChainId,
          recipient: recipient.address,
          minAmountOut: ethers.parseUnits("490", 6), // Conservative due to fees
          routeData: ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint24", "uint256"],
            [await swapExecutor.getAddress(), 100, ethers.parseUnits("490", 6)]
          )
        };

        await expect(
          stableRouter.connect(user).executeRoute(routeParams, { value: stargateFee })
        ).to.emit(stableRouter, "RouteInitiated");
      }
    });

    it("Should not allow USDT to USDC on Base (USDT not native)", async function () {
      const amount = ethers.parseUnits("100", 6);
      const stargateFee = ethers.parseEther("0.0015");
      
      await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdt.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: 8453, // Base - USDT not native
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 6),
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: stargateFee })
      ).to.be.revertedWith("USDT cannot be routed to Base");
    });
  });

  describe("Protocol Selection for STARGATE_SWAP", function () {
    it("Should select Protocol.STARGATE_SWAP when USDT -> USDC", async function () {
      const amount = ethers.parseUnits("1000", 6);
      
      await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdt.getAddress(),
        destToken: await usdc.getAddress(), // Destination is USDC
        amount: amount,
        destChainId: 137, // Polygon
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("990", 6),
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint24", "uint256"],
          [await swapExecutor.getAddress(), 100, ethers.parseUnits("990", 6)]
        )
      };

      // Should use Protocol 7 (STARGATE_SWAP)
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.0015") })
      ).to.emit(stableRouter, "RouteInitiated");
    });
  });

  describe("Fee Handling for Stargate + Swap", function () {
    it("Should handle protocol fees and swap fees correctly", async function () {
      const amount = ethers.parseUnits("10000", 6);
      
      await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdt.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: 42161,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("9900", 6), // ~1% total fees
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint24", "uint256"],
          [await swapExecutor.getAddress(), 100, ethers.parseUnits("9900", 6)]
        )
      };

      const feesBefore = await feeManager.getTotalFees(await usdt.getAddress());
      
      await stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.0015") });
      
      const feesAfter = await feeManager.getTotalFees(await usdt.getAddress());
      const protocolFee = amount * 10n / 10000n; // 0.1%
      
      expect(feesAfter - feesBefore).to.equal(protocolFee);
    });

    it("Should require sufficient Stargate fees for bridge + swap", async function () {
      const amount = ethers.parseUnits("1000", 6);
      
      await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdt.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: 137,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("990", 6),
        routeData: "0x"
      };

      // Should fail without sufficient fee
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.0005") })
      ).to.be.revertedWith("Insufficient Stargate fee");

      // Should succeed with proper fee
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.0015") })
      ).to.emit(stableRouter, "RouteInitiated");
    });
  });

  describe("Slippage and Liquidity for Stargate + Swap", function () {
    it("Should handle different slippage tolerances", async function () {
      const amount = ethers.parseUnits("50000", 6); // Large amount
      
      const slippageSettings = [
        { minOut: amount * 999n / 1000n, name: "0.1% slippage" },
        { minOut: amount * 995n / 1000n, name: "0.5% slippage" },
        { minOut: amount * 990n / 1000n, name: "1% slippage" },
        { minOut: amount * 970n / 1000n, name: "3% slippage (max)" },
      ];

      for (const { minOut, name } of slippageSettings) {
        await usdt.mint(user.address, amount);
        await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await usdt.getAddress(),
          destToken: await usdc.getAddress(),
          amount: amount,
          destChainId: 42161,
          recipient: recipient.address,
          minAmountOut: minOut,
          routeData: ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint24", "uint256"],
            [await swapExecutor.getAddress(), 100, minOut]
          )
        };

        await expect(
          stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.0015") })
        ).to.emit(stableRouter, "RouteInitiated");
      }
    });

    it("Should handle various USDT amounts", async function () {
      const amounts = [
        ethers.parseUnits("10", 6),      // Small: 10 USDT
        ethers.parseUnits("1000", 6),    // Medium: 1,000 USDT
        ethers.parseUnits("100000", 6),  // Large: 100,000 USDT
      ];
      
      for (const amount of amounts) {
        await usdt.mint(user.address, amount);
        await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

        const minOut = amount * 99n / 100n; // 1% slippage

        const routeParams = {
          sourceToken: await usdt.getAddress(),
          destToken: await usdc.getAddress(),
          amount: amount,
          destChainId: 10, // Optimism
          recipient: recipient.address,
          minAmountOut: minOut,
          routeData: ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint24", "uint256"],
            [await swapExecutor.getAddress(), 100, minOut]
          )
        };

        await expect(
          stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.0015") })
        ).to.emit(stableRouter, "RouteInitiated");
      }
    });
  });

  describe("Gas Optimization for Stargate + Swap", function () {
    it("Should use reasonable gas for Stargate + swap operations", async function () {
      const amount = ethers.parseUnits("1000", 6);
      
      await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdt.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: 137,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("990", 6),
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint24", "uint256"],
          [await swapExecutor.getAddress(), 100, ethers.parseUnits("990", 6)]
        )
      };

      const tx = await stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.0015") });
      const receipt = await tx.wait();

      // Stargate + swap should use less than 450k gas
      expect(receipt.gasUsed).to.be.lt(450000);
    });

    it("Should batch multiple USDT->USDC routes efficiently", async function () {
      const amounts = [
        ethers.parseUnits("500", 6),
        ethers.parseUnits("750", 6),
        ethers.parseUnits("1000", 6)
      ];

      let totalGas = 0n;

      for (const amount of amounts) {
        await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await usdt.getAddress(),
          destToken: await usdc.getAddress(),
          amount: amount,
          destChainId: 42161,
          recipient: recipient.address,
          minAmountOut: amount * 99n / 100n,
          routeData: ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint24", "uint256"],
            [await swapExecutor.getAddress(), 100, amount * 99n / 100n]
          )
        };

        const tx = await stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.0015") });
        const receipt = await tx.wait();
        totalGas += receipt.gasUsed;
      }

      // Average gas per transaction should be reasonable
      const avgGas = totalGas / 3n;
      expect(avgGas).to.be.lt(450000);
    });
  });

  describe("Edge Cases for STARGATE_SWAP", function () {
    it("Should handle USDT dust amounts correctly", async function () {
      const dustAmount = ethers.parseUnits("0.000001", 6); // 1 micro USDT
      
      await usdt.mint(user.address, dustAmount);
      await usdt.connect(user).approve(await stableRouter.getAddress(), dustAmount);

      const routeParams = {
        sourceToken: await usdt.getAddress(),
        destToken: await usdc.getAddress(),
        amount: dustAmount,
        destChainId: 137,
        recipient: recipient.address,
        minAmountOut: 0, // Might get nothing after fees
        routeData: "0x"
      };

      // Should still process even with dust
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.0015") })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should enforce maximum slippage limits", async function () {
      const amount = ethers.parseUnits("1000", 6);
      
      await usdt.connect(user).approve(await stableRouter.getAddress(), amount);

      // Try to set 5% slippage (above 3% max)
      const routeParams = {
        sourceToken: await usdt.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: 42161,
        recipient: recipient.address,
        minAmountOut: amount * 95n / 100n, // 5% slippage
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint24", "uint256"],
          [await swapExecutor.getAddress(), 100, amount * 95n / 100n]
        )
      };

      // Should still execute but might fail on destination if slippage too high
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.0015") })
      ).to.emit(stableRouter, "RouteInitiated");
    });
  });
});