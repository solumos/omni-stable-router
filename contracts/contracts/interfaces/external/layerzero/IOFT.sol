// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IOFT
 * @notice Interface for LayerZero V2 Omnichain Fungible Token
 * @dev Used for cross-chain token transfers via LayerZero
 */
interface IOFT {
    /**
     * @notice Send tokens from sender to another chain
     * @param _from Address sending the tokens
     * @param _dstChainId LayerZero chain ID of destination
     * @param _toAddress Recipient address on destination chain
     * @param _amount Amount of tokens to send
     * @param _refundAddress Address to refund excess fees
     * @param _zroPaymentAddress Address for ZRO token payment (0 for native)
     * @param _adapterParams Additional params for gas and compose
     */
    function sendFrom(
        address _from,
        uint16 _dstChainId,
        bytes calldata _toAddress,
        uint256 _amount,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;

    /**
     * @notice Estimate fees for sending tokens
     * @param _dstChainId Destination chain ID
     * @param _toAddress Recipient address
     * @param _amount Amount to send
     * @param _useZro Whether to pay in ZRO tokens
     * @param _adapterParams Additional params
     * @return nativeFee Fee in native token
     * @return zroFee Fee in ZRO token (if applicable)
     */
    function estimateSendFee(
        uint16 _dstChainId,
        bytes calldata _toAddress,
        uint256 _amount,
        bool _useZro,
        bytes calldata _adapterParams
    ) external view returns (uint256 nativeFee, uint256 zroFee);
}