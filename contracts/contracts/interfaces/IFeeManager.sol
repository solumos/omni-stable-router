// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IFeeManager {
    function recordFee(address token, uint256 amount) external;
    
    function withdrawFees(address token, address recipient) external;
    
    function getTotalFees(address token) external view returns (uint256);
    
    function setFeeRecipient(address recipient) external;
}