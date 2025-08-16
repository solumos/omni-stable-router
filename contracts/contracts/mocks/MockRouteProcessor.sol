// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract MockRouteProcessor {
    event MockCCTPExecuted(address token, uint256 amount, uint256 destChainId, address recipient);
    event MockLayerZeroExecuted(address token, uint256 amount, uint256 destChainId, address recipient);
    event MockStargateExecuted(address token, uint256 amount, uint256 destChainId, address recipient);
    event MockComposerExecuted(address sourceToken, address destToken, uint256 amount, uint256 destChainId);

    function executeCCTP(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external {
        emit MockCCTPExecuted(token, amount, destChainId, recipient);
    }

    function executeLayerZeroOFT(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external payable {
        emit MockLayerZeroExecuted(token, amount, destChainId, recipient);
    }

    function executeStargate(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external payable {
        emit MockStargateExecuted(token, amount, destChainId, recipient);
    }

    function executeComposer(
        address sourceToken,
        address destToken,
        uint256 amount,
        uint256 destChainId,
        address recipient,
        uint256 minAmountOut,
        bytes calldata routeData
    ) external payable {
        emit MockComposerExecuted(sourceToken, destToken, amount, destChainId);
    }

    function estimateLayerZeroFee(
        uint256,
        address,
        uint256
    ) external pure returns (uint256) {
        return 0.001 ether;
    }

    function estimateStargateFee(
        uint256,
        address
    ) external pure returns (uint256) {
        return 0.001 ether;
    }

    function estimateComposerFee(
        uint256,
        address,
        bytes calldata
    ) external pure returns (uint256) {
        return 0.002 ether;
    }
}