// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DebugRouter {
    using SafeERC20 for IERC20;
    
    event Debug(string message, uint256 value);
    event DebugAddress(string message, address value);
    
    function testTransfer(
        address token,
        uint256 amount
    ) external returns (bool) {
        emit DebugAddress("Sender", msg.sender);
        emit DebugAddress("Token", token);
        emit Debug("Amount", amount);
        
        // Check allowance before transfer
        uint256 allowance = IERC20(token).allowance(msg.sender, address(this));
        emit Debug("Allowance", allowance);
        
        // Check sender balance
        uint256 senderBalance = IERC20(token).balanceOf(msg.sender);
        emit Debug("Sender balance", senderBalance);
        
        // Try the transfer
        try IERC20(token).transferFrom(msg.sender, address(this), amount) returns (bool success) {
            emit Debug("TransferFrom success", success ? 1 : 0);
            
            // Check our balance after
            uint256 ourBalance = IERC20(token).balanceOf(address(this));
            emit Debug("Our balance after", ourBalance);
            
            return true;
        } catch Error(string memory reason) {
            emit Debug("TransferFrom failed with reason", 0);
            revert(reason);
        } catch (bytes memory lowLevelData) {
            emit Debug("TransferFrom failed with low-level error", 0);
            revert("Low-level error");
        }
    }
    
    function testSafeTransfer(
        address token,
        uint256 amount
    ) external returns (bool) {
        emit DebugAddress("Sender", msg.sender);
        emit DebugAddress("Token", token);
        emit Debug("Amount", amount);
        
        // Check allowance before transfer
        uint256 allowance = IERC20(token).allowance(msg.sender, address(this));
        emit Debug("Allowance", allowance);
        
        // Check sender balance
        uint256 senderBalance = IERC20(token).balanceOf(msg.sender);
        emit Debug("Sender balance", senderBalance);
        
        // Try the safe transfer
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Check our balance after
        uint256 ourBalance = IERC20(token).balanceOf(address(this));
        emit Debug("Our balance after", ourBalance);
        
        return true;
    }
}