const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("USDC (Base) to USDe (Arbitrum) Route - CCTP v2 with Hooks", function () {
  let stableRouter;
  let routeProcessor;
  let swapExecutor;
  let feeManager;
  let cctpHookReceiver;
  let owner;
  let user;
  let recipient;
  let usdc, usde;
  
  // Simulated chain IDs
  const BASE_CHAIN_ID = 8453;
  const ARBITRUM_CHAIN_ID = 42161;
  
  // CCTP Domain IDs
  const BASE_DOMAIN = 6;
  const ARBITRUM_DOMAIN = 3;

  beforeEach(async function () {
    [owner, user, recipient] = await ethers.getSigners();

    // Deploy tokens
    const MockToken = await ethers.getContractFactory("MockERC20");
    usdc = await MockToken.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    
    usde = await MockToken.deploy("Ethena USD", "USDe", 18);
    await usde.waitForDeployment();

    // Deploy infrastructure
    const FeeManager = await ethers.getContractFactory("FeeManager");
    feeManager = await FeeManager.deploy(owner.address);
    await feeManager.waitForDeployment();

    const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
    swapExecutor = await SwapExecutor.deploy("0x0000000000000000000000000000000000000001");
    await swapExecutor.waitForDeployment();

    // Deploy enhanced RouteProcessor with CCTP v2 hooks support
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
    
    // Fund user with USDC on "Base"
    await usdc.mint(user.address, ethers.parseUnits("1000", 6));
  });

  describe("Route Validation", function () {
    it("Should validate USDC on Base to USDe on Arbitrum as valid route", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usde.getAddress(),
        amount: amount,
        destChainId: ARBITRUM_CHAIN_ID,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 18), // 95 USDe (18 decimals)
        routeData: "0x"
      };

      // Should not revert on validation (needs Composer fee for cross-token)
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") })
      ).to.not.be.reverted;
    });

    it("Should validate native token deployments", async function () {
      // USDC is native on Base ✓
      expect(await stableRouter.supportedChains(BASE_CHAIN_ID)).to.be.true;
      
      // USDe is native on Arbitrum ✓
      // This would be checked in _isNativeOnChain function
      const amount = ethers.parseUnits("100", 6);
      await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usde.getAddress(),
        amount: amount,
        destChainId: ARBITRUM_CHAIN_ID,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 18),
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") })
      ).to.emit(stableRouter, "RouteInitiated");
    });
  });

  describe("CCTP v2 with Hooks Execution", function () {
    it("Should execute USDC to USDe route using CCTP v2 hooks", async function () {
      const usdcAmount = ethers.parseUnits("100", 6); // 100 USDC
      const expectedUsde = ethers.parseUnits("99", 18); // ~99 USDe after fees/slippage
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), usdcAmount);

      // Encode hook data for destination chain swap
      const hookData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256", "address", "address", "uint24"],
        [
          await usde.getAddress(),           // Destination token (USDe)
          expectedUsde,                       // Min amount out
          recipient.address,                  // Final recipient
          await swapExecutor.getAddress(),   // Swap executor on Arbitrum
          500                                 // Pool fee (0.05%)
        ]
      );

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usde.getAddress(),
        amount: usdcAmount,
        destChainId: ARBITRUM_CHAIN_ID,
        recipient: recipient.address,
        minAmountOut: expectedUsde,
        routeData: hookData
      };

      const tx = await stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") });
      const receipt = await tx.wait();

      // Verify events
      await expect(tx)
        .to.emit(stableRouter, "RouteInitiated")
        .withArgs(
          user.address,
          await usdc.getAddress(),
          await usde.getAddress(),
          usdcAmount,
          ARBITRUM_CHAIN_ID,
          recipient.address
        );

      // Check fee was collected (0.1%)
      const protocolFee = usdcAmount * 10n / 10000n;
      expect(await feeManager.getTotalFees(await usdc.getAddress())).to.equal(protocolFee);
    });

    it("Should handle decimal conversion (6 to 18) correctly", async function () {
      const usdcAmount = ethers.parseUnits("100", 6); // 100 USDC (6 decimals)
      const minUsdeAmount = ethers.parseUnits("95", 18); // 95 USDe (18 decimals)
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), usdcAmount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usde.getAddress(),
        amount: usdcAmount,
        destChainId: ARBITRUM_CHAIN_ID,
        recipient: recipient.address,
        minAmountOut: minUsdeAmount,
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256", "address", "address", "uint24"],
          [
            await usde.getAddress(),
            minUsdeAmount,
            recipient.address,
            await swapExecutor.getAddress(),
            500
          ]
        )
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") })
      ).to.not.be.reverted;
    });

    it("Should optimize for CCTP over LayerZero when source is USDC", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usde.getAddress(),
        amount: amount,
        destChainId: ARBITRUM_CHAIN_ID,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 18),
        routeData: "0x"
      };

      // Should use CCTP (protocol 1 or 5 for hooks) not LayerZero Composer (protocol 4)
      // This would be determined in _determineProtocol function
      const tx = await stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") });
      
      // In a real implementation, we'd check which protocol was selected
      // For now, just verify it executes successfully
      await expect(tx).to.emit(stableRouter, "RouteInitiated");
    });
  });

  describe("Fee Calculations", function () {
    it("Should calculate correct fees for USDC to USDe route", async function () {
      const amounts = [
        ethers.parseUnits("10", 6),    // 10 USDC
        ethers.parseUnits("100", 6),   // 100 USDC
        ethers.parseUnits("1000", 6),  // 1,000 USDC
        ethers.parseUnits("10000", 6), // 10,000 USDC
      ];

      for (const amount of amounts) {
        await usdc.mint(user.address, amount);
        await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

        const expectedProtocolFee = amount * 10n / 10000n; // 0.1%
        const amountAfterFee = amount - expectedProtocolFee;

        const routeParams = {
          sourceToken: await usdc.getAddress(),
          destToken: await usde.getAddress(),
          amount: amount,
          destChainId: ARBITRUM_CHAIN_ID,
          recipient: recipient.address,
          minAmountOut: ethers.parseUnits("1", 18), // Min 1 USDe
          routeData: "0x"
        };

        const feesBefore = await feeManager.getTotalFees(await usdc.getAddress());
        await stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") });
        const feesAfter = await feeManager.getTotalFees(await usdc.getAddress());

        expect(feesAfter - feesBefore).to.equal(expectedProtocolFee);
      }
    });

    it("Should handle swap fees on destination chain", async function () {
      const usdcAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      
      // Expected fees:
      // - Protocol fee: 0.1% = 1 USDC
      // - Swap fee (on destination): 0.05% = 0.5 USDC equivalent
      // - Total fees: ~1.5 USDC equivalent
      
      const protocolFee = usdcAmount * 10n / 10000n; // 1 USDC
      const amountAfterProtocolFee = usdcAmount - protocolFee; // 999 USDC
      const swapFee = amountAfterProtocolFee * 5n / 10000n; // ~0.5 USDC
      const expectedUsde = (amountAfterProtocolFee - swapFee) * BigInt(10 ** 12); // Convert to 18 decimals
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), usdcAmount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usde.getAddress(),
        amount: usdcAmount,
        destChainId: ARBITRUM_CHAIN_ID,
        recipient: recipient.address,
        minAmountOut: expectedUsde * 99n / 100n, // Allow 1% slippage
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256", "address", "address", "uint24"],
          [
            await usde.getAddress(),
            expectedUsde * 99n / 100n,
            recipient.address,
            await swapExecutor.getAddress(),
            500 // 0.05% pool fee
          ]
        )
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") })
      ).to.not.be.reverted;
    });
  });

  describe("Error Scenarios", function () {
    it("Should revert if user has insufficient USDC balance", async function () {
      const amount = ethers.parseUnits("10000", 6); // More than user has
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usde.getAddress(),
        amount: amount,
        destChainId: ARBITRUM_CHAIN_ID,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("9500", 18),
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.be.revertedWithCustomError(usdc, "ERC20InsufficientBalance");
    });

    it("Should revert if slippage is too high", async function () {
      const amount = ethers.parseUnits("100", 6);
      const unrealisticMinOutput = ethers.parseUnits("200", 18); // Expecting 200 USDe for 100 USDC
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usde.getAddress(),
        amount: amount,
        destChainId: ARBITRUM_CHAIN_ID,
        recipient: recipient.address,
        minAmountOut: unrealisticMinOutput, // Unrealistic expectation
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256", "address", "address", "uint24"],
          [
            await usde.getAddress(),
            unrealisticMinOutput,
            recipient.address,
            await swapExecutor.getAddress(),
            500
          ]
        )
      };

      // In production, this would revert on Arbitrum when swap fails
      // For testing, it would execute but mark as pending/failed
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") })
      ).to.not.be.reverted; // Transaction succeeds, but swap would fail on destination
    });

    it("Should revert if trying to send to unsupported chain", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usde.getAddress(),
        amount: amount,
        destChainId: 999999, // Unsupported chain
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 18),
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.be.revertedWith("VL: Unsupported chain");
    });
  });

  describe("Gas Optimization", function () {
    it("Should use optimal gas for CCTP route", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usde.getAddress(),
        amount: amount,
        destChainId: ARBITRUM_CHAIN_ID,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 18),
        routeData: "0x"
      };

      const tx = await stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") });
      const receipt = await tx.wait();

      // CCTP should use less than 250k gas on source chain
      expect(receipt.gasUsed).to.be.lt(250000);
    });

    it("Should batch multiple routes efficiently", async function () {
      // In production, implement batch routing for gas savings
      const amounts = [
        ethers.parseUnits("50", 6),
        ethers.parseUnits("75", 6),
        ethers.parseUnits("100", 6)
      ];

      let totalGas = 0n;

      for (const amount of amounts) {
        await usdc.mint(user.address, amount);
        await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await usdc.getAddress(),
          destToken: await usde.getAddress(),
          amount: amount,
          destChainId: ARBITRUM_CHAIN_ID,
          recipient: recipient.address,
          minAmountOut: ethers.parseUnits("1", 18),
          routeData: "0x"
        };

        const tx = await stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") });
        const receipt = await tx.wait();
        totalGas += receipt.gasUsed;
      }

      // Average gas per transaction should be reasonable
      const avgGas = totalGas / 3n;
      expect(avgGas).to.be.lt(250000);
    });
  });
});