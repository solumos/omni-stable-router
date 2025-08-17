// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ISwapExecutor.sol";

/**
 * @title MockSwapExecutor
 * @notice Mock swap executor for testing on Tenderly forks
 * @dev Simulates swaps with a configurable exchange rate
 */
contract MockSwapExecutor is ISwapExecutor {
    using SafeERC20 for IERC20;
    
    // Events
    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed executor
    );
    
    // Mock exchange rates (scaled by 1e18)
    mapping(address => mapping(address => uint256)) public exchangeRates;
    
    // Default to 1:1 for stablecoins
    uint256 public constant DEFAULT_RATE = 1e18;
    
    constructor() {
        // Can set up default rates here if needed
    }
    
    /**
     * @notice Execute a swap with mock rates
     * @dev For testing, this just transfers at a fixed rate
     */
    function executeSwap(SwapParams calldata params) external override returns (uint256) {
        require(params.tokenIn != address(0), "Invalid tokenIn");
        require(params.tokenOut != address(0), "Invalid tokenOut");
        require(params.amountIn > 0, "Invalid amount");
        
        // Transfer tokens in
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        
        // Calculate output amount using mock rate
        uint256 rate = exchangeRates[params.tokenIn][params.tokenOut];
        if (rate == 0) {
            rate = DEFAULT_RATE; // Default 1:1 for stablecoins
        }
        
        // Get decimals for proper conversion
        uint8 decimalsIn = 6; // Most stablecoins
        uint8 decimalsOut = 6;
        
        // For simplicity, assume 6 decimals for USDC/USDT/PYUSD and 18 for DAI/USDe
        // In production, you'd query the actual decimals
        
        // Calculate output with decimal adjustment
        uint256 amountOut;
        if (decimalsIn == decimalsOut) {
            amountOut = (params.amountIn * rate) / 1e18;
        } else if (decimalsIn > decimalsOut) {
            uint256 factor = 10 ** (decimalsIn - decimalsOut);
            amountOut = (params.amountIn * rate) / (1e18 * factor);
        } else {
            uint256 factor = 10 ** (decimalsOut - decimalsIn);
            amountOut = (params.amountIn * rate * factor) / 1e18;
        }
        
        require(amountOut >= params.minAmountOut, "Slippage exceeded");
        
        // For testing on forks, we might need to deal or mint tokens
        // In a real fork, you'd need to have the output tokens or use deal()
        
        // Transfer tokens out
        IERC20(params.tokenOut).safeTransfer(msg.sender, amountOut);
        
        emit SwapExecuted(
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            msg.sender
        );
        
        return amountOut;
    }
    
    /**
     * @notice Set mock exchange rate
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param rate Exchange rate (scaled by 1e18)
     */
    function setExchangeRate(address tokenIn, address tokenOut, uint256 rate) external {
        exchangeRates[tokenIn][tokenOut] = rate;
    }
    
    /**
     * @notice Execute multiple swaps in batch
     * @dev For testing, executes swaps sequentially
     */
    function executeBatchSwaps(SwapParams[] calldata swaps) external override returns (uint256[] memory amountsOut) {
        amountsOut = new uint256[](swaps.length);
        for (uint256 i = 0; i < swaps.length; i++) {
            amountsOut[i] = this.executeSwap(swaps[i]);
        }
        return amountsOut;
    }
    
    /**
     * @notice Get expected output amount for a swap
     * @dev Returns mock calculation without actually swapping
     */
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address pool
    ) external view override returns (uint256) {
        uint256 rate = exchangeRates[tokenIn][tokenOut];
        if (rate == 0) {
            rate = DEFAULT_RATE;
        }
        
        // Simple calculation for preview
        return (amountIn * rate) / 1e18;
    }
    
    /**
     * @notice Emergency function to deal tokens for testing
     * @dev Only for Tenderly testing - simulates having liquidity
     */
    function dealTokens(address token, uint256 amount) external {
        // This would need to be implemented with Tenderly's cheat codes
        // or by having a faucet/whale account transfer tokens
    }
}