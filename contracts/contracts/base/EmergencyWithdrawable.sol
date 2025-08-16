// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title EmergencyWithdrawable
 * @notice Base contract providing standardized emergency withdrawal functionality
 * @dev Inherit this to add consistent emergency functions across all contracts
 */
abstract contract EmergencyWithdrawable is Ownable {
    constructor() Ownable(msg.sender) {}
    using SafeERC20 for IERC20;
    
    event EmergencyWithdrawToken(address indexed token, uint256 amount, address indexed to);
    event EmergencyWithdrawETH(uint256 amount, address indexed to);
    
    /**
     * @notice Emergency withdraw tokens
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw (0 for full balance)
     * @param to Recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        require(to != address(0), "EW: Invalid recipient");
        
        if (token == address(0)) {
            // Withdraw ETH
            uint256 balance = address(this).balance;
            if (amount == 0) amount = balance;
            require(amount <= balance, "EW: Insufficient ETH");
            
            (bool success, ) = to.call{value: amount}("");
            require(success, "EW: ETH transfer failed");
            
            emit EmergencyWithdrawETH(amount, to);
        } else {
            // Withdraw ERC20
            uint256 balance = IERC20(token).balanceOf(address(this));
            if (amount == 0) amount = balance;
            require(amount <= balance, "EW: Insufficient tokens");
            
            IERC20(token).safeTransfer(to, amount);
            
            emit EmergencyWithdrawToken(token, amount, to);
        }
    }
    
    /**
     * @notice Emergency withdraw multiple tokens
     * @param tokens Array of token addresses
     * @param to Recipient address
     */
    function emergencyWithdrawMultiple(
        address[] calldata tokens,
        address to
    ) external onlyOwner {
        require(to != address(0), "EW: Invalid recipient");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(0)) {
                // Withdraw all ETH
                uint256 balance = address(this).balance;
                if (balance > 0) {
                    (bool success, ) = to.call{value: balance}("");
                    require(success, "EW: ETH transfer failed");
                    emit EmergencyWithdrawETH(balance, to);
                }
            } else {
                // Withdraw all tokens
                uint256 balance = IERC20(tokens[i]).balanceOf(address(this));
                if (balance > 0) {
                    IERC20(tokens[i]).safeTransfer(to, balance);
                    emit EmergencyWithdrawToken(tokens[i], balance, to);
                }
            }
        }
    }
}