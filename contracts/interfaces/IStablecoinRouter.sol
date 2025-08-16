// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IStablecoinRouter {
    /**
     * @notice Simple one-function payment interface
     * @param merchant The merchant's address or ID
     * @param amount The payment amount (in token decimals)
     * @param sourceToken The stablecoin being paid with
     * @return paymentId Unique identifier for tracking the payment
     */
    function send(
        address merchant,
        uint256 amount,
        address sourceToken
    ) external payable returns (bytes32 paymentId);
    
    /**
     * @notice Get fee quote for a payment
     * @param merchant The merchant's address
     * @param amount The payment amount
     * @param sourceToken The stablecoin being paid with
     * @return nativeFee The native token fee required (0 for CCTP)
     */
    function quote(
        address merchant,
        uint256 amount,
        address sourceToken
    ) external view returns (uint256 nativeFee);
    
    /**
     * @notice Check if a merchant is configured
     * @param merchant The merchant's address
     * @return isActive Whether the merchant is active
     */
    function isMerchantActive(address merchant) external view returns (bool isActive);
    
    /**
     * @notice Get merchant's preferred configuration
     * @param merchant The merchant's address
     * @return destinationChainId The destination chain ID
     * @return recipientAddress The recipient address on destination
     * @return preferredToken The preferred stablecoin to receive
     */
    function getMerchantConfig(address merchant) external view returns (
        uint32 destinationChainId,
        address recipientAddress,
        address preferredToken
    );
}