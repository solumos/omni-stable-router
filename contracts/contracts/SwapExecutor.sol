// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./base/EmergencyWithdrawable.sol";
import "./libraries/SharedInterfaces.sol";
import "./libraries/ValidationLibrary.sol";

contract SwapExecutor is EmergencyWithdrawable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using ValidationLibrary for uint256;
    using ValidationLibrary for address;
    
    uint256 public constant MAX_BATCH_SIZE = 10; // Prevent DoS via gas exhaustion

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

    IUniswapV3Router public immutable uniswapV3Router;
    
    // Add configurable addresses instead of hardcoding
    constructor(address _uniswapV3Router) EmergencyWithdrawable() {
        ValidationLibrary.validateAddress(_uniswapV3Router);
        uniswapV3Router = IUniswapV3Router(_uniswapV3Router);
    }
    
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


    function executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address pool,
        bytes calldata swapData,
        uint256 deadline
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        // Add deadline protection
        ValidationLibrary.validateDeadline(deadline);
        require(whitelistedPools[pool], "Pool not whitelisted");
        ValidationLibrary.validateAmount(amountIn);
        
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
                swapData,
                deadline
            );
        } else {
            revert("Unsupported DEX");
        }
        
        ValidationLibrary.validateSlippage(amountOut, minAmountOut);
        
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
        bytes[] calldata swapData,
        uint256 deadline
    ) external nonReentrant whenNotPaused returns (uint256[] memory amountsOut) {
        // Add deadline protection for batch
        ValidationLibrary.validateDeadline(deadline);
        
        // Prevent DoS via unbounded loop
        ValidationLibrary.validateArrayBounds(tokensIn.length, MAX_BATCH_SIZE);
        
        // Validate all arrays have same length
        uint256[] memory lengths = new uint256[](6);
        lengths[0] = tokensIn.length;
        lengths[1] = tokensOut.length;
        lengths[2] = amountsIn.length;
        lengths[3] = minAmountsOut.length;
        lengths[4] = pools.length;
        lengths[5] = swapData.length;
        ValidationLibrary.validateMultipleArrayLengths(lengths);
        
        amountsOut = new uint256[](tokensIn.length);
        
        for (uint256 i = 0; i < tokensIn.length; i++) {
            // Fix reentrancy: use internal function instead of external call
            amountsOut[i] = _executeSwapInternal(
                tokensIn[i],
                tokensOut[i],
                amountsIn[i],
                minAmountsOut[i],
                pools[i],
                swapData[i],
                deadline
            );
        }
        
        return amountsOut;
    }

    /**
     * @notice Internal swap execution to prevent reentrancy in batch operations
     */
    function _executeSwapInternal(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address pool,
        bytes calldata swapData,
        uint256 deadline
    ) internal returns (uint256 amountOut) {
        require(whitelistedPools[pool], "Pool not whitelisted");
        ValidationLibrary.validateAmount(amountIn);
        
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        bytes32 poolKey = keccak256(abi.encodePacked(tokenIn, tokenOut));
        PoolConfig memory config = poolConfigs[poolKey];
        
        // Verify pool matches configuration
        require(config.pool == pool, "Pool mismatch");
        
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
                swapData,
                deadline
            );
        } else {
            revert("Unsupported DEX");
        }
        
        ValidationLibrary.validateSlippage(amountOut, minAmountOut);
        
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut, pool);
        
        return amountOut;
    }
    
    function _swapOnCurve(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address pool,
        bytes calldata swapData
    ) internal returns (uint256) {
        // Use safeIncreaseAllowance to avoid race conditions
        IERC20(tokenIn).safeIncreaseAllowance(pool, amountIn);
        
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
        bytes calldata swapData,
        uint256 deadline
    ) internal returns (uint256) {
        uint24 fee = abi.decode(swapData, (uint24));
        
        // Use safeIncreaseAllowance to avoid race conditions
        IERC20(tokenIn).safeIncreaseAllowance(address(uniswapV3Router), amountIn);
        
        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: address(this),
            deadline: deadline, // Use provided deadline instead of block.timestamp
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
            bytes32 poolKey = keccak256(abi.encodePacked(tokenAs[i], tokenBs[i]));
            
            poolConfigs[poolKey] = PoolConfig({
                pool: pools[i],
                dexType: dexTypes[i],
                poolData: poolDatas[i]
            });
            
            whitelistedPools[pools[i]] = true;
            
            emit PoolConfigured(tokenAs[i], tokenBs[i], pools[i], dexTypes[i]);
        }
    }

    function removePool(address tokenA, address tokenB) external onlyOwner {
        bytes32 poolKey = keccak256(abi.encodePacked(tokenA, tokenB));
        address pool = poolConfigs[poolKey].pool;
        
        delete poolConfigs[poolKey];
        whitelistedPools[pool] = false;
    }

    // Emergency withdrawal is now inherited from EmergencyWithdrawable
    
    // Add pause functionality
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}