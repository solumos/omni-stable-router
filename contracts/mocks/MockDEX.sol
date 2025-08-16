// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockDEX {
    event Swap(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed sender
    );
    
    // Mock exchange rates (1:1 with small fee)
    uint256 public constant FEE_BPS = 30; // 0.3%
    
    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external returns (uint256) {
        // Mock implementation - return amount minus fee
        uint256 amountOut = dx * (10000 - FEE_BPS) / 10000;
        require(amountOut >= min_dy, "Slippage");
        
        emit Swap(address(0), address(0), dx, amountOut, msg.sender);
        
        return amountOut;
    }
    
    function get_dy(
        int128 i,
        int128 j,
        uint256 dx
    ) external pure returns (uint256) {
        // Return expected output
        return dx * (10000 - FEE_BPS) / 10000;
    }
    
    // Uniswap V3 style swap
    function exactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        address recipient,
        uint256 deadline,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut) {
        require(deadline >= block.timestamp, "Expired");
        
        // Transfer tokens from sender
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Calculate output (mock 1:1 with fee)
        amountOut = amountIn * (10000 - FEE_BPS) / 10000;
        require(amountOut >= amountOutMinimum, "Slippage");
        
        // For testing, just mint the output token
        // In real implementation, this would swap from reserves
        
        emit Swap(tokenIn, tokenOut, amountIn, amountOut, msg.sender);
        
        return amountOut;
    }
}