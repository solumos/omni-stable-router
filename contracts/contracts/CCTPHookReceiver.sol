// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ISwapExecutor.sol";

interface IMessageHandler {
    function handleReceiveMessage(
        uint32 sourceDomain,
        bytes32 sender,
        bytes calldata messageBody
    ) external returns (bool);
}

interface IMessageTransmitter {
    function receiveMessage(bytes calldata message, bytes calldata signature) external returns (bool);
}

/**
 * @title CCTPHookReceiver
 * @notice Receives CCTP messages with hooks and executes swaps on destination chain
 * @dev This contract is deployed on each destination chain to handle CCTP v2 hooks
 */
contract CCTPHookReceiver is IMessageHandler, Ownable, Pausable {
    using SafeERC20 for IERC20;

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
    
    event SwapFailed(
        uint32 indexed sourceDomain,
        address recipient,
        uint256 amount,
        string reason
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
    ) Ownable(msg.sender) {
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
    ) external override whenNotPaused returns (bool) {
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
        
        // USDC has already been minted to this contract by CCTP
        uint256 usdcBalance = IERC20(USDC).balanceOf(address(this));
        require(usdcBalance > 0, "No USDC received");
        
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
        try this.executeSwap(
            USDC,
            destToken,
            usdcBalance,
            minAmountOut,
            swapPool,
            swapData,
            recipient
        ) returns (uint256 amountOut) {
            emit HookExecuted(
                sourceDomain,
                USDC,
                destToken,
                usdcBalance,
                amountOut,
                recipient
            );
            return true;
        } catch Error(string memory reason) {
            // Swap failed - send USDC to recipient as fallback
            IERC20(USDC).safeTransfer(recipient, usdcBalance);
            emit SwapFailed(sourceDomain, recipient, usdcBalance, reason);
            return true; // Still return true to not block CCTP
        }
    }

    /**
     * @notice Executes the swap from USDC to destination token
     * @dev External function to enable try/catch
     */
    function executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address swapPool,
        bytes memory swapData,
        address recipient
    ) external returns (uint256) {
        require(msg.sender == address(this), "Internal only");
        require(supportedTokens[tokenOut], "Unsupported token");
        
        // Approve swap executor
        IERC20(tokenIn).approve(address(swapExecutor), amountIn);
        
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

    /**
     * @notice Emergency withdrawal of stuck tokens
     */
    function emergencyWithdraw(address token, address to) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(to, balance);
        }
    }

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