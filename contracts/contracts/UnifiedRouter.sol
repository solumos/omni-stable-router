// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// LayerZero Composer Interface
interface IOAppComposer {
    function lzCompose(
        address _oApp,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable;
}

// CCTP Interfaces
interface ITokenMessenger {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);
    
    function depositForBurnWithCaller(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller
    ) external returns (uint64 nonce);
}

// CCTP V2 Message Transmitter for hooks
interface IMessageTransmitter {
    function sendMessage(
        uint32 destinationDomain,
        bytes32 recipient,
        bytes calldata messageBody
    ) external returns (uint64);
}

// LayerZero Interfaces
interface ILayerZeroEndpoint {
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;
    
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParam
    ) external view returns (uint256 nativeFee, uint256 zroFee);
}

// Stargate Interfaces
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

/**
 * @title UnifiedRouter
 * @notice Simplified cross-chain router for stablecoin transfers
 * @dev Single entry point for all cross-chain transfers with dynamic routing
 */
contract UnifiedRouter is Ownable, Pausable, ReentrancyGuard, IOAppComposer {
    using SafeERC20 for IERC20;
    
    // Protocol types
    enum Protocol {
        NONE,
        CCTP,              // CCTP V1 - same token only
        CCTP_HOOKS,        // CCTP V2 with hooks - cross-token swaps
        LAYERZERO,
        STARGATE
    }
    
    // Route configuration
    struct Route {
        Protocol protocol;
        uint32 protocolDomain;  // CCTP domain or LZ/Stargate chain ID
        address bridgeContract; // Protocol's bridge/messenger address
        uint256 poolId;        // For Stargate pools
        address swapPool;      // Curve/DEX pool for destination swaps
        bytes extraData;       // Protocol-specific configuration
    }
    
    // Events
    event RouteConfigured(
        address indexed fromToken,
        uint256 indexed fromChainId,
        address toToken,
        uint256 indexed toChainId,
        Protocol protocol
    );
    
    event TransferInitiated(
        bytes32 indexed transferId,
        address indexed sender,
        address fromToken,
        address toToken,
        uint256 amount,
        uint256 toChainId,
        address recipient,
        Protocol protocol
    );
    
    event SameChainSwapExecuted(
        bytes32 indexed transferId,
        address indexed sender,
        address fromToken,
        address toToken,
        uint256 amountIn,
        uint256 amountOut,
        address indexed recipient
    );
    
    // State variables
    mapping(bytes32 => Route) public routes; // routeKey => Route
    mapping(Protocol => address) public protocolContracts; // Protocol => contract address
    mapping(uint256 => address) public cctpHookReceivers; // chainId => hook receiver address
    mapping(bytes32 => address) public sameChainSwapPools; // swapKey => DEX pool address
    
    uint256 private transferNonce;
    
    constructor(address _owner) Ownable(_owner) {}
    
    /**
     * @notice Main transfer function - send any token to any chain
     * @param fromToken Source token address
     * @param toToken Destination token address (can be different)
     * @param amount Amount to send (in fromToken decimals)
     * @param toChainId Destination chain ID
     * @param recipient Who receives the tokens
     * @return transferId Unique transfer identifier
     */
    function transfer(
        address fromToken,
        address toToken,
        uint256 amount,
        uint256 toChainId,
        address recipient
    ) external payable whenNotPaused returns (bytes32 transferId) {
        bytes memory emptyData;
        return transferWithSwap(fromToken, toToken, amount, toChainId, recipient, 0, emptyData);
    }

    /**
     * @notice Transfer with destination swap support
     * @param fromToken Source token address
     * @param toToken Destination token address (can be different)
     * @param amount Amount to send (in fromToken decimals)
     * @param toChainId Destination chain ID
     * @param recipient Who receives the tokens
     * @param minAmountOut Minimum amount to receive (0 for same-token transfers)
     * @param swapData Encoded swap data for DEX on destination chain
     * @return transferId Unique transfer identifier
     */
    function transferWithSwap(
        address fromToken,
        address toToken,
        uint256 amount,
        uint256 toChainId,
        address recipient,
        uint256 minAmountOut,
        bytes memory swapData
    ) public payable whenNotPaused returns (bytes32 transferId) {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");
        
        // Generate transfer ID
        transferId = keccak256(abi.encodePacked(msg.sender, transferNonce++, block.timestamp));
        
        // Check if this is a same-chain swap
        if (toChainId == block.chainid) {
            // Same-chain swap - no cross-chain transfer needed
            uint256 amountOut = _executeSameChainSwap(
                fromToken,
                toToken, 
                amount,
                minAmountOut,
                recipient,
                swapData
            );
            
            emit SameChainSwapExecuted(
                transferId,
                msg.sender,
                fromToken,
                toToken,
                amount,
                amountOut,
                recipient
            );
            
            return transferId;
        }
        
        // Cross-chain transfer - get route configuration
        bytes32 routeKey = getRouteKey(fromToken, block.chainid, toToken, toChainId);
        Route memory route = routes[routeKey];
        require(route.protocol != Protocol.NONE, "Route not configured");
        
        // Pull tokens from sender
        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Execute transfer based on protocol
        if (route.protocol == Protocol.CCTP) {
            // CCTP is for USDC transfers - the route configuration ensures compatibility
            // Note: fromToken and toToken will have different addresses on different chains
            _executeCCTP(fromToken, amount, recipient, route);
        } else if (route.protocol == Protocol.CCTP_HOOKS) {
            // CCTP V2 with hooks supports cross-token swaps
            _executeCCTPWithHooks(fromToken, amount, recipient, route, toToken, minAmountOut, toChainId);
        } else if (route.protocol == Protocol.LAYERZERO) {
            _executeLayerZero(fromToken, amount, recipient, route, toToken, minAmountOut);
        } else if (route.protocol == Protocol.STARGATE) {
            _executeStargate(fromToken, amount, recipient, route);
        } else {
            revert("Unsupported protocol");
        }
        
        emit TransferInitiated(
            transferId,
            msg.sender,
            fromToken,
            toToken,
            amount,
            toChainId,
            recipient,
            route.protocol
        );
    }
    
    /**
     * @notice Execute CCTP transfer (primarily for USDC)
     */
    function _executeCCTP(
        address token,
        uint256 amount,
        address recipient,
        Route memory route
    ) private {
        ITokenMessenger messenger = ITokenMessenger(route.bridgeContract);
        
        // Approve token to messenger
        IERC20(token).forceApprove(route.bridgeContract, amount);
        
        // Convert recipient to bytes32 - properly zero-padded
        bytes32 mintRecipient = bytes32(bytes20(recipient));
        
        // Execute burn and transfer
        messenger.depositForBurn(
            amount,
            route.protocolDomain,
            mintRecipient,
            token
        );
    }
    
    /**
     * @notice Execute CCTP V2 with hooks for cross-token swaps
     */
    function _executeCCTPWithHooks(
        address token,
        uint256 amount,
        address recipient,
        Route memory route,
        address toToken,
        uint256 minAmountOut,
        uint256 toChainId
    ) private {
        require(token != toToken, "Use regular CCTP for same token");
        require(route.swapPool != address(0), "Swap pool required");
        
        // Get hook receiver on destination chain
        address hookReceiver = cctpHookReceivers[toChainId];
        require(hookReceiver != address(0), "Hook receiver not configured");
        
        ITokenMessenger messenger = ITokenMessenger(route.bridgeContract);
        IMessageTransmitter transmitter = IMessageTransmitter(protocolContracts[Protocol.CCTP_HOOKS]);
        
        // Approve token to messenger
        IERC20(token).forceApprove(route.bridgeContract, amount);
        
        // Create hook data for destination swap
        bytes memory hookData = abi.encode(
            toToken,        // Token to swap to
            minAmountOut,   // Minimum amount out
            recipient,      // Final recipient
            route.swapPool  // DEX pool for swap
        );
        
        // Convert hook receiver to bytes32 - properly zero-padded
        bytes32 mintRecipient = bytes32(bytes20(hookReceiver));
        bytes32 destinationCaller = bytes32(bytes20(hookReceiver));
        
        // Execute burn with caller restriction
        messenger.depositForBurnWithCaller(
            amount,
            route.protocolDomain,
            mintRecipient,      // Hook receiver gets the USDC
            token,
            destinationCaller   // Only hook receiver can call
        );
        
        // Send hook data via message transmitter
        transmitter.sendMessage(
            route.protocolDomain,
            destinationCaller,
            hookData
        );
    }
    
    /**
     * @notice Execute LayerZero transfer (for OFT tokens)
     */
    function _executeLayerZero(
        address token,
        uint256 amount,
        address recipient,
        Route memory route,
        address toToken,
        uint256 minAmountOut
    ) private {
        ILayerZeroEndpoint endpoint = ILayerZeroEndpoint(route.bridgeContract);
        
        // Check if this is a cross-token swap
        bool isCrossTokenSwap = token != toToken && route.swapPool != address(0);
        
        bytes memory payload;
        bytes memory adapterParams;
        
        bytes memory composeMsg;
        bytes32 destinationAddress;
        
        if (isCrossTokenSwap) {
            // Cross-token swap: send to UnifiedRouter for compose execution
            destinationAddress = bytes32(uint256(uint160(address(this)))); // Send to this router
            
            // Create compose message with swap data
            composeMsg = abi.encode(
                toToken,            // target token to swap to
                minAmountOut,       // minimum amount out
                recipient,          // final recipient
                route.swapPool      // DEX pool address
            );
            
            // Version 2 with compose for cross-token swaps
            adapterParams = abi.encodePacked(
                uint16(2),          // version 2 (compose)
                uint256(200000),    // gas for lzReceive
                uint256(300000),    // gas for lzCompose (swap execution)
                uint256(0),         // no native value
                composeMsg          // compose message
            );
        } else {
            // Same token transfer: send directly to recipient
            destinationAddress = bytes32(uint256(uint160(recipient)));
            
            // Version 1 for simple transfers
            adapterParams = abi.encodePacked(
                uint16(1),          // version 1
                uint256(200000)     // gas for destination
            );
        }
        
        // Use OFT send instead of direct LayerZero endpoint
        // This is a simplified approach - in practice, we'd need to interact
        // with the specific OFT contract for PYUSD/USDe
        
        // For now, create a generic payload for the OFT
        payload = abi.encode(destinationAddress, amount, composeMsg);
        
        // Send via LayerZero
        endpoint.send{value: msg.value}(
            uint16(route.protocolDomain), // destination chain ID
            abi.encodePacked(destinationAddress), // destination address (router for compose, recipient for direct)
            payload,                      // transfer payload
            payable(msg.sender),          // refund address
            address(0),                   // no ZRO payment
            adapterParams                 // gas params including compose data
        );
    }
    
    /**
     * @notice Execute Stargate transfer (for USDT and other pools)
     */
    function _executeStargate(
        address token,
        uint256 amount,
        address recipient,
        Route memory route
    ) private {
        IStargateRouter router = IStargateRouter(route.bridgeContract);
        
        // Approve token to router
        IERC20(token).forceApprove(route.bridgeContract, amount);
        
        // Prepare LayerZero transaction object
        IStargateRouter.lzTxObj memory lzTxParams = IStargateRouter.lzTxObj({
            dstGasForCall: 0,
            dstNativeAmount: 0,
            dstNativeAddr: abi.encodePacked(recipient)
        });
        
        // Execute swap
        router.swap{value: msg.value}(
            uint16(route.protocolDomain), // destination chain ID
            route.poolId,                  // source pool ID
            route.poolId,                  // destination pool ID (same for same token)
            payable(msg.sender),          // refund address
            amount,                        // amount to transfer
            amount * 99 / 100,            // min amount (1% slippage)
            lzTxParams,                   // gas params
            abi.encodePacked(recipient),  // recipient
            bytes("")                     // no payload
        );
    }
    
    /**
     * @notice Configure a route for token transfers
     * @param fromToken Source token address
     * @param fromChainId Source chain ID
     * @param toToken Destination token address
     * @param toChainId Destination chain ID
     * @param route Route configuration
     */
    function configureRoute(
        address fromToken,
        uint256 fromChainId,
        address toToken,
        uint256 toChainId,
        Route calldata route
    ) external onlyOwner {
        require(route.protocol != Protocol.NONE, "Invalid protocol");
        require(route.bridgeContract != address(0), "Invalid bridge contract");
        
        bytes32 routeKey = getRouteKey(fromToken, fromChainId, toToken, toChainId);
        routes[routeKey] = route;
        
        emit RouteConfigured(fromToken, fromChainId, toToken, toChainId, route.protocol);
    }
    
    /**
     * @notice Set protocol contract addresses
     * @param protocol Protocol type
     * @param contractAddress Protocol contract address
     */
    function setProtocolContract(Protocol protocol, address contractAddress) external onlyOwner {
        require(protocol != Protocol.NONE, "Invalid protocol");
        require(contractAddress != address(0), "Invalid address");
        protocolContracts[protocol] = contractAddress;
    }
    
    /**
     * @notice Set CCTP hook receiver address for a chain
     * @param chainId Destination chain ID
     * @param hookReceiver Hook receiver contract address
     */
    function setCCTPHookReceiver(uint256 chainId, address hookReceiver) external onlyOwner {
        require(hookReceiver != address(0), "Invalid hook receiver");
        cctpHookReceivers[chainId] = hookReceiver;
    }
    
    /**
     * @notice Configure swap pool for same-chain token swaps
     * @param tokenA First token address
     * @param tokenB Second token address
     * @param swapPool DEX pool address for swapping between tokenA and tokenB
     */
    function setSameChainSwapPool(
        address tokenA,
        address tokenB,
        address swapPool
    ) external onlyOwner {
        require(tokenA != address(0) && tokenB != address(0), "Invalid tokens");
        require(swapPool != address(0), "Invalid swap pool");
        
        // Store both directions for easier lookup
        bytes32 swapKey = keccak256(abi.encodePacked(tokenA, tokenB, block.chainid));
        sameChainSwapPools[swapKey] = swapPool;
        
        // Also store reverse for convenience
        swapKey = keccak256(abi.encodePacked(tokenB, tokenA, block.chainid));
        sameChainSwapPools[swapKey] = swapPool;
    }
    
    /**
     * @notice Generate route key for mapping
     */
    function getRouteKey(
        address fromToken,
        uint256 fromChainId,
        address toToken,
        uint256 toChainId
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(fromToken, fromChainId, toToken, toChainId));
    }
    
    /**
     * @notice Check if a route is configured
     */
    function isRouteConfigured(
        address fromToken,
        uint256 fromChainId,
        address toToken,
        uint256 toChainId
    ) external view returns (bool) {
        bytes32 routeKey = getRouteKey(fromToken, fromChainId, toToken, toChainId);
        return routes[routeKey].protocol != Protocol.NONE;
    }
    
    /**
     * @notice Estimate fees for a transfer
     */
    function estimateFees(
        address fromToken,
        address toToken,
        uint256 amount,
        uint256 toChainId,
        address recipient
    ) external view returns (uint256 nativeFee) {
        bytes32 routeKey = getRouteKey(fromToken, block.chainid, toToken, toChainId);
        Route memory route = routes[routeKey];
        
        if (route.protocol == Protocol.CCTP) {
            return 0; // CCTP doesn't require native fees
        } else if (route.protocol == Protocol.LAYERZERO) {
            ILayerZeroEndpoint endpoint = ILayerZeroEndpoint(route.bridgeContract);
            bytes memory payload = abi.encode(recipient, amount);
            bytes memory adapterParams = abi.encodePacked(uint16(1), uint256(200000));
            (nativeFee, ) = endpoint.estimateFees(
                uint16(route.protocolDomain),
                address(this),
                payload,
                false,
                adapterParams
            );
        }
        // Add Stargate fee estimation if needed
        
        return nativeFee;
    }
    
    // Admin functions
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Emergency functions
    function rescueTokens(address token, uint256 amount, address to) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
    
    function rescueETH(uint256 amount, address payable to) external onlyOwner {
        to.transfer(amount);
    }
    
    /**
     * @notice Handle LayerZero composed messages for cross-token swaps
     * @param _oApp The originating OApp (OFT contract)
     * @param _guid Unique message identifier
     * @param _message Encoded compose message with swap data
     * @param _executor Executor address (unused)
     * @param _extraData Additional data (unused)
     */
    function lzCompose(
        address _oApp,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable override nonReentrant whenNotPaused {
        // Security: Verify the message comes from LayerZero endpoint
        require(protocolContracts[Protocol.LAYERZERO] != address(0), "LayerZero not configured");
        require(msg.sender == protocolContracts[Protocol.LAYERZERO], "Unauthorized composer call");
        
        // TODO: Add OApp authorization check
        // require(authorizedOApps[_oApp], "Unauthorized OApp");
        
        _handleLayerZeroCompose(_oApp, _guid, _message);
    }
    
    /**
     * @notice Internal handler for LayerZero compose messages
     */
    function _handleLayerZeroCompose(
        address _oApp,
        bytes32 _guid,
        bytes calldata _message
    ) internal {
        // Decode the compose message using LayerZero codec
        // For now, we'll use a simple encoding scheme
        // In production, use OFTComposeMsgCodec from LayerZero
        
        try this._decodeAndExecuteCompose(_message) {
            // Compose executed successfully
        } catch {
            // Handle compose failure - tokens are already credited to this contract
            // Could implement fallback logic here
        }
    }
    
    /**
     * @notice Decode compose message and execute swap
     * @dev External function to enable try-catch error handling
     */
    function _decodeAndExecuteCompose(bytes calldata _message) external {
        require(msg.sender == address(this), "Internal only");
        
        // Decode compose message
        // Expected format: abi.encode(toToken, minAmountOut, recipient, swapPool)
        (
            address toToken,
            uint256 minAmountOut,
            address recipient,
            address swapPool
        ) = abi.decode(_message, (address, uint256, address, address));
        
        // Get the source token balance (tokens already received from OFT)
        // For this example, we'll assume it's one of our supported tokens
        address fromToken = _detectReceivedToken();
        uint256 balance = IERC20(fromToken).balanceOf(address(this));
        
        require(balance > 0, "No tokens received");
        require(swapPool != address(0), "Swap pool required");
        
        if (fromToken == toToken) {
            // Same token - just transfer
            IERC20(fromToken).safeTransfer(recipient, balance);
        } else {
            // Execute swap via configured DEX
            _executeSwap(fromToken, toToken, balance, minAmountOut, recipient, swapPool);
        }
    }
    
    /**
     * @notice Detect which token was received by checking balances
     * @dev Simple implementation - in production, use LayerZero message context
     */
    function _detectReceivedToken() internal view returns (address) {
        // Check common tokens for non-zero balance
        // This is a simplified approach - LayerZero compose messages
        // include the token information in the message context
        
        // For now, return a placeholder - this would be determined
        // from the LayerZero compose message context
        return address(0); // TODO: Implement proper token detection
    }
    
    /**
     * @notice Execute same-chain swap without cross-chain transfer
     * @param fromToken Source token address
     * @param toToken Destination token address  
     * @param amount Amount to swap
     * @param minAmountOut Minimum amount to receive
     * @param recipient Who receives the tokens
     * @param swapData Optional swap data for complex routing
     */
    function _executeSameChainSwap(
        address fromToken,
        address toToken,
        uint256 amount,
        uint256 minAmountOut,
        address recipient,
        bytes memory swapData
    ) internal returns (uint256 amountOut) {
        // Pull tokens from sender
        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // If same token, just transfer to recipient
        if (fromToken == toToken) {
            IERC20(fromToken).safeTransfer(recipient, amount);
            return amount;
        }
        
        // Check if we have a configured swap pool for this pair
        bytes32 swapKey = keccak256(abi.encodePacked(fromToken, toToken, block.chainid));
        address swapPool = sameChainSwapPools[swapKey];
        
        if (swapPool == address(0)) {
            // Try reverse pair
            swapKey = keccak256(abi.encodePacked(toToken, fromToken, block.chainid));
            swapPool = sameChainSwapPools[swapKey];
        }
        
        require(swapPool != address(0), "No swap pool configured for this pair");
        
        // Execute the swap and get output amount
        uint256 balanceBefore = IERC20(toToken).balanceOf(recipient);
        _executeSwap(fromToken, toToken, amount, minAmountOut, recipient, swapPool);
        uint256 balanceAfter = IERC20(toToken).balanceOf(recipient);
        amountOut = balanceAfter - balanceBefore;
        
        return amountOut;
    }
    
    /**
     * @notice Execute token swap via DEX
     */
    function _executeSwap(
        address fromToken,
        address toToken,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        address swapPool
    ) internal {
        // Approve DEX to spend tokens
        IERC20(fromToken).forceApprove(swapPool, amountIn);
        
        // Execute swap - using simple DEX interface
        // In production, this would support multiple DEX protocols
        IDEX dex = IDEX(swapPool);
        
        address[] memory path = new address[](2);
        path[0] = fromToken;
        path[1] = toToken;
        
        dex.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            recipient,
            block.timestamp + 300 // 5 minute deadline
        );
    }
    
    receive() external payable {}
}

// Simple DEX interface for swaps
interface IDEX {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}