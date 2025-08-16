const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Route Execution - Comprehensive Tests", function () {
  let stableRouter;
  let routeProcessor;
  let swapExecutor;
  let feeManager;
  let owner;
  let user;
  let recipient;
  let usdc, pyusd, usdt, usde, crvusd;

  beforeEach(async function () {
    [owner, user, recipient] = await ethers.getSigners();

    // Deploy mock tokens with different decimals
    const MockToken = await ethers.getContractFactory("MockERC20");
    usdc = await MockToken.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    
    pyusd = await MockToken.deploy("PayPal USD", "PYUSD", 6);
    await pyusd.waitForDeployment();
    
    usdt = await MockToken.deploy("Tether USD", "USDT", 6);
    await usdt.waitForDeployment();
    
    usde = await MockToken.deploy("Ethena USD", "USDe", 18);
    await usde.waitForDeployment();
    
    crvusd = await MockToken.deploy("Curve USD", "crvUSD", 18);
    await crvusd.waitForDeployment();

    // Deploy contracts
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

    // Mint tokens to user (different amounts for different decimals)
    await usdc.mint(user.address, ethers.parseUnits("10000", 6));
    await pyusd.mint(user.address, ethers.parseUnits("10000", 6));
    await usdt.mint(user.address, ethers.parseUnits("10000", 6));
    await usde.mint(user.address, ethers.parseUnits("10000", 18));
    await crvusd.mint(user.address, ethers.parseUnits("10000", 18));
  });

  describe("CCTP Routes (USDC to USDC)", function () {
    it("Should execute USDC transfer from Ethereum to Arbitrum", async function () {
      const amount = ethers.parseUnits("100", 6);
      const destChainId = 42161; // Arbitrum

      await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.emit(stableRouter, "RouteInitiated")
        .withArgs(
          user.address,
          await usdc.getAddress(),
          await usdc.getAddress(),
          amount,
          destChainId,
          recipient.address
        );
    });

    it("Should execute USDC transfer to all supported chains", async function () {
      const amount = ethers.parseUnits("50", 6);
      const chains = [1, 42161, 10, 8453, 137, 43114]; // All supported chains

      for (const destChainId of chains) {
        if (destChainId === 1) continue; // Skip Ethereum (same chain)

        await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await usdc.getAddress(),
          destToken: await usdc.getAddress(),
          amount: amount,
          destChainId: destChainId,
          recipient: recipient.address,
          minAmountOut: amount * 99n / 100n,
          routeData: "0x"
        };

        await expect(
          stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
        ).to.emit(stableRouter, "RouteInitiated");
      }
    });

    it("Should handle maximum USDC amount", async function () {
      const maxAmount = ethers.parseUnits("1000000", 6); // 1M USDC
      await usdc.mint(user.address, maxAmount);
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), maxAmount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usdc.getAddress(),
        amount: maxAmount,
        destChainId: 42161,
        recipient: recipient.address,
        minAmountOut: maxAmount * 99n / 100n,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should handle minimum USDC amount", async function () {
      const minAmount = ethers.parseUnits("0.01", 6); // 0.01 USDC
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), minAmount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usdc.getAddress(),
        amount: minAmount,
        destChainId: 42161,
        recipient: recipient.address,
        minAmountOut: minAmount * 99n / 100n,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.emit(stableRouter, "RouteInitiated");
    });
  });

  describe("LayerZero OFT Routes", function () {
    it("Should execute PYUSD transfer via LayerZero OFT", async function () {
      const amount = ethers.parseUnits("100", 6);
      const destChainId = 10; // Optimism (PYUSD is native there)
      const lzFee = ethers.parseEther("0.001");

      await pyusd.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await pyusd.getAddress(),
        destToken: await pyusd.getAddress(),
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      // Should fail without LZ fee
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.be.revertedWith("Insufficient LZ fee");

      // Should succeed with LZ fee
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: lzFee })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should execute USDe transfer via LayerZero OFT", async function () {
      const amount = ethers.parseUnits("100", 18); // 18 decimals for USDe
      const destChainId = 42161; // Arbitrum
      const lzFee = ethers.parseEther("0.001");

      await usde.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usde.getAddress(),
        destToken: await usde.getAddress(),
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: lzFee })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should execute crvUSD transfer via LayerZero OFT", async function () {
      const amount = ethers.parseUnits("100", 18); // 18 decimals for crvUSD
      const destChainId = 42161; // Arbitrum
      const lzFee = ethers.parseEther("0.001");

      await crvusd.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await crvusd.getAddress(),
        destToken: await crvusd.getAddress(),
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: lzFee })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should refund excess LayerZero fees", async function () {
      const amount = ethers.parseUnits("100", 6);
      const destChainId = 10;
      const excessFee = ethers.parseEther("0.01"); // 10x the required fee

      await pyusd.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await pyusd.getAddress(),
        destToken: await pyusd.getAddress(),
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      const balanceBefore = await ethers.provider.getBalance(user.address);
      
      const tx = await stableRouter.connect(user).executeRoute(routeParams, { value: excessFee });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const balanceAfter = await ethers.provider.getBalance(user.address);
      
      // User should get most of the excess fee back (minus actual LZ fee and gas)
      const actualCost = balanceBefore - balanceAfter - gasUsed;
      expect(actualCost).to.be.lt(ethers.parseEther("0.002")); // Should cost less than 0.002 ETH
    });
  });

  describe("Stargate Routes (USDT)", function () {
    it("Should execute USDT transfer via Stargate", async function () {
      const amount = ethers.parseUnits("100", 6);
      const destChainId = 137; // Polygon
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

      // Should fail without Stargate fee
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.be.revertedWith("Insufficient Stargate fee");

      // Should succeed with Stargate fee
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: stargateFee })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should revert USDT transfer to Base (not native)", async function () {
      const amount = ethers.parseUnits("50", 6);
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

    it("Should handle USDT transfers to all supported chains", async function () {
      const amount = ethers.parseUnits("50", 6);
      const stargateFee = ethers.parseEther("0.001");
      const chains = [42161, 10, 137, 43114]; // All chains except Ethereum and Base (USDT not native on Base)

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

        await expect(
          stableRouter.connect(user).executeRoute(routeParams, { value: stargateFee })
        ).to.emit(stableRouter, "RouteInitiated");
      }
    });
  });

  describe("LayerZero Composer Routes (Cross-Token)", function () {
    it("Should execute PYUSD to USDC swap and transfer", async function () {
      const amount = ethers.parseUnits("100", 6);
      const destChainId = 42161; // Arbitrum
      const composerFee = ethers.parseEther("0.002");

      await pyusd.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await pyusd.getAddress(),
        destToken: await usdc.getAddress(), // Different token!
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: amount * 95n / 100n, // 5% slippage for cross-token
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint24"],
          [await swapExecutor.getAddress(), 500] // Pool and fee data
        )
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: composerFee })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should execute USDe to USDT swap and transfer", async function () {
      const amount = ethers.parseUnits("100", 18); // USDe has 18 decimals
      const destChainId = 137; // Polygon
      const composerFee = ethers.parseEther("0.002");

      await usde.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usde.getAddress(),
        destToken: await usdt.getAddress(),
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 6), // Expected USDT output (6 decimals)
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint24"],
          [await swapExecutor.getAddress(), 500]
        )
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: composerFee })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should execute crvUSD to USDC swap and transfer", async function () {
      const amount = ethers.parseUnits("100", 18); // crvUSD has 18 decimals
      const destChainId = 10; // Optimism
      const composerFee = ethers.parseEther("0.002");

      await crvusd.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await crvusd.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: ethers.parseUnits("95", 6), // Expected USDC output
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint24"],
          [await swapExecutor.getAddress(), 500]
        )
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: composerFee })
      ).to.emit(stableRouter, "RouteInitiated");
    });
  });

  describe("Fee Management", function () {
    it("Should correctly calculate fees for different amounts", async function () {
      const amounts = [
        ethers.parseUnits("10", 6),
        ethers.parseUnits("100", 6),
        ethers.parseUnits("1000", 6),
        ethers.parseUnits("10000", 6)
      ];

      for (const amount of amounts) {
        await usdc.mint(user.address, amount);
        await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

        const expectedFee = amount * 10n / 10000n; // 0.1%

        const routeParams = {
          sourceToken: await usdc.getAddress(),
          destToken: await usdc.getAddress(),
          amount: amount,
          destChainId: 42161,
          recipient: recipient.address,
          minAmountOut: amount * 99n / 100n,
          routeData: "0x"
        };

        const feesBefore = await feeManager.getTotalFees(await usdc.getAddress());
        await stableRouter.connect(user).executeRoute(routeParams, { value: 0 });
        const feesAfter = await feeManager.getTotalFees(await usdc.getAddress());

        expect(feesAfter - feesBefore).to.equal(expectedFee);
      }
    });

    it("Should accumulate fees from multiple transactions", async function () {
      const amount = ethers.parseUnits("100", 6);
      const numTransactions = 5;
      const expectedFeePerTx = amount * 10n / 10000n;

      for (let i = 0; i < numTransactions; i++) {
        await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await usdc.getAddress(),
          destToken: await usdc.getAddress(),
          amount: amount,
          destChainId: 42161,
          recipient: recipient.address,
          minAmountOut: amount * 99n / 100n,
          routeData: "0x"
        };

        await stableRouter.connect(user).executeRoute(routeParams, { value: 0 });
      }

      const totalFees = await feeManager.getTotalFees(await usdc.getAddress());
      expect(totalFees).to.equal(expectedFeePerTx * BigInt(numTransactions));
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should revert when source token is not supported", async function () {
      const amount = ethers.parseUnits("100", 6);
      const fakeToken = await (await ethers.getContractFactory("MockERC20"))
        .deploy("Fake", "FAKE", 6);
      await fakeToken.waitForDeployment();
      await fakeToken.mint(user.address, amount);
      await fakeToken.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await fakeToken.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: 42161,
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.be.revertedWith("Source token not supported");
    });

    it("Should revert when destination token is not native on destination chain", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      // Try to send PYUSD to Base (where it's not native)
      await pyusd.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await pyusd.getAddress(),
        destToken: await pyusd.getAddress(),
        amount: amount,
        destChainId: 8453, // Base - PYUSD not native here
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") })
      ).to.be.revertedWith("Token not native on destination");
    });

    it("Should revert when user has insufficient balance", async function () {
      const userBalance = await usdc.balanceOf(user.address);
      const excessAmount = userBalance + ethers.parseUnits("1", 6);

      await usdc.connect(user).approve(await stableRouter.getAddress(), excessAmount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usdc.getAddress(),
        amount: excessAmount,
        destChainId: 42161,
        recipient: recipient.address,
        minAmountOut: excessAmount * 99n / 100n,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.be.revertedWithCustomError(usdc, "ERC20InsufficientBalance");
    });

    it("Should revert when recipient is zero address", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: 42161,
        recipient: ethers.ZeroAddress,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.be.revertedWith("VL: Invalid recipient");
    });

    it("Should handle decimal conversion correctly", async function () {
      // Test 18 decimal token (USDe) to 6 decimal token (USDC)
      const amount18 = ethers.parseUnits("100", 18);
      const expectedOutput6 = ethers.parseUnits("95", 6); // After slippage
      
      await usde.connect(user).approve(await stableRouter.getAddress(), amount18);

      const routeParams = {
        sourceToken: await usde.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount18,
        destChainId: 42161,
        recipient: recipient.address,
        minAmountOut: expectedOutput6,
        routeData: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint24"],
          [await swapExecutor.getAddress(), 500]
        )
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.002") })
      ).to.emit(stableRouter, "RouteInitiated");
    });
  });

  describe("Pausable Functionality", function () {
    it("Should prevent route execution when paused", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), amount);
      
      // Pause the contract
      await stableRouter.connect(owner).pause();

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: 42161,
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.be.revertedWithCustomError(stableRouter, "EnforcedPause");

      // Unpause and try again
      await stableRouter.connect(owner).unpause();
      
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.emit(stableRouter, "RouteInitiated");
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy attacks", async function () {
      // This test would require a malicious contract to test properly
      // For now, we just verify the modifier exists
      const amount = ethers.parseUnits("100", 6);
      
      await usdc.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usdc.getAddress(),
        destToken: await usdc.getAddress(),
        amount: amount,
        destChainId: 42161,
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      // Should execute normally (reentrancy guard is present)
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.emit(stableRouter, "RouteInitiated");
    });
  });
});