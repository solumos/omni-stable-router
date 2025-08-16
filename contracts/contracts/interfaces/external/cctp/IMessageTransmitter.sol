// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IMessageTransmitter
 * @notice Interface for Circle's CCTP MessageTransmitter contract
 * @dev Used for sending generic messages across chains with CCTP
 */
interface IMessageTransmitter {
    /**
     * @notice Send a message to a destination domain
     * @param destinationDomain CCTP domain ID of destination chain
     * @param recipient Address to handle the message on destination
     * @param messageBody Arbitrary message data
     * @return nonce Unique nonce for this message
     */
    function sendMessage(
        uint32 destinationDomain,
        bytes32 recipient,
        bytes calldata messageBody
    ) external returns (uint64 nonce);

    /**
     * @notice Receive and process a message from another domain
     * @param message Encoded message from source domain
     * @param attestation Signature from CCTP attesters
     * @return success Whether message was successfully processed
     */
    function receiveMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external returns (bool success);
}