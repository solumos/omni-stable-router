// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/interfaces/IOAppComposer.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ITokenMessenger {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);
}

interface IMessageTransmitter {
    function receiveMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external returns (bool success);
}

contract HybridStablecoinRouter is OApp, OAppOptionsType3, IOAppComposer, ReentrancyGuard {
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
    }
    
    mapping(address => MerchantConfig) public merchants;
    
    // CCTP domain mappings (chainId -> CCTP domain)
    mapping(uint32 => uint32) public cctpDomains;
    
    // Payment tracking
    struct Payment {
        address merchant;
        address customer;
        address sourceToken;
        uint256 amount;
        uint32 destinationEid;
        address destinationToken;
        uint256 timestamp;
        bytes32 messageId;
    }
    
    mapping(bytes32 => Payment) public payments;
    
    // Events
    event PaymentInitiated(
        bytes32 indexed paymentId,
        address indexed merchant,
        address indexed customer,
        uint256 amount,
        address sourceToken,
        uint32 destinationEid
    );
    
    event PaymentCompleted(
        bytes32 indexed paymentId,
        address recipient,
        uint256 amount,
        address token
    );
    
    event MerchantConfigured(
        address indexed merchant,
        uint32 destinationEid,
        address recipientAddress,
        address preferredToken
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
     * @notice Main entry point for payments - handles routing automatically
     * @param merchant The merchant's address
     * @param amount The payment amount
     * @param sourceToken The token being paid with
     */
    function send(
        address merchant,
        uint256 amount,
        address sourceToken
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
            messageId: bytes32(0)
        });
        
        // Route based on tokens and chains
        if (sourceToken == USDC && config.preferredToken == USDC) {
            // Use CCTP for USDC-to-USDC transfers
            _routeViaCCTP(paymentId, config, amount);
        } else {
            // Use LayerZero Composer for mixed tokens or non-USDC
            _routeViaComposer(paymentId, config, amount, sourceToken);
        }
        
        emit PaymentInitiated(
            paymentId,
            merchant,
            msg.sender,
            amount,
            sourceToken,
            config.destinationEid
        );
        
        return paymentId;
    }
    
    /**
     * @notice Route USDC-to-USDC payments via Circle's CCTP
     */
    function _routeViaCCTP(
        bytes32 paymentId,
        MerchantConfig memory config,
        uint256 amount
    ) internal {
        uint32 destinationDomain = cctpDomains[config.destinationEid];
        require(destinationDomain != 0, "CCTP not available for destination");
        
        // Approve CCTP to spend USDC
        IERC20(USDC).safeApprove(address(cctpTokenMessenger), amount);
        
        // Burn USDC and initiate cross-chain transfer
        bytes32 recipient = bytes32(uint256(uint160(config.recipientAddress)));
        uint64 nonce = cctpTokenMessenger.depositForBurn(
            amount,
            destinationDomain,
            recipient,
            USDC
        );
        
        // Update payment with CCTP nonce
        payments[paymentId].messageId = bytes32(uint256(nonce));
    }
    
    /**
     * @notice Route mixed token payments via LayerZero Composer
     */
    function _routeViaComposer(
        bytes32 paymentId,
        MerchantConfig memory config,
        uint256 amount,
        address sourceToken
    ) internal {
        // Prepare the composed message
        bytes memory composeMsg = abi.encode(
            paymentId,
            config.recipientAddress,
            config.preferredToken,
            sourceToken,
            amount
        );
        
        // Prepare options for LayerZero
        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(500000, 0)  // gas for destination execution
            .addExecutorLzComposeOption(0, 500000, 0);  // gas for compose
        
        // Calculate LayerZero fees
        MessagingFee memory fee = _quote(
            config.destinationEid,
            composeMsg,
            options,
            false
        );
        
        require(msg.value >= fee.nativeFee, "Insufficient fee");
        
        // Send via LayerZero with compose
        MessagingReceipt memory receipt = _lzSend(
            config.destinationEid,
            composeMsg,
            options,
            fee,
            payable(msg.sender)
        );
        
        // Update payment with LayerZero guid
        payments[paymentId].messageId = receipt.guid;
        
        // Refund excess fee
        if (msg.value > fee.nativeFee) {
            payable(msg.sender).transfer(msg.value - fee.nativeFee);
        }
    }
    
    /**
     * @notice Handle incoming LayerZero messages
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        // Decode the message
        (
            bytes32 paymentId,
            address recipient,
            address destinationToken,
            address sourceToken,
            uint256 amount
        ) = abi.decode(_message, (bytes32, address, address, address, uint256));
        
        // If tokens are the same, direct transfer
        if (sourceToken == destinationToken) {
            IERC20(destinationToken).safeTransfer(recipient, amount);
            emit PaymentCompleted(paymentId, recipient, amount, destinationToken);
        } else {
            // Trigger compose for token swap
            endpoint.sendCompose(
                address(this),
                _guid,
                0,
                _message
            );
        }
    }
    
    /**
     * @notice Handle composed messages for token swaps
     */
    function lzCompose(
        address _from,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable override {
        require(msg.sender == address(endpoint), "Only endpoint");
        require(_from == address(this), "Only self");
        
        // Decode the compose message
        (
            bytes32 paymentId,
            address recipient,
            address destinationToken,
            address sourceToken,
            uint256 amount
        ) = abi.decode(_message, (bytes32, address, address, address, uint256));
        
        // Perform token swap if needed
        if (sourceToken != destinationToken) {
            uint256 outputAmount = _swapTokens(sourceToken, destinationToken, amount);
            IERC20(destinationToken).safeTransfer(recipient, outputAmount);
            emit PaymentCompleted(paymentId, recipient, outputAmount, destinationToken);
        }
    }
    
    /**
     * @notice Swap tokens on the destination chain
     */
    function _swapTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        // This would integrate with a DEX like Uniswap V3
        // For now, returning a mock 1:1 conversion
        // In production, this would call the DEX router
        
        // Example Uniswap V3 integration:
        // ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
        //     tokenIn: tokenIn,
        //     tokenOut: tokenOut,
        //     fee: 500, // 0.05%
        //     recipient: address(this),
        //     deadline: block.timestamp,
        //     amountIn: amountIn,
        //     amountOutMinimum: amountIn * 995 / 1000, // 0.5% slippage
        //     sqrtPriceLimitX96: 0
        // });
        // amountOut = swapRouter.exactInputSingle(params);
        
        return amountIn; // Mock implementation
    }
    
    /**
     * @notice Configure merchant settings
     */
    function configureMerchant(
        address merchant,
        uint32 destinationEid,
        address recipientAddress,
        address preferredToken
    ) external onlyOwner {
        merchants[merchant] = MerchantConfig({
            destinationEid: destinationEid,
            recipientAddress: recipientAddress,
            preferredToken: preferredToken,
            isActive: true
        });
        
        emit MerchantConfigured(merchant, destinationEid, recipientAddress, preferredToken);
    }
    
    /**
     * @notice Add supported token
     */
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
    }
    
    /**
     * @notice Configure CCTP domain mapping
     */
    function setCCTPDomain(uint32 eid, uint32 domain) external onlyOwner {
        cctpDomains[eid] = domain;
    }
    
    /**
     * @notice Quote LayerZero fees for a payment
     */
    function quote(
        address merchant,
        uint256 amount,
        address sourceToken
    ) external view returns (uint256 nativeFee) {
        require(merchants[merchant].isActive, "Merchant not active");
        MerchantConfig memory config = merchants[merchant];
        
        // CCTP transfers only need gas for the transaction
        if (sourceToken == USDC && config.preferredToken == USDC) {
            return 0; // CCTP doesn't require additional fees beyond gas
        }
        
        // LayerZero Composer fees
        bytes memory composeMsg = abi.encode(
            bytes32(0), // dummy payment ID
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
        
        return fee.nativeFee;
    }
}