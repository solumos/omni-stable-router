// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface ISwapExecutor {
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        address pool;
        bytes swapData;
    }

    function executeSwap(SwapParams calldata params) external returns (uint256 amountOut);

    function executeBatchSwaps(SwapParams[] calldata swaps) external returns (uint256[] memory amountsOut);

    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address pool
    ) external view returns (uint256);
}