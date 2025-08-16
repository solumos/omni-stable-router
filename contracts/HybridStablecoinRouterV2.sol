// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/interfaces/IOAppComposer.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// CCTP v2 Interfaces with Generic Message Passing
interface ITokenMessenger {
    function depositForBurnWithCaller(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller
    ) external returns (uint64 nonce);
}

interface IMessageTransmitter {
    function sendMessageWithCaller(
        uint32 destinationDomain,
        bytes32 recipient,
        bytes32 destinationCaller,
        bytes calldata messageBody
    ) external returns (uint64);
    
    function receiveMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external returns (bool success);
}

// CCTP v2 Hook Interface
interface ICCTPHook {
    function handleReceiveMessage(
        uint32 sourceDomain,
        bytes32 sender,
        bytes calldata messageBody
    ) external returns (bytes memory);
}

contract HybridStablecoinRouterV2 is OApp, OAppOptionsType3, IOAppComposer, ICCTPHook, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // CCTP contracts
    ITokenMessenger public immutable cctpTokenMessenger;
    IMessageTransmitter public immutable cctpMessageTransmitter;
    
    // Token addresses
    address public immutable USDC;
    mapping(address => bool) public supportedTokens;
    
    // Merchant configurations
    struct MerchantConfig {
        uint32 destinationEid;      // LayerZero endpoint ID
        address recipientAddress;    // Merchant's wallet on destination
        address preferredToken;      // Preferred stablecoin
        bool isActive;
        bytes hookData;             // Optional hook data for custom actions
    }
    
    mapping(address => MerchantConfig) public merchants;
    
    // CCTP domain mappings
    mapping(uint32 => uint32) public cctpDomains;
    mapping(uint32 => address) public remoteRouters; // CCTP domain -> router address
    
    // Payment tracking with enhanced metadata
    struct Payment {
        address merchant;
        address customer;
        address sourceToken;
        uint256 amount;
        uint32 destinationEid;
        address destinationToken;
        uint256 timestamp;
        bytes32 messageId;
        bytes metadata;              // Generic metadata for composed actions
    }
    
    mapping(bytes32 => Payment) public payments;
    
    // CCTP v2 Generic Message Types
    enum MessageType {
        PAYMENT,
        PAYMENT_WITH_SWAP,
        PAYMENT_WITH_HOOK,
        BATCH_PAYMENT
    }
    
    struct GenericMessage {
        MessageType messageType;
        bytes32 paymentId;
        address recipient;
        address destinationToken;
        bytes actionData;           // Encoded action-specific data
    }
    
    // Events
    event PaymentInitiated(
        bytes32 indexed paymentId,
        address indexed merchant,
        address indexed customer,
        uint256 amount,
        address sourceToken,
        uint32 destinationEid,
        bool usesCCTP
    );
    
    event PaymentCompleted(
        bytes32 indexed paymentId,
        address recipient,
        uint256 amount,
        address token
    );
    
    event HookExecuted(
        bytes32 indexed paymentId,
        bytes hookResult
    );

    constructor(
        address _endpoint,
        address _cctpTokenMessenger,
        address _cctpMessageTransmitter,
        address _usdc,
        address _owner
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        cctpTokenMessenger = ITokenMessenger(_cctpTokenMessenger);
        cctpMessageTransmitter = IMessageTransmitter(_cctpMessageTransmitter);
        USDC = _usdc;
        supportedTokens[_usdc] = true;
    }

    /**
     * @notice Enhanced send function with CCTP v2 capabilities
     * @param merchant The merchant's address
     * @param amount The payment amount
     * @param sourceToken The token being paid with
     * @param actionData Optional data for composed actions (swaps, hooks, etc.)
     */
    function send(
        address merchant,
        uint256 amount,
        address sourceToken,
        bytes calldata actionData
    ) external payable nonReentrant returns (bytes32 paymentId) {
        require(merchants[merchant].isActive, "Merchant not active");
        require(supportedTokens[sourceToken], "Token not supported");
        
        MerchantConfig memory config = merchants[merchant];
        
        // Transfer tokens from customer
        IERC20(sourceToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Generate payment ID
        paymentId = keccak256(abi.encodePacked(
            msg.sender,
            merchant,
            amount,
            block.timestamp,
            block.number
        ));
        
        // Store payment info
        payments[paymentId] = Payment({
            merchant: merchant,
            customer: msg.sender,
            sourceToken: sourceToken,
            amount: amount,
            destinationEid: config.destinationEid,
            destinationToken: config.preferredToken,
            timestamp: block.timestamp,
            messageId: bytes32(0),
            metadata: actionData
        });
        
        // Route based on tokens and features
        if (sourceToken == USDC && config.preferredToken == USDC) {
            // Use CCTP v2 with potential hooks
            if (actionData.length > 0 || config.hookData.length > 0) {
                _routeViaCCTPWithHook(paymentId, config, amount, actionData);
            } else {
                _routeViaCCTPDirect(paymentId, config, amount);
            }
        } else {
            // Use LayerZero Composer for mixed tokens
            _routeViaComposer(paymentId, config, amount, sourceToken);
        }
        
        emit PaymentInitiated(
            paymentId,
            merchant,
            msg.sender,
            amount,
            sourceToken,
            config.destinationEid,
            sourceToken == USDC && config.preferredToken == USDC
        );
        
        return paymentId;
    }
    
    /**
     * @notice Direct CCTP v2 transfer without hooks
     */
    function _routeViaCCTPDirect(
        bytes32 paymentId,
        MerchantConfig memory config,
        uint256 amount
    ) internal {
        uint32 destinationDomain = cctpDomains[config.destinationEid];
        require(destinationDomain != 0, "CCTP not available for destination");
        
        // Approve CCTP to spend USDC
        IERC20(USDC).safeApprove(address(cctpTokenMessenger), amount);
        
        // CCTP v2: depositForBurnWithCaller for composed operations
        bytes32 mintRecipient = bytes32(uint256(uint160(config.recipientAddress)));
        bytes32 destinationCaller = bytes32(uint256(uint160(remoteRouters[destinationDomain])));
        
        uint64 nonce = cctpTokenMessenger.depositForBurnWithCaller(
            amount,
            destinationDomain,
            mintRecipient,
            USDC,
            destinationCaller
        );
        
        payments[paymentId].messageId = bytes32(uint256(nonce));
    }
    
    /**
     * @notice CCTP v2 transfer with generic message and hooks
     */
    function _routeViaCCTPWithHook(
        bytes32 paymentId,
        MerchantConfig memory config,
        uint256 amount,
        bytes memory actionData
    ) internal {
        uint32 destinationDomain = cctpDomains[config.destinationEid];
        require(destinationDomain != 0, "CCTP not available for destination");
        
        // Approve CCTP to spend USDC
        IERC20(USDC).safeApprove(address(cctpTokenMessenger), amount);
        
        // Prepare generic message for destination
        GenericMessage memory message = GenericMessage({
            messageType: config.hookData.length > 0 ? MessageType.PAYMENT_WITH_HOOK : MessageType.PAYMENT,
            paymentId: paymentId,
            recipient: config.recipientAddress,
            destinationToken: config.preferredToken,
            actionData: config.hookData.length > 0 ? config.hookData : actionData
        });
        
        bytes memory messageBody = abi.encode(message);
        
        // Send USDC with generic message
        bytes32 mintRecipient = bytes32(uint256(uint160(remoteRouters[destinationDomain])));
        bytes32 destinationCaller = bytes32(uint256(uint160(remoteRouters[destinationDomain])));
        
        // First: Burn USDC and get nonce
        uint64 burnNonce = cctpTokenMessenger.depositForBurnWithCaller(
            amount,
            destinationDomain,
            mintRecipient,
            USDC,
            destinationCaller
        );
        
        // Second: Send generic message with same nonce reference
        bytes32 recipient = bytes32(uint256(uint160(remoteRouters[destinationDomain])));
        uint64 messageNonce = cctpMessageTransmitter.sendMessageWithCaller(
            destinationDomain,
            recipient,
            destinationCaller,
            messageBody
        );
        
        // Store combined message ID
        payments[paymentId].messageId = keccak256(abi.encodePacked(burnNonce, messageNonce));
    }
    
    /**
     * @notice Handle incoming CCTP v2 messages with hooks
     */
    function handleReceiveMessage(
        uint32 sourceDomain,
        bytes32 sender,
        bytes calldata messageBody
    ) external override returns (bytes memory) {
        require(msg.sender == address(cctpMessageTransmitter), "Only CCTP");
        require(sender == bytes32(uint256(uint160(remoteRouters[sourceDomain]))), "Invalid sender");
        
        // Decode generic message
        GenericMessage memory message = abi.decode(messageBody, (GenericMessage));
        
        if (message.messageType == MessageType.PAYMENT) {
            // Simple payment delivery
            IERC20(message.destinationToken).safeTransfer(message.recipient, IERC20(message.destinationToken).balanceOf(address(this)));
            emit PaymentCompleted(message.paymentId, message.recipient, IERC20(message.destinationToken).balanceOf(address(this)), message.destinationToken);
            
        } else if (message.messageType == MessageType.PAYMENT_WITH_SWAP) {
            // Payment with token swap
            _handleSwapAndDeliver(message);
            
        } else if (message.messageType == MessageType.PAYMENT_WITH_HOOK) {
            // Payment with custom hook execution
            bytes memory hookResult = _executeHook(message);
            emit HookExecuted(message.paymentId, hookResult);
            
        } else if (message.messageType == MessageType.BATCH_PAYMENT) {
            // Handle batch payments
            _handleBatchPayment(message);
        }
        
        return "";
    }
    
    /**
     * @notice Handle swap and delivery on destination
     */
    function _handleSwapAndDeliver(GenericMessage memory message) internal {
        (address tokenIn, address tokenOut, uint256 amountIn, address dex, bytes memory swapData) = 
            abi.decode(message.actionData, (address, address, uint256, address, bytes));
        
        // Approve DEX
        IERC20(tokenIn).safeApprove(dex, amountIn);
        
        // Execute swap
        (bool success, bytes memory result) = dex.call(swapData);
        require(success, "Swap failed");
        
        uint256 amountOut = abi.decode(result, (uint256));
        
        // Deliver swapped tokens
        IERC20(tokenOut).safeTransfer(message.recipient, amountOut);
        emit PaymentCompleted(message.paymentId, message.recipient, amountOut, tokenOut);
    }
    
    /**
     * @notice Execute custom hooks for composed actions
     */
    function _executeHook(GenericMessage memory message) internal returns (bytes memory) {
        // Decode hook data
        (address hookContract, bytes memory hookCalldata) = abi.decode(message.actionData, (address, bytes));
        
        // Execute hook with payment context
        (bool success, bytes memory result) = hookContract.call(
            abi.encodeWithSignature(
                "onPaymentReceived(bytes32,address,uint256,bytes)",
                message.paymentId,
                message.recipient,
                IERC20(message.destinationToken).balanceOf(address(this)),
                hookCalldata
            )
        );
        
        require(success, "Hook execution failed");
        
        // Transfer tokens after hook execution
        IERC20(message.destinationToken).safeTransfer(message.recipient, IERC20(message.destinationToken).balanceOf(address(this)));
        
        return result;
    }
    
    /**
     * @notice Handle batch payments in a single CCTP message
     */
    function _handleBatchPayment(GenericMessage memory message) internal {
        (address[] memory recipients, uint256[] memory amounts, address token) = 
            abi.decode(message.actionData, (address[], uint256[], address));
        
        require(recipients.length == amounts.length, "Length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            IERC20(token).safeTransfer(recipients[i], amounts[i]);
        }
        
        emit PaymentCompleted(message.paymentId, address(0), 0, token);
    }
    
    /**
     * @notice Route via LayerZero Composer (unchanged from v1)
     */
    function _routeViaComposer(
        bytes32 paymentId,
        MerchantConfig memory config,
        uint256 amount,
        address sourceToken
    ) internal {
        bytes memory composeMsg = abi.encode(
            paymentId,
            config.recipientAddress,
            config.preferredToken,
            sourceToken,
            amount
        );
        
        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(500000, 0)
            .addExecutorLzComposeOption(0, 500000, 0);
        
        MessagingFee memory fee = _quote(
            config.destinationEid,
            composeMsg,
            options,
            false
        );
        
        require(msg.value >= fee.nativeFee, "Insufficient fee");
        
        MessagingReceipt memory receipt = _lzSend(
            config.destinationEid,
            composeMsg,
            options,
            fee,
            payable(msg.sender)
        );
        
        payments[paymentId].messageId = receipt.guid;
        
        if (msg.value > fee.nativeFee) {
            payable(msg.sender).transfer(msg.value - fee.nativeFee);
        }
    }
    
    /**
     * @notice Batch send for multiple payments in one transaction
     */
    function batchSend(
        address[] calldata merchants,
        uint256[] calldata amounts,
        address sourceToken
    ) external payable nonReentrant returns (bytes32[] memory paymentIds) {
        require(merchants.length == amounts.length, "Length mismatch");
        require(supportedTokens[sourceToken], "Token not supported");
        
        paymentIds = new bytes32[](merchants.length);
        uint256 totalAmount = 0;
        
        // Calculate total amount
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        // Transfer total tokens from customer
        IERC20(sourceToken).safeTransferFrom(msg.sender, address(this), totalAmount);
        
        // Process each payment
        for (uint256 i = 0; i < merchants.length; i++) {
            // Implementation would batch these into a single CCTP message
            // using MessageType.BATCH_PAYMENT
        }
        
        return paymentIds;
    }
    
    /**
     * @notice Configure merchant with hook support
     */
    function configureMerchant(
        address merchant,
        uint32 destinationEid,
        address recipientAddress,
        address preferredToken,
        bytes calldata hookData
    ) external onlyOwner {
        merchants[merchant] = MerchantConfig({
            destinationEid: destinationEid,
            recipientAddress: recipientAddress,
            preferredToken: preferredToken,
            isActive: true,
            hookData: hookData
        });
    }
    
    /**
     * @notice Set remote router for CCTP domain
     */
    function setRemoteRouter(uint32 domain, address router) external onlyOwner {
        remoteRouters[domain] = router;
    }
    
    // LayerZero handlers remain the same as v1
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        (bytes32 paymentId, address recipient, address destinationToken, address sourceToken, uint256 amount) = 
            abi.decode(_message, (bytes32, address, address, address, uint256));
        
        if (sourceToken == destinationToken) {
            IERC20(destinationToken).safeTransfer(recipient, amount);
            emit PaymentCompleted(paymentId, recipient, amount, destinationToken);
        } else {
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
        require(_from == address(this), "Only self");
        
        (bytes32 paymentId, address recipient, address destinationToken, address sourceToken, uint256 amount) = 
            abi.decode(_message, (bytes32, address, address, address, uint256));
        
        if (sourceToken != destinationToken) {
            uint256 outputAmount = _swapTokens(sourceToken, destinationToken, amount);
            IERC20(destinationToken).safeTransfer(recipient, outputAmount);
            emit PaymentCompleted(paymentId, recipient, outputAmount, destinationToken);
        }
    }
    
    function _swapTokens(address tokenIn, address tokenOut, uint256 amountIn) internal returns (uint256) {
        // Implementation would call DEX
        return amountIn;
    }
    
    // Additional helper functions
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
    }
    
    function setCCTPDomain(uint32 eid, uint32 domain) external onlyOwner {
        cctpDomains[eid] = domain;
    }
}