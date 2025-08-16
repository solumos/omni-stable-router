// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IRouteProcessor {
    // Standard protocols
    function executeCCTP(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external;

    function executeLayerZeroOFT(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external payable;

    function executeStargate(
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
        bytes calldata routeData
    ) external payable;

    // CCTP v2 with hooks (prioritized for USDC routes)
    function executeCCTPWithHooks(
        address sourceToken,
        address destToken,
        uint256 amount,
        uint256 destChainId,
        address recipient,
        uint256 minAmountOut,
        bytes calldata routeData
    ) external;

    // Bridge + swap combinations
    function executeOFTWithSwap(
        address sourceToken,
        address destToken,
        uint256 amount,
        uint256 destChainId,
        address recipient,
        uint256 minAmountOut,
        bytes calldata routeData
    ) external payable;

    function executeStargateWithSwap(
        address sourceToken,
        address destToken,
        uint256 amount,
        uint256 destChainId,
        address recipient,
        uint256 minAmountOut,
        bytes calldata routeData
    ) external payable;

    // Fee estimation
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
        bytes calldata routeData
    ) external view returns (uint256);
}