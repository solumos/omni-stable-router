// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/**
 * @title ValidationLibrary
 * @notice Centralized validation logic to eliminate duplication
 * @dev Use this library for all common validation patterns
 */
library ValidationLibrary {
    
    /**
     * @notice Validates that amount is greater than zero
     * @param amount The amount to validate
     */
    function validateAmount(uint256 amount) internal pure {
        require(amount > 0, "VL: Invalid amount");
    }
    
    /**
     * @notice Validates that address is not zero
     * @param addr The address to validate
     */
    function validateAddress(address addr) internal pure {
        require(addr != address(0), "VL: Zero address");
    }
    
    /**
     * @notice Validates recipient address
     * @param recipient The recipient address to validate
     */
    function validateRecipient(address recipient) internal pure {
        require(recipient != address(0), "VL: Invalid recipient");
    }
    
    /**
     * @notice Validates array lengths match
     * @param length1 First array length
     * @param length2 Second array length
     */
    function validateArrayLengths(uint256 length1, uint256 length2) internal pure {
        require(length1 == length2, "VL: Array length mismatch");
    }
    
    /**
     * @notice Validates multiple array lengths match
     * @param lengths Array of lengths to compare
     */
    function validateMultipleArrayLengths(uint256[] memory lengths) internal pure {
        if (lengths.length == 0) return;
        uint256 expectedLength = lengths[0];
        for (uint256 i = 1; i < lengths.length; i++) {
            require(lengths[i] == expectedLength, "VL: Array length mismatch");
        }
    }
    
    /**
     * @notice Validates array is not empty and within bounds
     * @param length Array length
     * @param maxLength Maximum allowed length
     */
    function validateArrayBounds(uint256 length, uint256 maxLength) internal pure {
        require(length > 0, "VL: Empty array");
        require(length <= maxLength, "VL: Array too large");
    }
    
    /**
     * @notice Validates deadline has not passed
     * @param deadline The deadline timestamp
     */
    function validateDeadline(uint256 deadline) internal view {
        require(deadline >= block.timestamp, "VL: Deadline passed");
    }
    
    /**
     * @notice Validates slippage is within acceptable range
     * @param amountOut Actual output amount
     * @param minAmountOut Minimum acceptable amount
     */
    function validateSlippage(uint256 amountOut, uint256 minAmountOut) internal pure {
        require(amountOut >= minAmountOut, "VL: Slippage exceeded");
    }
    
    /**
     * @notice Validates fee is within acceptable range (max 10%)
     * @param fee Fee in basis points
     */
    function validateFeeBps(uint256 fee) internal pure {
        require(fee <= 1000, "VL: Fee too high"); // Max 10%
    }
    
    /**
     * @notice Validates chain ID is supported
     * @param chainId The chain ID to validate
     * @param isSupported Whether the chain is supported
     */
    function validateChainId(uint256 chainId, bool isSupported) internal pure {
        require(isSupported, "VL: Unsupported chain");
        require(chainId > 0, "VL: Invalid chain ID");
    }
}