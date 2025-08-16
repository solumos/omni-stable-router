// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ICurvePool {
    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external returns (uint256);
    
    function get_dy(
        int128 i,
        int128 j,
        uint256 dx
    ) external view returns (uint256);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

contract SwapExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum DexType {
        Curve,
        UniswapV3,
        Balancer
    }

    struct PoolConfig {
        address pool;
        DexType dexType;
        bytes poolData; // Additional pool-specific data
    }

    mapping(bytes32 => PoolConfig) public poolConfigs;
    mapping(address => bool) public whitelistedPools;

    IUniswapV3Router public constant uniswapV3Router = IUniswapV3Router(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    
    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address pool
    );

    event PoolConfigured(
        address indexed tokenA,
        address indexed tokenB,
        address pool,
        DexType dexType
    );

    constructor() {}

    function executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address pool,
        bytes calldata swapData
    ) external nonReentrant returns (uint256 amountOut) {
        require(whitelistedPools[pool], "Pool not whitelisted");
        require(amountIn > 0, "Invalid amount");
        
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        bytes32 poolKey = keccak256(abi.encodePacked(tokenIn, tokenOut));
        PoolConfig memory config = poolConfigs[poolKey];
        
        if (config.dexType == DexType.Curve) {
            amountOut = _swapOnCurve(
                tokenIn,
                tokenOut,
                amountIn,
                minAmountOut,
                config.pool,
                swapData
            );
        } else if (config.dexType == DexType.UniswapV3) {
            amountOut = _swapOnUniswapV3(
                tokenIn,
                tokenOut,
                amountIn,
                minAmountOut,
                swapData
            );
        } else {
            revert("Unsupported DEX");
        }
        
        require(amountOut >= minAmountOut, "Insufficient output");
        
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut, pool);
        
        return amountOut;
    }

    function executeBatchSwaps(
        address[] calldata tokensIn,
        address[] calldata tokensOut,
        uint256[] calldata amountsIn,
        uint256[] calldata minAmountsOut,
        address[] calldata pools,
        bytes[] calldata swapData
    ) external nonReentrant returns (uint256[] memory amountsOut) {
        require(
            tokensIn.length == tokensOut.length &&
            tokensIn.length == amountsIn.length &&
            tokensIn.length == minAmountsOut.length &&
            tokensIn.length == pools.length &&
            tokensIn.length == swapData.length,
            "Array length mismatch"
        );
        
        amountsOut = new uint256[](tokensIn.length);
        
        for (uint256 i = 0; i < tokensIn.length; i++) {
            amountsOut[i] = this.executeSwap(
                tokensIn[i],
                tokensOut[i],
                amountsIn[i],
                minAmountsOut[i],
                pools[i],
                swapData[i]
            );
        }
        
        return amountsOut;
    }

    function _swapOnCurve(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address pool,
        bytes calldata swapData
    ) internal returns (uint256) {
        IERC20(tokenIn).safeApprove(pool, amountIn);
        
        (int128 i, int128 j) = abi.decode(swapData, (int128, int128));
        
        uint256 amountOut = ICurvePool(pool).exchange(
            i,
            j,
            amountIn,
            minAmountOut
        );
        
        return amountOut;
    }

    function _swapOnUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata swapData
    ) internal returns (uint256) {
        uint24 fee = abi.decode(swapData, (uint24));
        
        IERC20(tokenIn).safeApprove(address(uniswapV3Router), amountIn);
        
        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        });
        
        uint256 amountOut = uniswapV3Router.exactInputSingle(params);
        
        return amountOut;
    }

    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address pool
    ) external view returns (uint256) {
        bytes32 poolKey = keccak256(abi.encodePacked(tokenIn, tokenOut));
        PoolConfig memory config = poolConfigs[poolKey];
        
        if (config.dexType == DexType.Curve) {
            // Get Curve quote
            // This would need the correct i,j indices for the pool
            return ICurvePool(config.pool).get_dy(0, 1, amountIn);
        }
        
        // For other DEXs, would need to implement quoter
        return amountIn; // Simplified
    }

    function configurePool(
        address tokenA,
        address tokenB,
        address pool,
        DexType dexType,
        bytes calldata poolData
    ) external onlyOwner {
        bytes32 poolKey = keccak256(abi.encodePacked(tokenA, tokenB));
        
        poolConfigs[poolKey] = PoolConfig({
            pool: pool,
            dexType: dexType,
            poolData: poolData
        });
        
        whitelistedPools[pool] = true;
        
        emit PoolConfigured(tokenA, tokenB, pool, dexType);
    }

    function configurePools(
        address[] calldata tokenAs,
        address[] calldata tokenBs,
        address[] calldata pools,
        DexType[] calldata dexTypes,
        bytes[] calldata poolDatas
    ) external onlyOwner {
        require(
            tokenAs.length == tokenBs.length &&
            tokenAs.length == pools.length &&
            tokenAs.length == dexTypes.length &&
            tokenAs.length == poolDatas.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < tokenAs.length; i++) {
            configurePool(
                tokenAs[i],
                tokenBs[i],
                pools[i],
                dexTypes[i],
                poolDatas[i]
            );
        }
    }

    function removePool(address tokenA, address tokenB) external onlyOwner {
        bytes32 poolKey = keccak256(abi.encodePacked(tokenA, tokenB));
        address pool = poolConfigs[poolKey].pool;
        
        delete poolConfigs[poolKey];
        whitelistedPools[pool] = false;
    }

    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(owner(), balance);
        }
    }
}