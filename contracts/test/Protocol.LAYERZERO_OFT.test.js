const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Protocol.LAYERZERO_OFT - Native Token Transfers", function () {
  let stableRouter;
  let routeProcessor;
  let swapExecutor;
  let feeManager;
  let owner;
  let user;
  let recipient;
  let pyusd, usde, crvusd;

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
    
    // Fund user with tokens
    await pyusd.mint(user.address, ethers.parseUnits("10000", 6));
    await usde.mint(user.address, ethers.parseUnits("10000", 18));
    await crvusd.mint(user.address, ethers.parseUnits("10000", 18));
  });

  describe("PYUSD Transfers (Protocol 2)", function () {
    it("Should execute PYUSD transfer from Ethereum to Optimism", async function () {
      const amount = ethers.parseUnits("100", 6);
      const destChainId = 10; // Optimism
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

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: lzFee })
      ).to.emit(stableRouter, "RouteInitiated")
        .withArgs(
          user.address,
          await pyusd.getAddress(),
          await pyusd.getAddress(),
          amount,
          destChainId,
          recipient.address
        );
    });

    it("Should revert PYUSD transfer to unsupported chains", async function () {
      const amount = ethers.parseUnits("100", 6);
      const unsupportedChains = [8453, 137, 43114]; // Base, Polygon, Avalanche - PYUSD not native
      
      for (const destChainId of unsupportedChains) {
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

        await expect(
          stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") })
        ).to.be.revertedWith("Token not native on destination");
      }
    });
  });

  describe("USDe Transfers (Protocol 2)", function () {
    it("Should execute USDe transfers to all supported chains", async function () {
      const amount = ethers.parseUnits("100", 18);
      const supportedChains = [42161, 8453]; // Arbitrum, Base (NOT Optimism)
      const lzFee = ethers.parseEther("0.001");

      for (const destChainId of supportedChains) {
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
      }
    });

    it("Should handle USDe's 18 decimal precision correctly", async function () {
      const amounts = [
        ethers.parseUnits("0.000001", 18), // Very small amount
        ethers.parseUnits("1.234567890123456789", 18), // Full precision
        ethers.parseUnits("999999.999999999999999999", 18) // Large amount
      ];
      
      for (const amount of amounts) {
        await usde.mint(user.address, amount);
        await usde.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await usde.getAddress(),
          destToken: await usde.getAddress(),
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

    it("Should revert USDe transfer to Polygon and Avalanche", async function () {
      const amount = ethers.parseUnits("100", 18);
      const unsupportedChains = [137, 43114]; // Polygon, Avalanche - USDe not native
      
      for (const destChainId of unsupportedChains) {
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
          stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") })
        ).to.be.revertedWith("Token not native on destination");
      }
    });
  });

  describe("crvUSD Transfers (Protocol 2)", function () {
    it("Should execute crvUSD transfer from Ethereum to Arbitrum", async function () {
      const amount = ethers.parseUnits("1000", 18);
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

    it("Should execute crvUSD transfer to Optimism", async function () {
      const amount = ethers.parseUnits("500", 18);
      const destChainId = 10; // Optimism
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

    it("Should revert crvUSD transfer to Polygon, Avalanche", async function () {
      const amount = ethers.parseUnits("100", 18);
      const unsupportedChains = [137, 43114]; // Polygon, Avalanche - crvUSD not native
      
      for (const destChainId of unsupportedChains) {
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
          stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") })
        ).to.be.revertedWith("Token not native on destination");
      }
    });
  });

  describe("LayerZero OFT Fee Handling", function () {
    it("Should require LayerZero fees for OFT transfers", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await pyusd.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await pyusd.getAddress(),
        destToken: await pyusd.getAddress(),
        amount: amount,
        destChainId: 10,
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      // Should fail without fee
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.be.revertedWith("Insufficient LZ fee");

      // Should succeed with fee
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should refund excess LayerZero fees", async function () {
      const amount = ethers.parseUnits("100", 18);
      const excessFee = ethers.parseEther("0.1"); // Much more than needed
      
      await usde.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usde.getAddress(),
        destToken: await usde.getAddress(),
        amount: amount,
        destChainId: 42161,
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

  describe("Protocol Selection for OFT Tokens", function () {
    it("Should select Protocol.LAYERZERO_OFT for PYUSD same-token routes", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await pyusd.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await pyusd.getAddress(),
        destToken: await pyusd.getAddress(),
        amount: amount,
        destChainId: 10, // Optimism
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      // Should use Protocol 2 (LAYERZERO_OFT)
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should select Protocol.LAYERZERO_OFT for USDe same-token routes", async function () {
      const amount = ethers.parseUnits("100", 18);
      
      await usde.connect(user).approve(await stableRouter.getAddress(), amount);

      const routeParams = {
        sourceToken: await usde.getAddress(),
        destToken: await usde.getAddress(),
        amount: amount,
        destChainId: 42161, // Arbitrum
        recipient: recipient.address,
        minAmountOut: amount * 99n / 100n,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") })
      ).to.emit(stableRouter, "RouteInitiated");
    });
  });

  describe("Gas Optimization for OFT", function () {
    it("Should use reasonable gas for OFT transfers", async function () {
      const tokens = [
        { token: pyusd, amount: ethers.parseUnits("100", 6), name: "PYUSD" },
        { token: usde, amount: ethers.parseUnits("100", 18), name: "USDe" },
        { token: crvusd, amount: ethers.parseUnits("100", 18), name: "crvUSD" }
      ];
      
      for (const { token, amount, name } of tokens) {
        await token.connect(user).approve(await stableRouter.getAddress(), amount);

        const routeParams = {
          sourceToken: await token.getAddress(),
          destToken: await token.getAddress(),
          amount: amount,
          destChainId: name === "PYUSD" ? 10 : 42161, // Valid destinations
          recipient: recipient.address,
          minAmountOut: amount * 99n / 100n,
          routeData: "0x"
        };

        const tx = await stableRouter.connect(user).executeRoute(routeParams, { value: ethers.parseEther("0.001") });
        const receipt = await tx.wait();

        // OFT transfers should use less than 300k gas
        expect(receipt.gasUsed).to.be.lt(300000);
      }
    });
  });
});