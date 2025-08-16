// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ISwapExecutor.sol";
import "./libraries/SharedInterfaces.sol";
import "./libraries/ValidationLibrary.sol";
import "./base/EmergencyWithdrawable.sol";

/**
 * @title CCTPHookReceiver
 * @notice Receives CCTP messages with hooks and executes atomic swaps on destination chain
 * @dev This contract is deployed on each destination chain to handle CCTP v2 hooks
 *      Swaps are atomic - either the swap succeeds or the entire transaction reverts
 */
contract CCTPHookReceiver is IMessageHandler, EmergencyWithdrawable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ValidationLibrary for uint256;
    using ValidationLibrary for address;

    ISwapExecutor public swapExecutor;
    IMessageTransmitter public messageTransmitter;
    
    mapping(uint32 => mapping(bytes32 => bool)) public authorizedSenders;
    mapping(address => bool) public supportedTokens;
    
    address public immutable USDC; // Set per chain in constructor
    
    event HookExecuted(
        uint32 indexed sourceDomain,
        address indexed sourceToken,
        address indexed destToken,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    );
    
    event AuthorizedSenderUpdated(
        uint32 domain,
        bytes32 sender,
        bool authorized
    );

    constructor(
        address _swapExecutor,
        address _messageTransmitter,
        address _usdc
    ) EmergencyWithdrawable() {
        ValidationLibrary.validateAddress(_swapExecutor);
        ValidationLibrary.validateAddress(_messageTransmitter);
        ValidationLibrary.validateAddress(_usdc);
        swapExecutor = ISwapExecutor(_swapExecutor);
        messageTransmitter = IMessageTransmitter(_messageTransmitter);
        USDC = _usdc;
    }

    /**
     * @notice Handles incoming CCTP messages with hook data
     * @param sourceDomain The source chain domain ID
     * @param sender The sender address on source chain
     * @param messageBody The hook data containing swap instructions
     */
    function handleReceiveMessage(
        uint32 sourceDomain,
        bytes32 sender,
        bytes calldata messageBody
    ) external override nonReentrant whenNotPaused returns (bool) {
        // Only callable by the CCTP MessageTransmitter
        require(msg.sender == address(messageTransmitter), "Unauthorized caller");
        
        // Verify sender is authorized
        require(authorizedSenders[sourceDomain][sender], "Unauthorized sender");
        
        // Decode the hook data
        (
            address destToken,
            uint256 minAmountOut,
            address recipient,
            address swapPool,
            bytes memory swapData
        ) = abi.decode(messageBody, (address, uint256, address, address, bytes));
        
        // Decode expected amount from message to validate
        // Note: This assumes the hook data includes expected amount
        // USDC has already been minted to this contract by CCTP
        uint256 usdcBalance = IERC20(USDC).balanceOf(address(this));
        require(usdcBalance > 0, "No USDC received");
        
        // TODO: Add validation that received amount matches expected
        // This would require encoding expected amount in the hook data
        
        // If destination token is USDC, just transfer
        if (destToken == USDC) {
            IERC20(USDC).safeTransfer(recipient, usdcBalance);
            emit HookExecuted(
                sourceDomain,
                USDC,
                USDC,
                usdcBalance,
                usdcBalance,
                recipient
            );
            return true;
        }
        
        // Execute swap from USDC to destination token
        // No try/catch - we want atomic execution (succeed or revert)
        uint256 amountOut = executeSwapInternal(
            USDC,
            destToken,
            usdcBalance,
            minAmountOut,
            swapPool,
            swapData,
            recipient
        );
        
        emit HookExecuted(
            sourceDomain,
            USDC,
            destToken,
            usdcBalance,
            amountOut,
            recipient
        );
        
        return true;
    }

    /**
     * @notice Executes the swap from USDC to destination token
     * @dev Internal function for atomic execution - reverts on failure
     */
    function executeSwapInternal(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address swapPool,
        bytes memory swapData,
        address recipient
    ) internal returns (uint256) {
        require(supportedTokens[tokenOut], "Unsupported token");
        ValidationLibrary.validateRecipient(recipient);
        
        // Use safeIncreaseAllowance instead of safeApprove to avoid race conditions
        IERC20(tokenIn).safeIncreaseAllowance(address(swapExecutor), amountIn);
        
        // Execute swap via SwapExecutor
        ISwapExecutor.SwapParams memory params = ISwapExecutor.SwapParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            pool: swapPool,
            swapData: swapData
        });
        
        uint256 amountOut = swapExecutor.executeSwap(params);
        
        // Verify slippage protection
        ValidationLibrary.validateSlippage(amountOut, minAmountOut);
        
        // Transfer output tokens to recipient
        IERC20(tokenOut).safeTransfer(recipient, amountOut);
        
        return amountOut;
    }

    /**
     * @notice Updates authorized senders for CCTP messages
     */
    function setAuthorizedSender(
        uint32 domain,
        bytes32 sender,
        bool authorized
    ) external onlyOwner {
        authorizedSenders[domain][sender] = authorized;
        emit AuthorizedSenderUpdated(domain, sender, authorized);
    }

    /**
     * @notice Updates supported tokens for swaps
     */
    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
    }

    /**
     * @notice Updates the swap executor contract
     */
    function setSwapExecutor(address _swapExecutor) external onlyOwner {
        swapExecutor = ISwapExecutor(_swapExecutor);
    }

    // Emergency withdrawal is now inherited from EmergencyWithdrawable

    /**
     * @notice Pause hook execution
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause hook execution
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}