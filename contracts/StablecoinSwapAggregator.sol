// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

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

contract StablecoinSwapAggregator is Ownable {
    using SafeERC20 for IERC20;
    
    enum DexType {
        UniswapV3,
        Curve,
        Direct
    }
    
    struct SwapRoute {
        DexType dexType;
        address router;
        bytes routeData; // Additional route-specific data
        uint256 slippageBps; // Basis points (10000 = 100%)
    }
    
    // Token pair to swap route mapping
    mapping(address => mapping(address => SwapRoute)) public swapRoutes;
    
    // Stablecoin addresses per chain
    mapping(string => address) public stablecoins;
    
    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        DexType dexType
    );
    
    event RouteConfigured(
        address indexed tokenIn,
        address indexed tokenOut,
        DexType dexType,
        address router
    );
    
    constructor(address _owner) Ownable(_owner) {}
    
    /**
     * @notice Execute optimal swap between stablecoins
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address recipient
    ) external returns (uint256 amountOut) {
        require(tokenIn != tokenOut, "Same token swap");
        
        SwapRoute memory route = swapRoutes[tokenIn][tokenOut];
        require(route.router != address(0), "No route configured");
        
        // Transfer tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Execute swap based on DEX type
        if (route.dexType == DexType.UniswapV3) {
            amountOut = _swapViaUniswapV3(
                tokenIn,
                tokenOut,
                amountIn,
                recipient,
                route
            );
        } else if (route.dexType == DexType.Curve) {
            amountOut = _swapViaCurve(
                tokenIn,
                tokenOut,
                amountIn,
                recipient,
                route
            );
        } else if (route.dexType == DexType.Direct) {
            // Direct 1:1 swap for equivalent stablecoins
            amountOut = _directSwap(
                tokenIn,
                tokenOut,
                amountIn,
                recipient
            );
        }
        
        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut, route.dexType);
        return amountOut;
    }
    
    /**
     * @notice Swap via Uniswap V3
     */
    function _swapViaUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address recipient,
        SwapRoute memory route
    ) internal returns (uint256) {
        // Decode fee tier from route data
        uint24 fee = abi.decode(route.routeData, (uint24));
        
        // Approve router
        IERC20(tokenIn).safeApprove(route.router, amountIn);
        
        // Calculate minimum output with slippage
        uint256 amountOutMinimum = amountIn * (10000 - route.slippageBps) / 10000;
        
        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });
        
        return IUniswapV3Router(route.router).exactInputSingle(params);
    }
    
    /**
     * @notice Swap via Curve
     */
    function _swapViaCurve(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address recipient,
        SwapRoute memory route
    ) internal returns (uint256) {
        // Decode pool indices from route data
        (int128 i, int128 j) = abi.decode(route.routeData, (int128, int128));
        
        // Approve pool
        IERC20(tokenIn).safeApprove(route.router, amountIn);
        
        // Calculate minimum output with slippage
        uint256 expectedOut = ICurvePool(route.router).get_dy(i, j, amountIn);
        uint256 minOut = expectedOut * (10000 - route.slippageBps) / 10000;
        
        // Execute swap
        uint256 amountOut = ICurvePool(route.router).exchange(i, j, amountIn, minOut);
        
        // Transfer to recipient if needed
        if (recipient != address(this)) {
            IERC20(tokenOut).safeTransfer(recipient, amountOut);
        }
        
        return amountOut;
    }
    
    /**
     * @notice Direct 1:1 swap for pegged stablecoins
     */
    function _directSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address recipient
    ) internal returns (uint256) {
        // For truly pegged stablecoins, allow 1:1 swap
        // This requires liquidity pools to be maintained
        
        // Check contract has enough tokenOut
        uint256 balance = IERC20(tokenOut).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient liquidity");
        
        // Transfer tokenOut to recipient
        IERC20(tokenOut).safeTransfer(recipient, amountIn);
        
        return amountIn;
    }
    
    /**
     * @notice Get swap quote
     */
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut, DexType dexType) {
        SwapRoute memory route = swapRoutes[tokenIn][tokenOut];
        require(route.router != address(0), "No route configured");
        
        if (route.dexType == DexType.Curve) {
            (int128 i, int128 j) = abi.decode(route.routeData, (int128, int128));
            amountOut = ICurvePool(route.router).get_dy(i, j, amountIn);
        } else if (route.dexType == DexType.Direct) {
            amountOut = amountIn; // 1:1 swap
        } else {
            // For Uniswap V3, would need to use quoter contract
            // Returning estimate for now
            amountOut = amountIn * 995 / 1000; // 0.5% fee estimate
        }
        
        return (amountOut, route.dexType);
    }
    
    /**
     * @notice Configure swap route
     */
    function configureRoute(
        address tokenIn,
        address tokenOut,
        DexType dexType,
        address router,
        bytes calldata routeData,
        uint256 slippageBps
    ) external onlyOwner {
        swapRoutes[tokenIn][tokenOut] = SwapRoute({
            dexType: dexType,
            router: router,
            routeData: routeData,
            slippageBps: slippageBps
        });
        
        emit RouteConfigured(tokenIn, tokenOut, dexType, router);
    }
    
    /**
     * @notice Set stablecoin address
     */
    function setStablecoin(string calldata symbol, address token) external onlyOwner {
        stablecoins[symbol] = token;
    }
    
    /**
     * @notice Emergency token recovery
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}