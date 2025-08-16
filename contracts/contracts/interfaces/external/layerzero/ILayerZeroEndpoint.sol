// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title ILayerZeroEndpoint
 * @notice Interface for LayerZero V2 Endpoint
 * @dev Core LayerZero messaging infrastructure
 */
interface ILayerZeroEndpoint {
    /**
     * @notice Send a message to another chain
     * @param _dstChainId Destination chain ID
     * @param _destination Destination contract address
     * @param _payload Message payload
     * @param _refundAddress Address for fee refunds
     * @param _zroPaymentAddress ZRO payment address (0 for native)
     * @param _adapterParams Additional parameters for execution
     */
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;

    /**
     * @notice Estimate fees for sending a message
     * @param _dstChainId Destination chain ID
     * @param _userApplication User application address
     * @param _payload Message payload
     * @param _payInZRO Whether to pay in ZRO tokens
     * @param _adapterParam Additional parameters
     * @return nativeFee Fee in native token
     * @return zroFee Fee in ZRO token (if applicable)
     */
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParam
    ) external view returns (uint256 nativeFee, uint256 zroFee);

    /**
     * @notice Get the inbound nonce for a source chain
     * @param _srcChainId Source chain ID
     * @param _srcAddress Source address
     * @return nonce Current inbound nonce
     */
    function getInboundNonce(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (uint64 nonce);

    /**
     * @notice Get the outbound nonce for a destination chain
     * @param _dstChainId Destination chain ID
     * @param _srcAddress Source address
     * @return nonce Current outbound nonce
     */
    function getOutboundNonce(uint16 _dstChainId, address _srcAddress) external view returns (uint64 nonce);
}