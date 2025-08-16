// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IStargateRouter
 * @notice Interface for Stargate Router (primarily for USDT)
 * @dev Used for cross-chain stable token transfers via Stargate
 */
interface IStargateRouter {
    /**
     * @notice LayerZero transaction object for Stargate
     * @param dstGasForCall Gas to send to destination for execution
     * @param dstNativeAmount Native token amount for destination
     * @param dstNativeAddr Address to receive native tokens on destination
     */
    struct lzTxObj {
        uint256 dstGasForCall;
        uint256 dstNativeAmount;
        bytes dstNativeAddr;
    }

    /**
     * @notice Swap tokens to another chain via Stargate
     * @param _dstChainId Destination chain ID
     * @param _srcPoolId Source pool ID
     * @param _dstPoolId Destination pool ID
     * @param _refundAddress Address for fee refunds
     * @param _amountLD Amount in local decimals
     * @param _minAmountLD Minimum amount to receive
     * @param _lzTxParams LayerZero transaction parameters
     * @param _to Recipient address on destination
     * @param _payload Additional payload for destination execution
     */
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

    /**
     * @notice Quote LayerZero fees for a swap
     * @param _dstChainId Destination chain ID
     * @param _functionType Function type (1 for swap)
     * @param _toAddress Destination address
     * @param _transferAndCallPayload Payload for destination
     * @param _lzTxParams Transaction parameters
     * @return fee Native fee amount
     * @return zroFee ZRO fee amount (if applicable)
     */
    function quoteLayerZeroFee(
        uint16 _dstChainId,
        uint8 _functionType,
        bytes calldata _toAddress,
        bytes calldata _transferAndCallPayload,
        lzTxObj memory _lzTxParams
    ) external view returns (uint256 fee, uint256 zroFee);

    /**
     * @notice Add liquidity to a Stargate pool
     * @param _poolId Pool ID
     * @param _amountLD Amount to add
     * @param _to Address to receive LP tokens
     */
    function addLiquidity(
        uint256 _poolId,
        uint256 _amountLD,
        address _to
    ) external;

    /**
     * @notice Redeem local tokens from a pool
     * @param _poolId Pool ID
     * @param _amountLD Amount to redeem
     * @param _to Recipient address
     */
    function redeemLocal(
        uint16 _poolId,
        uint256 _amountLD,
        address _to
    ) external;
}