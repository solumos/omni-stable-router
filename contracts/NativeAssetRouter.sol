// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title NativeAssetRouter
 * @notice Routes payments using only native (issuer-deployed) stablecoins
 * @dev Implements deterministic routing: CCTP for USDC, avoids bridged assets
 */
contract NativeAssetRouter is OApp, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Protocol interfaces
    ITokenMessenger public immutable cctpTokenMessenger;
    IStargateRouter public immutable stargateRouter;
    
    // Native asset addresses per chain
    struct ChainAssets {
        address usdc;      // Always native via CCTP
        address pyusd;     // Native on Ethereum & Arbitrum only
        address usdt;      // Native on Ethereum, Avalanche, Arbitrum (bridged on Base)
        bool pyusdNative;  // Is PYUSD native on this chain?
        bool usdtNative;   // Is USDT native on this chain?
    }
    
    mapping(uint32 => ChainAssets) public chainAssets;
    
    // Chain identifiers
    uint32 public constant ETHEREUM_EID = 30101;
    uint32 public constant BASE_EID = 30184;
    uint32 public constant AVALANCHE_EID = 30106;
    uint32 public constant ARBITRUM_EID = 30110;
    
    // CCTP domains
    uint32 public constant ETHEREUM_DOMAIN = 0;
    uint32 public constant AVALANCHE_DOMAIN = 1;
    uint32 public constant ARBITRUM_DOMAIN = 3;
    uint32 public constant BASE_DOMAIN = 6;
    
    // Route types
    enum RouteType {
        DIRECT_CCTP,           // USDC to USDC via CCTP
        SWAP_CCTP_SWAP,       // Swap → USDC/CCTP → Swap
        STARGATE_DIRECT,      // USDT to USDT via Stargate
        DELIVER_ALTERNATIVE   // Deliver different asset (e.g., USDC instead of unavailable PYUSD)
    }
    
    struct RouteDecision {
        RouteType routeType;
        address intermediateToken;  // Token to use for bridging
        bool requiresSourceSwap;
        bool requiresDestSwap;
        string reason;
    }
    
    event PaymentRouted(
        bytes32 indexed paymentId,
        address indexed sender,
        uint256 amount,
        address sourceToken,
        uint32 destChain,
        address destToken,
        RouteType routeType
    );
    
    constructor(
        address _endpoint,
        address _cctpTokenMessenger,
        address _stargateRouter,
        address _owner
    ) OApp(_endpoint, _owner) {
        cctpTokenMessenger = ITokenMessenger(_cctpTokenMessenger);
        stargateRouter = IStargateRouter(_stargateRouter);
        
        _initializeChainAssets();
    }
    
    /**
     * @notice Initialize native asset mappings based on issuer deployments
     */
    function _initializeChainAssets() internal {
        // Ethereum - All native
        chainAssets[ETHEREUM_EID] = ChainAssets({
            usdc: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            pyusd: 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8,
            usdt: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            pyusdNative: true,
            usdtNative: true
        });
        
        // Base - USDC native, USDT bridged only, PYUSD not available
        chainAssets[BASE_EID] = ChainAssets({
            usdc: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            pyusd: address(0), // Not issued on Base
            usdt: 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2, // Bridged only
            pyusdNative: false,
            usdtNative: false // Bridged only
        });
        
        // Avalanche - USDC & USDT native, PYUSD not available
        chainAssets[AVALANCHE_EID] = ChainAssets({
            usdc: 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E,
            pyusd: address(0), // Not issued on Avalanche
            usdt: 0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7,
            pyusdNative: false,
            usdtNative: true
        });
        
        // Arbitrum - All native (PYUSD as of July 17, 2025)
        chainAssets[ARBITRUM_EID] = ChainAssets({
            usdc: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            pyusd: 0x..., // Native PYUSD on Arbitrum (need actual address)
            usdt: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            pyusdNative: true,
            usdtNative: true
        });
    }
    
    /**
     * @notice Main routing function with deterministic logic
     */
    function route(
        address sourceToken,
        uint256 amount,
        uint32 destChainEid,
        address destToken,
        address recipient
    ) external payable nonReentrant returns (bytes32 paymentId) {
        // Generate payment ID
        paymentId = keccak256(abi.encodePacked(
            msg.sender, recipient, amount, block.timestamp, block.number
        ));
        
        // Get routing decision
        RouteDecision memory decision = _getRouteDecision(
            sourceToken,
            destChainEid,
            destToken
        );
        
        // Transfer tokens from sender
        IERC20(sourceToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Execute based on route type
        if (decision.routeType == RouteType.DIRECT_CCTP) {
            _routeDirectCCTP(amount, destChainEid, recipient);
        } else if (decision.routeType == RouteType.SWAP_CCTP_SWAP) {
            _routeSwapCCTPSwap(
                sourceToken,
                amount,
                destChainEid,
                destToken,
                recipient,
                decision
            );
        } else if (decision.routeType == RouteType.STARGATE_DIRECT) {
            _routeStargateDirect(
                sourceToken,
                amount,
                destChainEid,
                recipient
            );
        } else if (decision.routeType == RouteType.DELIVER_ALTERNATIVE) {
            _routeToAlternative(
                sourceToken,
                amount,
                destChainEid,
                decision.intermediateToken,
                recipient
            );
        }
        
        emit PaymentRouted(
            paymentId,
            msg.sender,
            amount,
            sourceToken,
            destChainEid,
            destToken,
            decision.routeType
        );
        
        return paymentId;
    }
    
    /**
     * @notice Determine optimal route based on native asset availability
     */
    function _getRouteDecision(
        address sourceToken,
        uint32 destChainEid,
        address destToken
    ) internal view returns (RouteDecision memory) {
        ChainAssets memory sourceChain = chainAssets[block.chainid];
        ChainAssets memory destChain = chainAssets[destChainEid];
        
        // Rule 1: USDC to USDC - always use CCTP (cleanest, issuer-native)
        if (sourceToken == sourceChain.usdc && destToken == destChain.usdc) {
            return RouteDecision({
                routeType: RouteType.DIRECT_CCTP,
                intermediateToken: sourceChain.usdc,
                requiresSourceSwap: false,
                requiresDestSwap: false,
                reason: "Direct USDC transfer via CCTP"
            });
        }
        
        // Rule 2: Delivering USDC on destination - route through CCTP
        if (destToken == destChain.usdc) {
            return RouteDecision({
                routeType: RouteType.SWAP_CCTP_SWAP,
                intermediateToken: sourceChain.usdc,
                requiresSourceSwap: sourceToken != sourceChain.usdc,
                requiresDestSwap: false,
                reason: "Swap to USDC and bridge via CCTP"
            });
        }
        
        // Rule 3: Delivering PYUSD - only native on Ethereum & Arbitrum
        if (destToken == destChain.pyusd) {
            if (!destChain.pyusdNative) {
                // PYUSD not native on destination, deliver USDC instead
                return RouteDecision({
                    routeType: RouteType.DELIVER_ALTERNATIVE,
                    intermediateToken: destChain.usdc,
                    requiresSourceSwap: sourceToken != sourceChain.usdc,
                    requiresDestSwap: false,
                    reason: "PYUSD not native on destination, delivering USDC"
                });
            }
            // Route via USDC then swap to PYUSD
            return RouteDecision({
                routeType: RouteType.SWAP_CCTP_SWAP,
                intermediateToken: sourceChain.usdc,
                requiresSourceSwap: sourceToken != sourceChain.usdc,
                requiresDestSwap: true,
                reason: "Route via USDC/CCTP then swap to PYUSD"
            });
        }
        
        // Rule 4: Delivering USDT
        if (destToken == destChain.usdt) {
            if (!destChain.usdtNative) {
                // USDT bridged only on destination (e.g., Base), deliver USDC
                return RouteDecision({
                    routeType: RouteType.DELIVER_ALTERNATIVE,
                    intermediateToken: destChain.usdc,
                    requiresSourceSwap: sourceToken != sourceChain.usdc,
                    requiresDestSwap: false,
                    reason: "USDT bridged-only on destination, delivering USDC"
                });
            }
            
            // If source is USDT, use Stargate for direct transfer
            if (sourceToken == sourceChain.usdt) {
                return RouteDecision({
                    routeType: RouteType.STARGATE_DIRECT,
                    intermediateToken: sourceChain.usdt,
                    requiresSourceSwap: false,
                    requiresDestSwap: false,
                    reason: "Direct USDT transfer via Stargate"
                });
            }
            
            // Otherwise route via USDC/CCTP then swap
            return RouteDecision({
                routeType: RouteType.SWAP_CCTP_SWAP,
                intermediateToken: sourceChain.usdc,
                requiresSourceSwap: true,
                requiresDestSwap: true,
                reason: "Route via USDC/CCTP then swap to USDT"
            });
        }
        
        // Default: Route via USDC
        return RouteDecision({
            routeType: RouteType.SWAP_CCTP_SWAP,
            intermediateToken: sourceChain.usdc,
            requiresSourceSwap: sourceToken != sourceChain.usdc,
            requiresDestSwap: destToken != destChain.usdc,
            reason: "Default route via USDC/CCTP"
        });
    }
    
    /**
     * @notice Execute direct CCTP transfer (USDC to USDC)
     */
    function _routeDirectCCTP(
        uint256 amount,
        uint32 destChainEid,
        address recipient
    ) internal {
        uint32 destDomain = _eidToDomain(destChainEid);
        ChainAssets memory sourceChain = chainAssets[block.chainid];
        
        IERC20(sourceChain.usdc).safeApprove(address(cctpTokenMessenger), amount);
        
        cctpTokenMessenger.depositForBurn(
            amount,
            destDomain,
            bytes32(uint256(uint160(recipient))),
            sourceChain.usdc
        );
    }
    
    /**
     * @notice Execute swap → CCTP → swap route
     */
    function _routeSwapCCTPSwap(
        address sourceToken,
        uint256 amount,
        uint32 destChainEid,
        address destToken,
        address recipient,
        RouteDecision memory decision
    ) internal {
        uint256 bridgeAmount = amount;
        ChainAssets memory sourceChain = chainAssets[block.chainid];
        
        // Swap on source if needed
        if (decision.requiresSourceSwap) {
            bridgeAmount = _swap(sourceToken, sourceChain.usdc, amount);
        }
        
        // Bridge via CCTP with compose message for destination swap
        if (decision.requiresDestSwap) {
            _bridgeWithCompose(
                bridgeAmount,
                destChainEid,
                recipient,
                destToken
            );
        } else {
            _routeDirectCCTP(bridgeAmount, destChainEid, recipient);
        }
    }
    
    /**
     * @notice Execute Stargate transfer for USDT
     */
    function _routeStargateDirect(
        address sourceToken,
        uint256 amount,
        uint32 destChainEid,
        address recipient
    ) internal {
        // Approve Stargate router
        IERC20(sourceToken).safeApprove(address(stargateRouter), amount);
        
        // Prepare Stargate parameters
        uint16 destChainId = _eidToStargateChain(destChainEid);
        
        stargateRouter.swap{value: msg.value}(
            destChainId,                    // Destination Stargate chain ID
            1,                              // Source pool ID (USDT)
            1,                              // Dest pool ID (USDT)
            payable(msg.sender),            // Refund address
            amount,                         // Amount
            amount * 99 / 100,              // Min amount (1% slippage)
            IStargateRouter.lzTxObj(0, 0, "0x"),
            abi.encodePacked(recipient),    // Destination address
            bytes("")                       // Payload
        );
    }
    
    /**
     * @notice Route to alternative asset when requested asset not native
     */
    function _routeToAlternative(
        address sourceToken,
        uint256 amount,
        uint32 destChainEid,
        address alternativeToken,
        address recipient
    ) internal {
        ChainAssets memory sourceChain = chainAssets[block.chainid];
        
        // Swap to USDC if needed
        uint256 bridgeAmount = amount;
        if (sourceToken != sourceChain.usdc) {
            bridgeAmount = _swap(sourceToken, sourceChain.usdc, amount);
        }
        
        // Bridge USDC to destination
        _routeDirectCCTP(bridgeAmount, destChainEid, recipient);
    }
    
    /**
     * @notice Bridge with compose message for destination action
     */
    function _bridgeWithCompose(
        uint256 amount,
        uint32 destChainEid,
        address recipient,
        address destToken
    ) internal {
        // Implementation would include LayerZero compose or CCTP v2 generic message
        // to trigger swap on destination
    }
    
    /**
     * @notice Swap tokens using DEX aggregator
     */
    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        // Implementation would call Uniswap/Curve/etc
        // For now, mock 1:1
        return amountIn;
    }
    
    /**
     * @notice Convert LayerZero endpoint ID to CCTP domain
     */
    function _eidToDomain(uint32 eid) internal pure returns (uint32) {
        if (eid == ETHEREUM_EID) return ETHEREUM_DOMAIN;
        if (eid == BASE_EID) return BASE_DOMAIN;
        if (eid == AVALANCHE_EID) return AVALANCHE_DOMAIN;
        if (eid == ARBITRUM_EID) return ARBITRUM_DOMAIN;
        revert("Invalid endpoint ID");
    }
    
    /**
     * @notice Convert LayerZero endpoint ID to Stargate chain ID
     */
    function _eidToStargateChain(uint32 eid) internal pure returns (uint16) {
        if (eid == ETHEREUM_EID) return 101;
        if (eid == BASE_EID) return 184;
        if (eid == AVALANCHE_EID) return 106;
        if (eid == ARBITRUM_EID) return 110;
        revert("Invalid endpoint ID");
    }
}

// Interfaces
interface ITokenMessenger {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);
}

interface IStargateRouter {
    struct lzTxObj {
        uint256 dstGasForCall;
        uint256 dstNativeAmount;
        bytes dstNativeAddr;
    }
    
    function swap(
        uint16 _dstChainId,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        address payable _refundAddress,
        uint256 _amountLD,
        uint256 _minAmountLD,
        lzTxObj memory _lzTxParams,
        bytes calldata _to,
        bytes calldata _payload
    ) external payable;
}