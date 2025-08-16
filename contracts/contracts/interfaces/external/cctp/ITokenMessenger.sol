// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title ITokenMessenger
 * @notice Interface for Circle's CCTP TokenMessenger contract
 * @dev Used for burning USDC on source chain for minting on destination
 */
interface ITokenMessenger {
    /**
     * @notice Burn tokens on source chain for minting on destination
     * @param amount Amount of tokens to burn
     * @param destinationDomain CCTP domain ID of destination chain
     * @param mintRecipient Address to mint tokens to on destination
     * @param burnToken Address of token to burn (USDC)
     * @return nonce Unique nonce for this burn transaction
     */
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);

    /**
     * @notice Burn tokens with a specified caller on destination (V2 feature)
     * @param amount Amount of tokens to burn
     * @param destinationDomain CCTP domain ID of destination chain
     * @param mintRecipient Address to receive tokens on destination
     * @param burnToken Address of token to burn (USDC)
     * @param destinationCaller Authorized caller on destination chain
     * @return nonce Unique nonce for this burn transaction
     */
    function depositForBurnWithCaller(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller
    ) external returns (uint64 nonce);
}