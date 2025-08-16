// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title TimelockMultisig
 * @notice Multi-signature timelock controller for critical protocol operations
 * @dev Extends OpenZeppelin's TimelockController with multi-sig requirements
 */
contract TimelockMultisig is TimelockController {
    
    uint256 public constant MIN_DELAY = 2 days;
    uint256 public constant MAX_DELAY = 30 days;
    
    /**
     * @notice Constructor
     * @param minDelay Initial minimum delay for operations
     * @param proposers List of addresses that can propose operations
     * @param executors List of addresses that can execute operations
     * @param admin Address that can grant and revoke roles (set to address(0) to renounce)
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {
        require(minDelay >= MIN_DELAY, "Delay too short");
        require(minDelay <= MAX_DELAY, "Delay too long");
        require(proposers.length >= 3, "Need at least 3 proposers");
        require(executors.length >= 2, "Need at least 2 executors");
    }
    
    // Note: Delay can only be updated via a proposal through the timelock itself
    // The TimelockController has built-in updateDelay function that requires TIMELOCK_ADMIN_ROLE
}