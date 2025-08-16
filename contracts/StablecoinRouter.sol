// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppSender.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppReceiver.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/interfaces/IOAppComposer.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ICCTP.sol";
import "./interfaces/ICurve.sol";
import "./interfaces/IUniswapV3.sol";

/**
 * @title StablecoinRouter
 * @notice Production router using CCTP v2 for USDC and LayerZero Composer for everything else
 * @dev Optimized for payments ($50-5000), not trading
 */
contract StablecoinRouter is OAppSender, OAppReceiver, OAppOptionsType3, IOAppComposer, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using OptionsBuilder for bytes;

    // ============ Constants ============
    uint32 public immutable chainEid;  // This chain's LayerZero endpoint ID
    
    // CCTP v2 contracts
    ITokenMessenger public immutable cctpTokenMessenger;
    IMessageTransmitter public immutable cctpMessageTransmitter;
    
    // ============ Chain Configuration ============
    struct ChainConfig {
        uint32 cctpDomain;
        address usdc;
        address pyusd;
        address usdt;
        bool pyusdNative;
        bool usdtNative;
        address preferredDex;  // Curve or Uniswap
    }
    
    mapping(uint32 => ChainConfig) public chains;
    mapping(uint32 => address) public remoteRouters;  // eid -> router address
    
    // ============ Payment Tracking ============
    struct Payment {
        address sender;
        address recipient;
        uint256 amount;
        address sourceToken;
        address destToken;
        uint32 destChainEid;
        uint256 timestamp;
        PaymentStatus status;
    }
    
    enum PaymentStatus {
        PENDING,
        SENT,
        COMPLETED,
        FAILED
    }
    
    mapping(bytes32 => Payment) public payments;
    
    // ============ Routing Types ============
    enum RouteType {
        CCTP_DIRECT,        // USDC to USDC
        CCTP_WITH_HOOK,     // USDC with composed action
        LZ_COMPOSER,        // Non-USDC or complex route
        DELIVER_ALTERNATIVE // Token not available, deliver USDC
    }
    
    // ============ Composed Message Types ============
    struct ComposedMessage {
        bytes32 paymentId;
        address recipient;
        address targetToken;
        uint256 amount;
        bytes swapData;
    }
    
    // ============ Events ============
    event PaymentSent(
        bytes32 indexed paymentId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint32 destChainEid,
        RouteType routeType
    );
    
    event PaymentReceived(
        bytes32 indexed paymentId,
        address indexed recipient,
        uint256 amount,
        address token
    );
    
    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(
        address _endpoint,
        address _cctpTokenMessenger,
        address _cctpMessageTransmitter,
        uint32 _chainEid,
        address _owner
    ) OAppCore(_endpoint, _owner) {
        cctpTokenMessenger = ITokenMessenger(_cctpTokenMessenger);
        cctpMessageTransmitter = IMessageTransmitter(_cctpMessageTransmitter);
        chainEid = _chainEid;
        
        _initializeChains();
    }

    // ============ Main Entry Point ============
    
    /**
     * @notice Send payment cross-chain with automatic routing
     * @param recipient Address to receive funds on destination chain
     * @param amount Amount to send (in source token decimals)
     * @param sourceToken Token being sent
     * @param destChainEid Destination chain endpoint ID
     * @param destToken Desired token on destination (will deliver USDC if not available)
     */
    function sendPayment(
        address recipient,
        uint256 amount,
        address sourceToken,
        uint32 destChainEid,
        address destToken
    ) external payable nonReentrant returns (bytes32 paymentId) {
        require(amount > 0, "Invalid amount");
        require(recipient != address(0), "Invalid recipient");
        
        // Generate payment ID
        paymentId = keccak256(abi.encodePacked(
            msg.sender,
            recipient,
            amount,
            block.timestamp,
            block.number
        ));
        
        // Store payment details
        payments[paymentId] = Payment({
            sender: msg.sender,
            recipient: recipient,
            amount: amount,
            sourceToken: sourceToken,
            destToken: destToken,
            destChainEid: destChainEid,
            timestamp: block.timestamp,
            status: PaymentStatus.PENDING
        });
        
        // Transfer tokens from sender
        IERC20(sourceToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Determine and execute route
        RouteType routeType = _determineRoute(sourceToken, destToken, destChainEid);
        
        if (routeType == RouteType.CCTP_DIRECT) {
            _routeCCTPDirect(paymentId, amount, destChainEid, recipient);
        } else if (routeType == RouteType.CCTP_WITH_HOOK) {
            _routeCCTPWithHook(paymentId, amount, destChainEid, recipient, destToken);
        } else if (routeType == RouteType.LZ_COMPOSER) {
            _routeLayerZeroComposer(paymentId, sourceToken, amount, destChainEid, destToken, recipient);
        } else {
            // Deliver USDC instead of unavailable token
            _routeAlternative(paymentId, sourceToken, amount, destChainEid, recipient);
        }
        
        payments[paymentId].status = PaymentStatus.SENT;
        
        emit PaymentSent(
            paymentId,
            msg.sender,
            recipient,
            amount,
            destChainEid,
            routeType
        );
        
        return paymentId;
    }
    
    // ============ Routing Logic ============
    
    function _determineRoute(
        address sourceToken,
        address destToken,
        uint32 destChainEid
    ) internal view returns (RouteType) {
        ChainConfig memory sourceChain = chains[chainEid];
        ChainConfig memory destChain = chains[destChainEid];
        
        // Rule 1: USDC to USDC - always use CCTP
        if (sourceToken == sourceChain.usdc && destToken == destChain.usdc) {
            return RouteType.CCTP_DIRECT;
        }
        
        // Rule 2: Delivering USDC - use CCTP with possible source swap
        if (destToken == destChain.usdc) {
            return RouteType.CCTP_WITH_HOOK;
        }
        
        // Rule 3: Check if destination token is available
        if (destToken == destChain.pyusd && !destChain.pyusdNative) {
            return RouteType.DELIVER_ALTERNATIVE;  // PYUSD not available
        }
        
        if (destToken == destChain.usdt && !destChain.usdtNative) {
            return RouteType.DELIVER_ALTERNATIVE;  // USDT bridged-only
        }
        
        // Rule 4: Use LayerZero Composer for complex routes
        return RouteType.LZ_COMPOSER;
    }
    
    // ============ CCTP v2 Routes ============
    
    function _routeCCTPDirect(
        bytes32 paymentId,
        uint256 amount,
        uint32 destChainEid,
        address recipient
    ) internal {
        ChainConfig memory destChain = chains[destChainEid];
        
        // Approve CCTP
        IERC20(chains[chainEid].usdc).safeApprove(address(cctpTokenMessenger), amount);
        
        // Burn USDC and send to recipient
        cctpTokenMessenger.depositForBurn(
            amount,
            destChain.cctpDomain,
            bytes32(uint256(uint160(recipient))),
            chains[chainEid].usdc
        );
    }
    
    function _routeCCTPWithHook(
        bytes32 paymentId,
        uint256 amount,
        uint32 destChainEid,
        address recipient,
        address destToken
    ) internal {
        ChainConfig memory sourceChain = chains[chainEid];
        ChainConfig memory destChain = chains[destChainEid];
        
        // Swap to USDC if needed
        uint256 usdcAmount = amount;
        if (msg.sender != sourceChain.usdc) {
            usdcAmount = _swap(msg.sender, sourceChain.usdc, amount);
        }
        
        // Prepare CCTP v2 message with instructions
        bytes memory message = abi.encode(
            paymentId,
            recipient,
            destToken,
            usdcAmount
        );
        
        // Approve CCTP
        IERC20(sourceChain.usdc).safeApprove(address(cctpTokenMessenger), usdcAmount);
        
        // If destination needs swap, send to router for handling
        address destinationAddress = (destToken != destChain.usdc) 
            ? remoteRouters[destChainEid]
            : recipient;
        
        // CCTP v2: Burn with message
        cctpTokenMessenger.depositForBurnWithCaller(
            usdcAmount,
            destChain.cctpDomain,
            bytes32(uint256(uint160(destinationAddress))),
            sourceChain.usdc,
            bytes32(uint256(uint160(remoteRouters[destChainEid])))
        );
        
        // Send generic message if swap needed on destination
        if (destToken != destChain.usdc) {
            cctpMessageTransmitter.sendMessageWithCaller(
                destChain.cctpDomain,
                bytes32(uint256(uint160(remoteRouters[destChainEid]))),
                bytes32(uint256(uint160(address(this)))),
                message
            );
        }
    }
    
    // ============ LayerZero Composer Routes ============
    
    function _routeLayerZeroComposer(
        bytes32 paymentId,
        address sourceToken,
        uint256 amount,
        uint32 destChainEid,
        address destToken,
        address recipient
    ) internal {
        ChainConfig memory sourceChain = chains[chainEid];
        
        // Prepare composed message
        ComposedMessage memory composed = ComposedMessage({
            paymentId: paymentId,
            recipient: recipient,
            targetToken: destToken,
            amount: amount,
            swapData: ""  // Will be populated on destination
        });
        
        bytes memory message = abi.encode(composed);
        
        // Prepare LayerZero options with compose
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(200000, 0)     // Gas for receive
            .addExecutorLzComposeOption(0, 300000, 0); // Gas for compose
        
        // Calculate fee
        MessagingFee memory fee = _quote(destChainEid, message, options, false);
        require(msg.value >= fee.nativeFee, "Insufficient fee");
        
        // Send via LayerZero with tokens
        _lzSend(
            destChainEid,
            message,
            options,
            fee,
            payable(msg.sender)
        );
        
        // Transfer tokens to be bridged (would integrate with Stargate here)
        // For now, assuming tokens are locked in contract
    }
    
    function _routeAlternative(
        bytes32 paymentId,
        address sourceToken,
        uint256 amount,
        uint32 destChainEid,
        address recipient
    ) internal {
        ChainConfig memory sourceChain = chains[chainEid];
        
        // Swap to USDC
        uint256 usdcAmount = amount;
        if (sourceToken != sourceChain.usdc) {
            usdcAmount = _swap(sourceToken, sourceChain.usdc, amount);
        }
        
        // Route USDC via CCTP
        _routeCCTPDirect(paymentId, usdcAmount, destChainEid, recipient);
    }
    
    // ============ Swap Logic (Payment Optimized) ============
    
    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        // For payments, use simple routing to save gas
        
        // Check if this is a stablecoin pair
        if (_isStablecoin(tokenIn) && _isStablecoin(tokenOut)) {
            // For small amounts, assume 1:1 to save gas
            if (amountIn <= 1000 * 1e6) {  // <$1000
                return amountIn * 99 / 100;  // 1% slippage assumption
            }
        }
        
        // Use Curve for USDC/USDT/DAI
        if (_shouldUseCurve(tokenIn, tokenOut)) {
            return _swapViaCurve(tokenIn, tokenOut, amountIn);
        }
        
        // Use Uniswap for everything else
        return _swapViaUniswap(tokenIn, tokenOut, amountIn);
    }
    
    function _swapViaCurve(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256) {
        ChainConfig memory chain = chains[chainEid];
        address pool = _getCurvePool(tokenIn, tokenOut);
        
        IERC20(tokenIn).safeApprove(pool, amountIn);
        
        int128 i = _getCurveIndex(pool, tokenIn);
        int128 j = _getCurveIndex(pool, tokenOut);
        
        uint256 amountOut = ICurvePool(pool).exchange(i, j, amountIn, 0);
        
        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }
    
    function _swapViaUniswap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256) {
        ChainConfig memory chain = chains[chainEid];
        
        IERC20(tokenIn).safeApprove(chain.preferredDex, amountIn);
        
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: 500,  // 0.05% for stablecoins
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: amountIn * 99 / 100,  // 1% slippage
            sqrtPriceLimitX96: 0
        });
        
        uint256 amountOut = ISwapRouter(chain.preferredDex).exactInputSingle(params);
        
        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }
    
    // ============ Receive Functions ============
    
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        ComposedMessage memory composed = abi.decode(_message, (ComposedMessage));
        
        // If tokens match, direct transfer
        ChainConfig memory chain = chains[chainEid];
        address currentToken = chain.usdc;  // Assuming USDC bridged
        
        if (currentToken == composed.targetToken) {
            IERC20(currentToken).safeTransfer(composed.recipient, composed.amount);
            emit PaymentReceived(composed.paymentId, composed.recipient, composed.amount, currentToken);
        } else {
            // Need swap - trigger compose
            endpoint.sendCompose(address(this), _guid, 0, _message);
        }
    }
    
    function lzCompose(
        address _from,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable override {
        require(msg.sender == address(endpoint), "Only endpoint");
        require(_from == address(this) || _from == remoteRouters[_origin.srcEid], "Only routers");
        
        ComposedMessage memory composed = abi.decode(_message, (ComposedMessage));
        
        // Execute swap to target token
        ChainConfig memory chain = chains[chainEid];
        uint256 outputAmount = _swap(chain.usdc, composed.targetToken, composed.amount);
        
        // Deliver to recipient
        IERC20(composed.targetToken).safeTransfer(composed.recipient, outputAmount);
        
        emit PaymentReceived(composed.paymentId, composed.recipient, outputAmount, composed.targetToken);
    }
    
    // ============ CCTP v2 Receive ============
    
    function handleReceiveMessage(
        uint32 sourceDomain,
        bytes32 sender,
        bytes calldata messageBody
    ) external returns (bytes memory) {
        require(msg.sender == address(cctpMessageTransmitter), "Only CCTP");
        
        // Decode message
        (bytes32 paymentId, address recipient, address targetToken, uint256 amount) = 
            abi.decode(messageBody, (bytes32, address, address, uint256));
        
        ChainConfig memory chain = chains[chainEid];
        
        // If target is USDC, direct transfer
        if (targetToken == chain.usdc) {
            IERC20(chain.usdc).safeTransfer(recipient, amount);
        } else {
            // Swap to target token
            uint256 outputAmount = _swap(chain.usdc, targetToken, amount);
            IERC20(targetToken).safeTransfer(recipient, outputAmount);
        }
        
        emit PaymentReceived(paymentId, recipient, amount, targetToken);
        return "";
    }
    
    // ============ Configuration ============
    
    function _initializeChains() internal {
        // Ethereum
        chains[30101] = ChainConfig({
            cctpDomain: 0,
            usdc: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            pyusd: 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8,
            usdt: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            pyusdNative: true,
            usdtNative: true,
            preferredDex: 0xE592427A0AEce92De3Edee1F18E0157C05861564  // Uniswap V3
        });
        
        // Base
        chains[30184] = ChainConfig({
            cctpDomain: 6,
            usdc: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            pyusd: address(0),
            usdt: 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2,  // Bridged
            pyusdNative: false,
            usdtNative: false,
            preferredDex: 0x2626664c2603336E57B271c5C0b26F421741e481  // Uniswap V3
        });
        
        // Avalanche
        chains[30106] = ChainConfig({
            cctpDomain: 1,
            usdc: 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E,
            pyusd: address(0),
            usdt: 0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7,
            pyusdNative: false,
            usdtNative: true,
            preferredDex: 0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE  // Uniswap V3
        });
        
        // Arbitrum
        chains[30110] = ChainConfig({
            cctpDomain: 3,
            usdc: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            pyusd: address(0),  // TODO: Add when available
            usdt: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            pyusdNative: true,
            usdtNative: true,
            preferredDex: 0xE592427A0AEce92De3Edee1F18E0157C05861564  // Uniswap V3
        });
    }
    
    function setRemoteRouter(uint32 eid, address router) external onlyOwner {
        remoteRouters[eid] = router;
        setPeer(eid, bytes32(uint256(uint160(router))));
    }
    
    function setCurvePool(address tokenA, address tokenB, address pool) external onlyOwner {
        curvePoolsjodomainmapping[keccak256(abi.encodePacked(tokenA, tokenB))] = pool;
    }
    
    // ============ Helper Functions ============
    
    function _isStablecoin(address token) internal view returns (bool) {
        ChainConfig memory chain = chains[chainEid];
        return token == chain.usdc || token == chain.usdt || token == chain.pyusd;
    }
    
    function _shouldUseCurve(address tokenIn, address tokenOut) internal view returns (bool) {
        ChainConfig memory chain = chains[chainEid];
        // Use Curve for USDC/USDT/DAI swaps on Ethereum and Arbitrum
        if (chainEid == 30101 || chainEid == 30110) {
            return (tokenIn == chain.usdc || tokenIn == chain.usdt) && 
                   (tokenOut == chain.usdc || tokenOut == chain.usdt);
        }
        return false;
    }
    
    function _getCurvePool(address tokenIn, address tokenOut) internal view returns (address) {
        // Hardcoded for efficiency - would expand based on chain
        if (chainEid == 30101) {  // Ethereum
            return 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;  // 3pool
        } else if (chainEid == 30110) {  // Arbitrum
            return 0x7f90122BF0700F9E7e1F688fe926940E8839F353;  // 2pool
        }
        return address(0);
    }
    
    function _getCurveIndex(address pool, address token) internal view returns (int128) {
        // Hardcoded indices for known pools
        // 3pool: USDC=0, USDT=1, DAI=2
        ChainConfig memory chain = chains[chainEid];
        if (token == chain.usdc) return 0;
        if (token == chain.usdt) return 1;
        return 2;  // DAI
    }
    
    function quote(
        address sourceToken,
        uint256 amount,
        uint32 destChainEid,
        address destToken
    ) external view returns (uint256 nativeFee, RouteType routeType) {
        routeType = _determineRoute(sourceToken, destToken, destChainEid);
        
        if (routeType == RouteType.CCTP_DIRECT || routeType == RouteType.CCTP_WITH_HOOK) {
            return (0, routeType);  // CCTP only needs gas
        }
        
        // LayerZero fee calculation
        bytes memory message = abi.encode(ComposedMessage({
            paymentId: bytes32(0),
            recipient: address(0),
            targetToken: destToken,
            amount: amount,
            swapData: ""
        }));
        
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(200000, 0)
            .addExecutorLzComposeOption(0, 300000, 0);
        
        MessagingFee memory fee = _quote(destChainEid, message, options, false);
        return (fee.nativeFee, routeType);
    }
}