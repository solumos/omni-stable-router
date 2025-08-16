// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface ICurvePool {
    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external returns (uint256);
    
    function get_dy(
        int128 i,
        int128 j,
        uint256 dx
    ) external view returns (uint256);
    
    function get_virtual_price() external view returns (uint256);
    
    function balances(uint256 i) external view returns (uint256);
}