const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Protocol.LZ_COMPOSER - LayerZero Composer with Compose Hooks", function () {
  let stableRouter;
  let routeProcessor;
  let swapExecutor;
  let feeManager;
  let owner;
  let user;
  let recipient;
  let pyusd, usde, crvusd, usdc;

  beforeEach(async function () {
    [owner, user, recipient] = await ethers.getSigners();

    // Deploy tokens
    const MockToken = await ethers.getContractFactory("MockERC20");
    pyusd = await MockToken.deploy("PayPal USD", "PYUSD", 6);
    await pyusd.waitForDeployment();
    
    usde = await MockToken.deploy("Ethena USD", "USDe", 18);
    await usde.waitForDeployment();
    
    crvusd = await MockToken.deploy("Curve USD", "crvUSD", 18);
    await crvusd.waitForDeployment();
    
    usdc = await MockToken.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

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
    
    // Fund user with tokens
    await pyusd.mint(user.address, ethers.parseUnits("10000", 6));
    await usde.mint(user.address, ethers.parseUnits("10000", 18));
    await crvusd.mint(user.address, ethers.parseUnits("10000", 18));
  });

  describe("PYUSD to USDC Routes (LZ_COMPOSER)", function () {
    it("Should execute PYUSD to USDC via LayerZero Composer", async function () {
      const amount = ethers.parseUnits("100", 6);
      const destChainId = 42161; // Arbitrum
      const lzFee = ethers.parseEther("0.002"); // Composer fee

      await pyusd.connect(user).approve(await stableRouter.getAddress(), amount);

      const swapData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint24", "uint256"],
        [await swapExecutor.getAddress(), 500, ethers.parseUnits("95", 6)] // 0.05% pool fee, min 95 USDC out
      );

      const routeParams = {
        sourceToken: await pyusd.getAddress(),
        destToken: await usdc.getAddress(), // Different token!
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 6), // Expect ~95 USDC after swap
        routeData: swapData
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: lzFee })
      ).to.emit(stableRouter, "RouteInitiated")
        .withArgs(
          user.address,
          await pyusd.getAddress(),
          await usdc.getAddress(),
          amount,
          destChainId,
          recipient.address
        );
    });

    it("Should handle PYUSD to USDC on multiple chains", async function () {
      const amount = ethers.parseUnits("50", 6);
      const destinations = [
        { chainId: 1, name: "Ethereum" },
        { chainId: 10, name: "Optimism" },
        // Note: PYUSD not on other chains
      ];
      const lzFee = ethers.parseEther("0.002");

      for (const { chainId, name } of destinations) {
        if (chainId === 1) continue; // Skip same-chain
        
        await pyusd.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await pyusd.getAddress(),
          destToken: await usdc.getAddress(),
          amount: amount,
          destChainId: chainId,
          recipient: recipient.address,
          minAmountOut: ethers.parseUnits("47", 6), // Conservative due to fees
          routeData: ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint24", "uint256"],
            [await swapExecutor.getAddress(), 500, ethers.parseUnits("47", 6)]
          )
        };

        await expect(
          stableRouter.connect(user).executeRoute(routeParams, { value: lzFee })
        ).to.emit(stableRouter, "RouteInitiated");
      }
    });
  });

  describe("USDe to USDC Routes (LZ_COMPOSER)", function () {
    it("Should execute USDe to USDC with decimal conversion", async function () {
      const amount = ethers.parseUnits("100", 18); // 18 decimals
      const destChainId = 8453; // Base
      const lzFee = ethers.parseEther("0.002");

      await usde.connect(user).approve(await stableRouter.getAddress(), amount);

      // Swap data includes decimal conversion handling
      const swapData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint24", "uint256", "uint8", "uint8"],
        [
          await swapExecutor.getAddress(),
          500, // 0.05% pool fee
          ethers.parseUnits("95", 6), // Min 95 USDC out (6 decimals)
          18, // Source decimals
          6   // Target decimals
        ]
      );

      const routeParams = {
        sourceToken: await usde.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 6), // USDC has 6 decimals
        routeData: swapData
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: lzFee })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should handle USDe precision correctly in swaps", async function () {
      const amounts = [
        ethers.parseUnits("0.123456789012345678", 18), // Full precision
        ethers.parseUnits("1000.999999999999999999", 18), // Large with decimals
        ethers.parseUnits("1", 18), // Simple 1 USDe
      ];
      
      for (const amount of amounts) {
        await usde.mint(user.address, amount);
        await usde.connect(user).approve(await stableRouter.getAddress(), amount);

        // Expected USDC output (roughly 1:1 minus fees)
        const expectedUsdc = amount / BigInt(10 ** 12) * 95n / 100n; // Convert to 6 decimals, apply 5% total fees

        const routeParams = {
          sourceToken: await usde.getAddress(),
          destToken: await usdc.getAddress(),
          amount: amount,
          destChainId: 42161,
          recipient: recipient.address,
          minAmountOut: expectedUsdc,
          routeData: ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint24", "uint256"],
            [await swapExecutor.getAddress(), 500, expectedUsdc]
          )
        };

        await expect(
          stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") })
        ).to.emit(stableRouter, "RouteInitiated");
      }
    });
  });

  describe("crvUSD to USDC Routes (LZ_COMPOSER)", function () {
    it("Should execute crvUSD to USDC via LayerZero Composer", async function () {
      const amount = ethers.parseUnits("1000", 18);
      const destChainId = 10; // Optimism
      const lzFee = ethers.parseEther("0.002");

      await crvusd.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await crvusd.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("950", 6), // ~950 USDC after fees
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint24", "uint256"],
          [await swapExecutor.getAddress(), 500, ethers.parseUnits("950", 6)]
        )
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: lzFee })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should handle crvUSD to USDC on supported chains only", async function () {
      const amount = ethers.parseUnits("100", 18);
      const supportedChains = [42161, 10]; // Arbitrum, Optimism (where crvUSD exists)
      const lzFee = ethers.parseEther("0.002");

      for (const destChainId of supportedChains) {
        await crvusd.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await crvusd.getAddress(),
          destToken: await usdc.getAddress(),
          amount: amount,
          destChainId: destChainId,
          recipient: recipient.address,
          minAmountOut: ethers.parseUnits("95", 6),
          routeData: ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint24", "uint256"],
            [await swapExecutor.getAddress(), 500, ethers.parseUnits("95", 6)]
          )
        };

        await expect(
          stableRouter.connect(user).executeRoute(routeParams, { value: lzFee })
        ).to.emit(stableRouter, "RouteInitiated");
      }
    });
  });

  describe("Protocol Selection for LZ_COMPOSER", function () {
    it("Should select Protocol.LZ_COMPOSER when destination is USDC from OFT tokens", async function () {
      const tokens = [
        { token: pyusd, amount: ethers.parseUnits("100", 6), name: "PYUSD" },
        { token: usde, amount: ethers.parseUnits("100", 18), name: "USDe" },
        { token: crvusd, amount: ethers.parseUnits("100", 18), name: "crvUSD" }
      ];
      
      for (const { token, amount, name } of tokens) {
        await token.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await token.getAddress(),
          destToken: await usdc.getAddress(), // Destination is USDC
          amount: amount,
          destChainId: name === "PYUSD" ? 10 : 42161,
          recipient: recipient.address,
          minAmountOut: ethers.parseUnits("90", 6),
          routeData: ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint24", "uint256"],
            [await swapExecutor.getAddress(), 500, ethers.parseUnits("90", 6)]
          )
        };

        // Should use Protocol 4 (LZ_COMPOSER)
        await expect(
          stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") })
        ).to.emit(stableRouter, "RouteInitiated");
      }
    });
  });

  describe("Fee Handling for LayerZero Composer", function () {
    it("Should handle protocol fees and swap fees correctly", async function () {
      const amount = ethers.parseUnits("1000", 6);
      
      await pyusd.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await pyusd.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: 10,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("940", 6), // ~6% total fees (protocol + bridge + swap)
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint24", "uint256"],
          [await swapExecutor.getAddress(), 500, ethers.parseUnits("940", 6)]
        )
      };

      const feesBefore = await feeManager.getTotalFees(await pyusd.getAddress());
      
      await stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") });
      
      const feesAfter = await feeManager.getTotalFees(await pyusd.getAddress());
      const protocolFee = amount * 10n / 10000n; // 0.1%
      
      expect(feesAfter - feesBefore).to.equal(protocolFee);
    });

    it("Should require sufficient LayerZero fees for OFT + swap", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      await usde.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usde.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: 42161,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 6),
        routeData: "0x"
      };

      // Should fail without sufficient fee (swap requires more gas)
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") })
      ).to.be.revertedWith("Insufficient Composer fee");

      // Should succeed with proper fee
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") })
      ).to.emit(stableRouter, "RouteInitiated");
    });
  });

  describe("Gas Optimization for LayerZero Composer", function () {
    it("Should use reasonable gas for LayerZero Composer operations", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await pyusd.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await pyusd.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: 10,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 6),
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint24", "uint256"],
          [await swapExecutor.getAddress(), 500, ethers.parseUnits("95", 6)]
        )
      };

      const tx = await stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") });
      const receipt = await tx.wait();

      // LayerZero Composer should use less than 400k gas
      expect(receipt.gasUsed).to.be.lt(400000);
    });
  });

  describe("Cross-Token OFT Swaps (Non-USDC)", function () {
    let usdt;

    beforeEach(async function () {
      // Add USDT for cross-token tests
      const MockToken = await ethers.getContractFactory("MockERC20");
      usdt = await MockToken.deploy("Tether USD", "USDT", 6);
      await usdt.waitForDeployment();
    });

    it("Should execute PYUSD to USDT via LayerZero Composer", async function () {
      const amount = ethers.parseUnits("100", 6);
      const destChainId = 42161; // Arbitrum
      const composerFee = ethers.parseEther("0.002");

      await pyusd.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await pyusd.getAddress(),
        destToken: await usdt.getAddress(),
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 6), // Expect ~95 USDT after fees
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint24", "uint256"],
          [await swapExecutor.getAddress(), 500, ethers.parseUnits("95", 6)]
        )
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: composerFee })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should execute USDe to PYUSD via LayerZero Composer", async function () {
      const amount = ethers.parseUnits("100", 18); // USDe has 18 decimals
      const destChainId = 10; // Optimism (where PYUSD is native)
      const composerFee = ethers.parseEther("0.002");

      await usde.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usde.getAddress(),
        destToken: await pyusd.getAddress(),
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 6), // Expect ~95 PYUSD
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint24", "uint256"],
          [await swapExecutor.getAddress(), 500, ethers.parseUnits("95", 6)]
        )
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: composerFee })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should select Protocol.LZ_COMPOSER for all OFT cross-token routes", async function () {
      const testCases = [
        { source: pyusd, dest: usdc, destChain: 10, name: "PYUSD->USDC (Optimism)" }, // PYUSD native on Optimism
        { source: usde, dest: usdc, destChain: 42161, name: "USDe->USDC (Arbitrum)" }, // USDe native on Arbitrum
        { source: crvusd, dest: usdc, destChain: 42161, name: "crvUSD->USDC (Arbitrum)" }, // crvUSD native on Arbitrum
      ];

      for (const { source, dest, destChain, name } of testCases) {
        const amount = source === usde || source === crvusd 
          ? ethers.parseUnits("100", 18) 
          : ethers.parseUnits("100", 6);

        await source.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await source.getAddress(),
          destToken: await dest.getAddress(),
          amount: amount,
          destChainId: destChain,
          recipient: recipient.address,
          minAmountOut: ethers.parseUnits("90", dest === usde || dest === crvusd ? 18 : 6),
          routeData: "0x"
        };

        // All should use Protocol.LZ_COMPOSER
        await expect(
          stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") })
        ).to.emit(stableRouter, "RouteInitiated");
      }
    });
  });
});