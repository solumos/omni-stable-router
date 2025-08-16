// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./base/EmergencyWithdrawable.sol";
import "./libraries/ValidationLibrary.sol";

contract FeeManager is EmergencyWithdrawable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using ValidationLibrary for uint256;
    using ValidationLibrary for address;

    struct FeeInfo {
        uint256 totalCollected;
        uint256 totalWithdrawn;
        uint256 lastCollection;
    }

    mapping(address => FeeInfo) public feeInfo;
    mapping(address => bool) public authorizedCollectors;
    
    address public feeRecipient;
    uint256 public totalFeesCollected;
    
    event FeeCollected(address indexed token, uint256 amount, uint256 timestamp);
    event FeeWithdrawn(address indexed token, uint256 amount, address recipient);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event CollectorAuthorized(address collector, bool authorized);

    constructor(address _feeRecipient) EmergencyWithdrawable() {
        ValidationLibrary.validateAddress(_feeRecipient);
        feeRecipient = _feeRecipient;
    }

    modifier onlyAuthorized() {
        require(
            authorizedCollectors[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    function recordFee(address token, uint256 amount) external onlyAuthorized whenNotPaused {
        ValidationLibrary.validateAmount(amount);
        
        // Note: Tokens should already be transferred to this contract before calling this function
        
        FeeInfo storage info = feeInfo[token];
        info.totalCollected += amount;
        info.lastCollection = block.timestamp;
        
        totalFeesCollected += amount;
        
        emit FeeCollected(token, amount, block.timestamp);
    }

    function withdrawFees(
        address token,
        address recipient
    ) external onlyOwner nonReentrant whenNotPaused {
        if (recipient == address(0)) {
            recipient = feeRecipient;
        }
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No fees to withdraw");
        
        FeeInfo storage info = feeInfo[token];
        info.totalWithdrawn += balance;
        
        IERC20(token).safeTransfer(recipient, balance);
        
        emit FeeWithdrawn(token, balance, recipient);
    }

    function withdrawMultipleFees(
        address[] calldata tokens,
        address recipient
    ) external onlyOwner nonReentrant {
        if (recipient == address(0)) {
            recipient = feeRecipient;
        }
        
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 balance = IERC20(tokens[i]).balanceOf(address(this));
            
            if (balance > 0) {
                FeeInfo storage info = feeInfo[tokens[i]];
                info.totalWithdrawn += balance;
                
                IERC20(tokens[i]).safeTransfer(recipient, balance);
                
                emit FeeWithdrawn(tokens[i], balance, recipient);
            }
        }
    }

    function getTotalFees(address token) external view returns (uint256) {
        return feeInfo[token].totalCollected;
    }

    function getAvailableFees(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function getFeeInfo(address token) external view returns (
        uint256 totalCollected,
        uint256 totalWithdrawn,
        uint256 available,
        uint256 lastCollection
    ) {
        FeeInfo memory info = feeInfo[token];
        return (
            info.totalCollected,
            info.totalWithdrawn,
            IERC20(token).balanceOf(address(this)),
            info.lastCollection
        );
    }

    function getAllFeeInfo(address[] calldata tokens) external view returns (
        uint256[] memory totalCollected,
        uint256[] memory available
    ) {
        totalCollected = new uint256[](tokens.length);
        available = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            totalCollected[i] = feeInfo[tokens[i]].totalCollected;
            available[i] = IERC20(tokens[i]).balanceOf(address(this));
        }
        
        return (totalCollected, available);
    }

    function setFeeRecipient(address recipient) external onlyOwner {
        ValidationLibrary.validateAddress(recipient);
        
        address oldRecipient = feeRecipient;
        feeRecipient = recipient;
        
        emit FeeRecipientUpdated(oldRecipient, recipient);
    }

    function authorizeCollector(address collector, bool authorized) external onlyOwner {
        authorizedCollectors[collector] = authorized;
        emit CollectorAuthorized(collector, authorized);
    }

    function authorizeCollectors(
        address[] calldata collectors,
        bool[] calldata authorized
    ) external onlyOwner {
        ValidationLibrary.validateArrayLengths(collectors.length, authorized.length);
        
        for (uint256 i = 0; i < collectors.length; i++) {
            authorizedCollectors[collectors[i]] = authorized[i];
            emit CollectorAuthorized(collectors[i], authorized[i]);
        }
    }

    // Emergency withdrawal is now inherited from EmergencyWithdrawable
    
    // Add pause functionality
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }

    // Remove unprotected receive function to prevent griefing
    // Only accept ETH through specific functions
}