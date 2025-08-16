// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IRouteProcessor.sol";

// External protocol interfaces
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

interface IMessageTransmitter {
    function sendMessage(
        uint32 destinationDomain,
        bytes32 recipient,
        bytes calldata messageBody
    ) external returns (uint64);
}

interface IOFT {
    function sendFrom(
        address _from,
        uint16 _dstChainId,
        bytes calldata _toAddress,
        uint256 _amount,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;
}

interface ILayerZeroEndpoint {
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParam
    ) external view returns (uint256 nativeFee, uint256 zroFee);
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
    
    function quoteLayerZeroFee(
        uint16 _dstChainId,
        uint8 _functionType,
        bytes calldata _toAddress,
        bytes calldata _transferAndCallPayload,
        lzTxObj memory _lzTxParams
    ) external view returns (uint256, uint256);
}

/**
 * @title RouteProcessor
 * @notice Executes cross-chain routes via CCTP V2, LayerZero OFT/Composer, and Stargate
 * @dev Upgradeable implementation following UUPS pattern
 */
contract RouteProcessor is 
    IRouteProcessor,
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable 
{
    using SafeERC20 for IERC20;

    // Protocol addresses
    ITokenMessenger public cctpTokenMessenger;
    IMessageTransmitter public cctpMessageTransmitter;
    ILayerZeroEndpoint public layerZeroEndpoint;
    IStargateRouter public stargateRouter;

    // Chain ID mappings
    mapping(uint256 => uint32) public chainIdToCCTPDomain;
    mapping(uint256 => uint16) public chainIdToLayerZeroId;
    mapping(uint256 => uint16) public chainIdToStargateId;
    
    // Token configurations
    mapping(address => bool) public isUSDC;
    mapping(address => address) public tokenToOFT;
    mapping(address => uint256) public tokenToStargatePoolId;
    
    // Destination swap routers (1inch, 0x, etc)
    mapping(uint256 => address) public destinationSwapRouters;
    
    // Destination OFT addresses for each token on each chain
    mapping(uint256 => mapping(address => address)) public destinationOFTAddresses;
    
    // CCTP Hook receivers on each destination chain
    mapping(uint256 => address) public cctpHookReceivers;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _owner,
        address _cctpTokenMessenger,
        address _cctpMessageTransmitter,
        address _layerZeroEndpoint,
        address _stargateRouter
    ) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        
        cctpTokenMessenger = ITokenMessenger(_cctpTokenMessenger);
        cctpMessageTransmitter = IMessageTransmitter(_cctpMessageTransmitter);
        layerZeroEndpoint = ILayerZeroEndpoint(_layerZeroEndpoint);
        stargateRouter = IStargateRouter(_stargateRouter);
        
        _initializeChainMappings();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
     * @notice Execute basic CCTP transfer without hooks
     * @param token USDC token address
     * @param amount Amount to transfer
     * @param destChainId Destination chain ID
     * @param recipient Recipient address on destination
     */
    function executeCCTP(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external override nonReentrant whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(isUSDC[token], "Token not USDC");
        
        uint32 destDomain = chainIdToCCTPDomain[destChainId];
        require(destDomain > 0, "Invalid destination domain");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(token).safeIncreaseAllowance(address(cctpTokenMessenger), amount);
        
        bytes32 mintRecipient = bytes32(uint256(uint160(recipient)));
        
        uint64 nonce = cctpTokenMessenger.depositForBurn(
            amount,
            destDomain,
            mintRecipient,
            token
        );
        
        emit CCTPInitiated(token, amount, destDomain, recipient, nonce);
    }

    /**
     * @notice Execute CCTP V2 with Hooks for atomic destination execution
     * @dev Uses CCTP V2's Hook feature to enable atomic swaps on destination
     * @param sourceToken USDC address on source chain
     * @param destToken Target token address on destination chain
     * @param amount Amount of USDC to transfer
     * @param destChainId Destination chain ID
     * @param recipient Final recipient of swapped tokens
     * @param minAmountOut Minimum amount of destToken to receive
     * @param swapData Encoded swap instructions (pool address and DEX calldata)
     */
    function executeCCTPWithHooks(
        address sourceToken,
        address destToken,
        uint256 amount,
        uint256 destChainId,
        address recipient,
        uint256 minAmountOut,
        bytes calldata swapData
    ) external override nonReentrant whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(isUSDC[sourceToken], "Source not USDC");
        
        uint32 destDomain = chainIdToCCTPDomain[destChainId];
        require(destDomain > 0, "Invalid destination");
        
        // Get the CCTPHookReceiver contract on destination chain
        address hookReceiver = cctpHookReceivers[destChainId];
        require(hookReceiver != address(0), "Hook receiver not configured");
        
        IERC20(sourceToken).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(sourceToken).safeIncreaseAllowance(address(cctpTokenMessenger), amount);
        
        // Parse swap data to get pool address and actual swap calldata
        (address swapPool, bytes memory dexSwapData) = abi.decode(swapData, (address, bytes));
        
        // Create hook data for CCTPHookReceiver.handleReceiveMessage
        bytes memory hookData = abi.encode(
            destToken,      // Target token to swap to
            minAmountOut,   // Minimum acceptable amount
            recipient,      // Final recipient after swap
            swapPool,       // DEX pool/router address
            dexSwapData     // DEX-specific swap calldata
        );
        
        // Use depositForBurnWithCaller to ensure only hookReceiver can execute
        // The hookReceiver will receive USDC and execute the swap atomically
        bytes32 mintRecipient = bytes32(uint256(uint160(hookReceiver)));
        bytes32 destinationCaller = bytes32(uint256(uint160(hookReceiver)));
        
        uint64 nonce = cctpTokenMessenger.depositForBurnWithCaller(
            amount,
            destDomain,
            mintRecipient,      // Hook receiver gets the USDC
            sourceToken,
            destinationCaller   // Only hook receiver can call receiveMessage
        );
        
        // Send the hook data via MessageTransmitter
        // The hookReceiver will parse this in handleReceiveMessage
        cctpMessageTransmitter.sendMessage(
            destDomain,
            destinationCaller,
            hookData
        );
        
        emit CCTPInitiated(sourceToken, amount, destDomain, recipient, nonce);
    }

    /**
     * @notice Execute LayerZero OFT transfer for same token
     * @param token Token address (must be OFT-enabled)
     * @param amount Amount to transfer
     * @param destChainId Destination chain ID
     * @param recipient Recipient address on destination
     */
    function executeLayerZeroOFT(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external payable override nonReentrant whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(msg.value > 0, "LZ fee required");
        
        address oftAddress = tokenToOFT[token];
        require(oftAddress != address(0), "Token not OFT");
        
        uint16 lzChainId = chainIdToLayerZeroId[destChainId];
        require(lzChainId > 0, "Invalid LZ chain");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(token).safeIncreaseAllowance(oftAddress, amount);
        
        // Adapter params for gas on destination
        bytes memory adapterParams = abi.encodePacked(
            uint16(1),          // version
            uint256(200000)     // gas for destination
        );
        
        IOFT(oftAddress).sendFrom{value: msg.value}(
            address(this),
            lzChainId,
            abi.encodePacked(recipient),
            amount,
            payable(msg.sender),
            address(0),
            adapterParams
        );
        
        emit LayerZeroOFTSent(token, amount, lzChainId, recipient);
    }

    /**
     * @notice Execute Stargate transfer (primarily for USDT)
     * @param token Token address (must be configured for Stargate)
     * @param amount Amount to transfer
     * @param destChainId Destination chain ID
     * @param recipient Recipient address on destination
     */
    function executeStargate(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external payable override nonReentrant whenNotPaused {
        ValidationLibrary.validateAmount(amount);
        ValidationLibrary.validateRecipient(recipient);
        require(msg.value > 0, "Stargate fee required");
        
        uint256 poolId = tokenToStargatePoolId[token];
        require(poolId > 0, "Token not Stargate");
        
        uint16 stargateChainId = chainIdToStargateId[destChainId];
        require(stargateChainId > 0, "Invalid chain");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(token).safeIncreaseAllowance(address(stargateRouter), amount);
        
        IStargateRouter.lzTxObj memory lzTxParams = IStargateRouter.lzTxObj({
            dstGasForCall: 0,
            dstNativeAmount: 0,
            dstNativeAddr: abi.encodePacked(recipient)
        });
        
        stargateRouter.swap{value: msg.value}(
            stargateChainId,
            poolId,                     // source pool
            poolId,                     // dest pool (same token)
            payable(msg.sender),        // refund address
            amount,
            amount * 99 / 100,          // 1% slippage
            lzTxParams,
            abi.encodePacked(recipient),
            bytes("")                   // no payload
        );
        
        emit StargateSent(token, amount, stargateChainId, recipient);
    }

    /**
     * @notice Execute Stargate with swap on destination
     * @param sourceToken Source token (USDT)
     * @param destToken Target token on destination
     * @param amount Amount to transfer
     * @param destChainId Destination chain ID
     * @param recipient Final recipient
     * @param minAmountOut Minimum amount of destToken
     * @param swapData Encoded swap data for destination router
     */
    function executeStargateWithSwap(
        address sourceToken,
        address destToken,
        uint256 amount,
        uint256 destChainId,
        address recipient,
        uint256 minAmountOut,
        bytes calldata swapData
    ) external payable override nonReentrant whenNotPaused {
        ValidationLibrary.validateAmount(amount);
        ValidationLibrary.validateRecipient(recipient);
        require(msg.value > 0, "Stargate fee required");
        
        uint256 poolId = tokenToStargatePoolId[sourceToken];
        require(poolId > 0, "Token not Stargate");
        
        uint16 stargateChainId = chainIdToStargateId[destChainId];
        require(stargateChainId > 0, "Invalid chain");
        
        address destRouter = destinationSwapRouters[destChainId];
        require(destRouter != address(0), "No router");
        
        IERC20(sourceToken).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(sourceToken).safeIncreaseAllowance(address(stargateRouter), amount);
        
        // Encode swap payload
        bytes memory payload = abi.encode(
            recipient,
            destToken,
            minAmountOut,
            swapData
        );
        
        IStargateRouter.lzTxObj memory lzTxParams = IStargateRouter.lzTxObj({
            dstGasForCall: 500000,      // Gas for swap
            dstNativeAmount: 0,
            dstNativeAddr: abi.encodePacked(destRouter)
        });
        
        stargateRouter.swap{value: msg.value}(
            stargateChainId,
            poolId,
            poolId,
            payable(msg.sender),
            amount,
            minAmountOut,
            lzTxParams,
            abi.encodePacked(destRouter),
            payload
        );
        
        emit StargateSent(sourceToken, amount, stargateChainId, recipient);
    }

    /**
     * @notice Execute LayerZero Composer for cross-token swaps
     * @dev Sends OFT tokens with compose message for destination swap
     * @param sourceToken Source OFT token
     * @param destToken Target token on destination
     * @param amount Amount to transfer
     * @param destChainId Destination chain ID
     * @param recipient Final recipient
     * @param minAmountOut Minimum amount of destToken
     * @param composerData Encoded swap data for destination
     */
    function executeComposer(
        address sourceToken,
        address destToken,
        uint256 amount,
        uint256 destChainId,
        address recipient,
        uint256 minAmountOut,
        bytes calldata composerData
    ) external payable override nonReentrant whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(msg.value > 0, "Composer fee required");
        
        address oftAddress = tokenToOFT[sourceToken];
        require(oftAddress != address(0), "Not OFT token");
        
        uint16 lzChainId = chainIdToLayerZeroId[destChainId];
        require(lzChainId > 0, "Invalid chain");
        
        // Get destination OFT address (should be configured)
        address destOftAddress = destinationOFTAddresses[destChainId][sourceToken];
        require(destOftAddress != address(0), "Destination OFT not configured");
        
        IERC20(sourceToken).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(sourceToken).safeIncreaseAllowance(oftAddress, amount);
        
        // Compose message for the OFT to execute swap after receiving tokens
        // The OFT contract on destination will handle the swap
        bytes memory composeMsg = abi.encode(
            recipient,      // Final recipient after swap
            destToken,      // Token to swap to
            minAmountOut,   // Minimum amount expected
            composerData    // DEX calldata (1inch, etc)
        );
        
        // LayerZero V2 adapter params with compose
        // Version 2 enables compose functionality
        bytes memory adapterParams = abi.encodePacked(
            uint16(2),              // version 2 for compose
            uint256(200000),        // gas for lzReceive (token transfer)
            uint256(300000),        // gas for lzCompose (swap execution)
            uint256(0),             // no native value to send
            composeMsg              // compose message for destination
        );
        
        // Send to destination OFT with compose message
        // The OFT will receive tokens then execute the compose message
        IOFT(oftAddress).sendFrom{value: msg.value}(
            address(this),                     // from this contract
            lzChainId,                         // destination chain
            abi.encodePacked(destOftAddress),  // destination OFT handles compose
            amount,                            // amount to send
            payable(msg.sender),               // refund address
            address(0),                        // no ZRO payment
            adapterParams                      // includes compose message
        );
        
        emit ComposerSent(sourceToken, destToken, amount, lzChainId, recipient);
    }

    /**
     * @notice Estimate LayerZero fee for OFT transfer
     */
    function estimateLayerZeroFee(
        uint256 destChainId,
        address recipient,
        uint256 amount
    ) external view override returns (uint256) {
        uint16 lzChainId = chainIdToLayerZeroId[destChainId];
        require(lzChainId > 0, "Invalid chain");
        
        bytes memory payload = abi.encodePacked(recipient, amount);
        bytes memory adapterParams = abi.encodePacked(uint16(1), uint256(200000));
        
        (uint256 nativeFee, ) = layerZeroEndpoint.estimateFees(
            lzChainId,
            address(this),
            payload,
            false,
            adapterParams
        );
        
        return nativeFee;
    }

    /**
     * @notice Estimate Stargate fee
     */
    function estimateStargateFee(
        uint256 destChainId,
        address token
    ) external view override returns (uint256) {
        uint16 stargateChainId = chainIdToStargateId[destChainId];
        require(stargateChainId > 0, "Invalid chain");
        
        IStargateRouter.lzTxObj memory lzTxParams = IStargateRouter.lzTxObj({
            dstGasForCall: 0,
            dstNativeAmount: 0,
            dstNativeAddr: ""
        });
        
        (uint256 fee, ) = stargateRouter.quoteLayerZeroFee(
            stargateChainId,
            1,  // function type 1 = swap
            abi.encodePacked(address(this)),
            bytes(""),
            lzTxParams
        );
        
        return fee;
    }

    /**
     * @notice Estimate Composer fee for cross-token swap
     */
    function estimateComposerFee(
        uint256 destChainId,
        address recipient,
        bytes calldata composerData
    ) external view override returns (uint256) {
        uint16 lzChainId = chainIdToLayerZeroId[destChainId];
        require(lzChainId > 0, "Invalid chain");
        
        bytes memory payload = abi.encodePacked(recipient, composerData);
        bytes memory adapterParams = abi.encodePacked(
            uint16(2),          // version 2
            uint256(500000),    // gas for compose
            uint256(0)          // value
        );
        
        (uint256 nativeFee, ) = layerZeroEndpoint.estimateFees(
            lzChainId,
            address(this),
            payload,
            false,
            adapterParams
        );
        
        return nativeFee;
    }

    // Admin Functions

    function _initializeChainMappings() private {
        // CCTP Domain IDs
        chainIdToCCTPDomain[1] = 0;      // Ethereum
        chainIdToCCTPDomain[42161] = 3;  // Arbitrum
        chainIdToCCTPDomain[10] = 2;     // Optimism
        chainIdToCCTPDomain[8453] = 6;   // Base
        chainIdToCCTPDomain[137] = 7;    // Polygon
        chainIdToCCTPDomain[43114] = 1;  // Avalanche
        
        // LayerZero Chain IDs (V2)
        chainIdToLayerZeroId[1] = 30101;     // Ethereum
        chainIdToLayerZeroId[42161] = 30110; // Arbitrum
        chainIdToLayerZeroId[10] = 30111;    // Optimism
        chainIdToLayerZeroId[8453] = 30184;  // Base
        chainIdToLayerZeroId[137] = 30109;   // Polygon
        chainIdToLayerZeroId[43114] = 30106; // Avalanche
        
        // Stargate Chain IDs
        chainIdToStargateId[1] = 101;     // Ethereum
        chainIdToStargateId[42161] = 110; // Arbitrum
        chainIdToStargateId[10] = 111;    // Optimism
        chainIdToStargateId[8453] = 184;  // Base
        chainIdToStargateId[137] = 109;   // Polygon
        chainIdToStargateId[43114] = 106; // Avalanche
    }

    function configureToken(
        address token,
        bool _isUSDC,
        address oftAddress,
        uint256 stargatePoolId
    ) external onlyOwner {
        isUSDC[token] = _isUSDC;
        if (oftAddress != address(0)) {
            tokenToOFT[token] = oftAddress;
        }
        if (stargatePoolId > 0) {
            tokenToStargatePoolId[token] = stargatePoolId;
        }
    }

    function setDestinationSwapRouter(
        uint256 chainId,
        address router
    ) external onlyOwner {
        destinationSwapRouters[chainId] = router;
    }
    
    function setDestinationOFTAddress(
        uint256 chainId,
        address sourceToken,
        address destOftAddress
    ) external onlyOwner {
        destinationOFTAddresses[chainId][sourceToken] = destOftAddress;
    }
    
    function setCCTPHookReceiver(
        uint256 chainId,
        address hookReceiver
    ) external onlyOwner {
        cctpHookReceivers[chainId] = hookReceiver;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency Functions

    function rescueTokens(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    function rescueETH(
        uint256 amount,
        address payable to
    ) external onlyOwner {
        to.transfer(amount);
    }
}