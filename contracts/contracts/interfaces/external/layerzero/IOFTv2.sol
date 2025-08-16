// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IOFTv2
 * @notice Interface for LayerZero V2 Omnichain Fungible Token
 * @dev Updated interface for LayerZero V2 with compose functionality
 */
interface IOFTv2 {
    /**
     * @notice Parameters for sending OFT tokens
     */
    struct SendParam {
        uint32 dstEid;          // Destination endpoint ID
        bytes32 to;             // Recipient address (bytes32 for compatibility)
        uint256 amountLD;       // Amount in local decimals
        uint256 minAmountLD;    // Minimum amount to receive
        bytes extraOptions;     // Additional execution options
        bytes composeMsg;       // Message for composer execution
        bytes oftCmd;           // OFT specific commands
    }

    /**
     * @notice Messaging fee structure
     */
    struct MessagingFee {
        uint256 nativeFee;      // Fee in native token
        uint256 lzTokenFee;     // Fee in LZ token (if applicable)
    }

    /**
     * @notice Messaging receipt
     */
    struct MessagingReceipt {
        bytes32 guid;           // Unique message identifier
        uint64 nonce;           // Message nonce
        MessagingFee fee;       // Fee paid
    }

    /**
     * @notice Send OFT tokens to another chain
     * @param _sendParam Parameters for the send operation
     * @param _fee Messaging fee to pay
     * @param _refundAddress Address to refund excess fees
     * @return msgReceipt Messaging receipt with guid and fee details
     */
    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable returns (MessagingReceipt memory msgReceipt);

    /**
     * @notice Quote fee for sending tokens
     * @param _sendParam Parameters for the send operation
     * @param _payInLzToken Whether to pay in LZ token
     * @return msgFee Estimated messaging fee
     */
    function quoteSend(
        SendParam calldata _sendParam,
        bool _payInLzToken
    ) external view returns (MessagingFee memory msgFee);
}

/**
 * @title IOptionsBuilder
 * @notice Helper for building LayerZero V2 execution options
 */
interface IOptionsBuilder {
    /**
     * @notice Create new options
     */
    function newOptions() external pure returns (bytes memory);

    /**
     * @notice Add executor option for lzReceive
     * @param _options Existing options
     * @param _gas Gas limit for lzReceive
     * @param _value Native value to send
     */
    function addExecutorLzReceiveOption(
        bytes memory _options,
        uint128 _gas,
        uint128 _value
    ) external pure returns (bytes memory);

    /**
     * @notice Add executor option for lzCompose
     * @param _options Existing options
     * @param _index Composer index
     * @param _gas Gas limit for lzCompose
     * @param _value Native value to send
     */
    function addExecutorLzComposeOption(
        bytes memory _options,
        uint16 _index,
        uint128 _gas,
        uint128 _value
    ) external pure returns (bytes memory);
}