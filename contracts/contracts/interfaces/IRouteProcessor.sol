// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IRouteProcessor
 * @notice Interface for cross-chain routing protocol execution
 * @dev Handles CCTP V2, LayerZero OFT/Composer, and Stargate protocols
 */
interface IRouteProcessor {
    // Events
    event CCTPInitiated(
        address indexed token,
        uint256 amount,
        uint32 destinationDomain,
        address recipient,
        uint64 nonce
    );
    
    event LayerZeroOFTSent(
        address indexed token,
        uint256 amount,
        uint16 destChainId,
        address recipient
    );
    
    event StargateSent(
        address indexed token,
        uint256 amount,
        uint16 destChainId,
        address recipient
    );
    
    event ComposerSent(
        address indexed sourceToken,
        address indexed destToken,
        uint256 amount,
        uint16 destChainId,
        address recipient
    );

    // CCTP Functions
    function executeCCTP(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external;

    function executeCCTPWithHooks(
        address sourceToken,
        address destToken,
        uint256 amount,
        uint256 destChainId,
        address recipient,
        uint256 minAmountOut,
        bytes calldata hookData
    ) external;

    // LayerZero Functions
    function executeLayerZeroOFT(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external payable;

    function executeComposer(
        address sourceToken,
        address destToken,
        uint256 amount,
        uint256 destChainId,
        address recipient,
        uint256 minAmountOut,
        bytes calldata composerData
    ) external payable;

    // Stargate Functions
    function executeStargate(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external payable;

    function executeStargateWithSwap(
        address sourceToken,
        address destToken,
        uint256 amount,
        uint256 destChainId,
        address recipient,
        uint256 minAmountOut,
        bytes calldata swapData
    ) external payable;

    // Fee Estimation
    function estimateLayerZeroFee(
        uint256 destChainId,
        address recipient,
        uint256 amount
    ) external view returns (uint256);

    function estimateStargateFee(
        uint256 destChainId,
        address token
    ) external view returns (uint256);

    function estimateComposerFee(
        uint256 destChainId,
        address recipient,
        bytes calldata composerData
    ) external view returns (uint256);
}