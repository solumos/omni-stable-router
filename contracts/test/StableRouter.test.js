const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("StableRouter", function () {
  let stableRouter;
  let routeProcessor;
  let swapExecutor;
  let feeManager;
  let owner;
  let user;
  let recipient;
  let usdc;
  let pyusd;

  beforeEach(async function () {
    [owner, user, recipient] = await ethers.getSigners();

    // Deploy mock tokens
    const MockToken = await ethers.getContractFactory("MockERC20");
    usdc = await MockToken.deploy("USD Coin", "USDC", 6);
    pyusd = await MockToken.deploy("PayPal USD", "PYUSD", 6);

    // Deploy FeeManager
    const FeeManager = await ethers.getContractFactory("FeeManager");
    feeManager = await FeeManager.deploy(owner.address);

    // Deploy SwapExecutor
    const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
    swapExecutor = await SwapExecutor.deploy();

    // Deploy mock RouteProcessor
    const MockRouteProcessor = await ethers.getContractFactory("MockRouteProcessor");
    routeProcessor = await MockRouteProcessor.deploy();

    // Deploy StableRouter
    const StableRouter = await ethers.getContractFactory("StableRouter");
    stableRouter = await upgrades.deployProxy(
      StableRouter,
      [
        routeProcessor.address,
        swapExecutor.address,
        feeManager.address
      ],
      { 
        initializer: "initialize",
        kind: "uups"
      }
    );

    // Authorize StableRouter in FeeManager
    await feeManager.authorizeCollector(stableRouter.address, true);

    // Mint tokens to user
    await usdc.mint(user.address, ethers.utils.parseUnits("10000", 6));
    await pyusd.mint(user.address, ethers.utils.parseUnits("10000", 6));
  });

  describe("Initialization", function () {
    it("Should set the correct owner", async function () {
      expect(await stableRouter.owner()).to.equal(owner.address);
    });

    it("Should set the correct protocol addresses", async function () {
      expect(await stableRouter.routeProcessor()).to.equal(routeProcessor.address);
      expect(await stableRouter.swapExecutor()).to.equal(swapExecutor.address);
      expect(await stableRouter.feeManager()).to.equal(feeManager.address);
    });

    it("Should initialize supported chains", async function () {
      expect(await stableRouter.supportedChains(1)).to.be.true; // Ethereum
      expect(await stableRouter.supportedChains(42161)).to.be.true; // Arbitrum
      expect(await stableRouter.supportedChains(10)).to.be.true; // Optimism
    });
  });

  describe("Route Execution", function () {
    it("Should execute USDC to USDC route via CCTP", async function () {
      const amount = ethers.utils.parseUnits("100", 6);
      const destChainId = 42161; // Arbitrum

      // Approve router
      await usdc.connect(user).approve(stableRouter.address, amount);

      // Create route params
      const routeParams = {
        sourceToken: usdc.address,
        destToken: usdc.address,
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: amount.mul(99).div(100), // 1% slippage
        routeData: "0x"
      };

      // Execute route
      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.emit(stableRouter, "RouteInitiated");
    });

    it("Should collect protocol fees", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);
      const destChainId = 42161;
      const expectedFee = amount.mul(10).div(10000); // 0.1%

      await usdc.connect(user).approve(stableRouter.address, amount);

      const routeParams = {
        sourceToken: usdc.address,
        destToken: usdc.address,
        amount: amount,
        destChainId: destChainId,
        recipient: recipient.address,
        minAmountOut: amount.mul(99).div(100),
        routeData: "0x"
      };

      await stableRouter.connect(user).executeRoute(routeParams, { value: 0 });

      // Check fee was collected
      const collectedFees = await feeManager.getTotalFees(usdc.address);
      expect(collectedFees).to.equal(expectedFee);
    });

    it("Should revert on unsupported chain", async function () {
      const amount = ethers.utils.parseUnits("100", 6);
      const unsupportedChainId = 999999;

      await usdc.connect(user).approve(stableRouter.address, amount);

      const routeParams = {
        sourceToken: usdc.address,
        destToken: usdc.address,
        amount: amount,
        destChainId: unsupportedChainId,
        recipient: recipient.address,
        minAmountOut: amount.mul(99).div(100),
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.be.revertedWith("Unsupported chain");
    });

    it("Should revert on zero amount", async function () {
      const routeParams = {
        sourceToken: usdc.address,
        destToken: usdc.address,
        amount: 0,
        destChainId: 42161,
        recipient: recipient.address,
        minAmountOut: 0,
        routeData: "0x"
      };

      await expect(
        stableRouter.connect(user).executeRoute(routeParams, { value: 0 })
      ).to.be.revertedWith("Invalid amount");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to pause", async function () {
      await stableRouter.connect(owner).pause();
      expect(await stableRouter.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await stableRouter.connect(owner).pause();
      await stableRouter.connect(owner).unpause();
      expect(await stableRouter.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        stableRouter.connect(user).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to update protocols", async function () {
      const newProcessor = ethers.constants.AddressZero;
      const newExecutor = ethers.constants.AddressZero;
      const newFeeManager = ethers.constants.AddressZero;

      await expect(
        stableRouter.connect(owner).updateProtocols(
          newProcessor,
          newExecutor,
          newFeeManager
        )
      ).to.emit(stableRouter, "ProtocolsUpdated");
    });
  });

  describe("Upgradability", function () {
    it("Should allow owner to upgrade", async function () {
      const StableRouterV2 = await ethers.getContractFactory("StableRouter");
      await upgrades.upgradeProxy(stableRouter.address, StableRouterV2);
    });

    it("Should not allow non-owner to upgrade", async function () {
      const StableRouterV2 = await ethers.getContractFactory("StableRouter");
      
      await expect(
        upgrades.upgradeProxy(stableRouter.address, StableRouterV2, {
          call: { fn: "_authorizeUpgrade", args: [stableRouter.address] }
        })
      ).to.be.reverted;
    });
  });
});

// Mock contracts for testing
const mockERC20 = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
`;

const mockRouteProcessor = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract MockRouteProcessor {
    function executeCCTP(address, uint256, uint256, address) external {}
    function executeLayerZeroOFT(address, uint256, uint256, address) external payable {}
    function executeStargate(address, uint256, uint256, address) external payable {}
    function executeComposer(address, address, uint256, uint256, address, uint256, bytes calldata) external payable {}
    function estimateLayerZeroFee(uint256, address, uint256) external pure returns (uint256) { return 0.001 ether; }
    function estimateStargateFee(uint256, address) external pure returns (uint256) { return 0.001 ether; }
    function estimateComposerFee(uint256, address, bytes calldata) external pure returns (uint256) { return 0.002 ether; }
}
`;