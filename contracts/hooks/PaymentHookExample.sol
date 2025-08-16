// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Payment Hook Examples
 * @notice Example hooks that can be executed after CCTP v2 transfers
 * @dev These demonstrate the composability of CCTP v2 with generic message passing
 */

interface IPaymentHook {
    function onPaymentReceived(
        bytes32 paymentId,
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external returns (bytes memory);
}

/**
 * @notice Loyalty Points Hook - Awards points for payments
 */
contract LoyaltyPointsHook is IPaymentHook, Ownable {
    mapping(address => uint256) public loyaltyPoints;
    mapping(address => uint256) public pointsMultiplier; // basis points
    
    event PointsAwarded(address indexed recipient, uint256 points, bytes32 paymentId);
    
    constructor() Ownable(msg.sender) {
        pointsMultiplier[address(0)] = 100; // Default 1% cashback in points
    }
    
    function onPaymentReceived(
        bytes32 paymentId,
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external override returns (bytes memory) {
        // Calculate points based on payment amount
        uint256 multiplier = pointsMultiplier[recipient];
        if (multiplier == 0) {
            multiplier = pointsMultiplier[address(0)]; // Use default
        }
        
        uint256 points = (amount * multiplier) / 10000;
        loyaltyPoints[recipient] += points;
        
        emit PointsAwarded(recipient, points, paymentId);
        
        return abi.encode(points);
    }
    
    function setMultiplier(address recipient, uint256 multiplier) external onlyOwner {
        pointsMultiplier[recipient] = multiplier;
    }
}

/**
 * @notice Auto-Invest Hook - Automatically invests a portion of payment
 */
contract AutoInvestHook is IPaymentHook, Ownable {
    mapping(address => uint256) public investmentPercentage; // basis points
    mapping(address => address) public preferredVault; // User's preferred yield vault
    
    event AutoInvested(address indexed recipient, uint256 amount, address vault, bytes32 paymentId);
    
    interface IVault {
        function deposit(uint256 amount, address recipient) external returns (uint256 shares);
    }
    
    constructor() Ownable(msg.sender) {}
    
    function onPaymentReceived(
        bytes32 paymentId,
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external override returns (bytes memory) {
        uint256 percentage = investmentPercentage[recipient];
        if (percentage == 0) {
            return ""; // No auto-invest configured
        }
        
        address vault = preferredVault[recipient];
        require(vault != address(0), "No vault configured");
        
        // Calculate investment amount
        uint256 investAmount = (amount * percentage) / 10000;
        
        // Approve and deposit to vault
        IERC20(msg.sender).approve(vault, investAmount);
        uint256 shares = IVault(vault).deposit(investAmount, recipient);
        
        emit AutoInvested(recipient, investAmount, vault, paymentId);
        
        return abi.encode(shares, investAmount);
    }
    
    function configureAutoInvest(
        address recipient,
        uint256 percentage,
        address vault
    ) external onlyOwner {
        require(percentage <= 10000, "Invalid percentage");
        investmentPercentage[recipient] = percentage;
        preferredVault[recipient] = vault;
    }
}

/**
 * @notice Split Payment Hook - Splits payment among multiple recipients
 */
contract SplitPaymentHook is IPaymentHook, Ownable {
    struct SplitConfig {
        address[] recipients;
        uint256[] percentages; // basis points, must sum to 10000
        bool isActive;
    }
    
    mapping(address => SplitConfig) public splitConfigs;
    
    event PaymentSplit(
        bytes32 indexed paymentId,
        address indexed originalRecipient,
        address[] recipients,
        uint256[] amounts
    );
    
    constructor() Ownable(msg.sender) {}
    
    function onPaymentReceived(
        bytes32 paymentId,
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external override returns (bytes memory) {
        SplitConfig memory config = splitConfigs[recipient];
        
        if (!config.isActive) {
            // No split configured, send full amount to recipient
            IERC20(msg.sender).transfer(recipient, amount);
            return "";
        }
        
        uint256[] memory amounts = new uint256[](config.recipients.length);
        uint256 totalDistributed = 0;
        
        // Calculate and distribute amounts
        for (uint256 i = 0; i < config.recipients.length; i++) {
            amounts[i] = (amount * config.percentages[i]) / 10000;
            IERC20(msg.sender).transfer(config.recipients[i], amounts[i]);
            totalDistributed += amounts[i];
        }
        
        // Send any remainder due to rounding to first recipient
        if (amount > totalDistributed) {
            IERC20(msg.sender).transfer(config.recipients[0], amount - totalDistributed);
            amounts[0] += amount - totalDistributed;
        }
        
        emit PaymentSplit(paymentId, recipient, config.recipients, amounts);
        
        return abi.encode(config.recipients, amounts);
    }
    
    function configureSplit(
        address recipient,
        address[] calldata splitRecipients,
        uint256[] calldata percentages
    ) external onlyOwner {
        require(splitRecipients.length == percentages.length, "Length mismatch");
        
        uint256 total = 0;
        for (uint256 i = 0; i < percentages.length; i++) {
            total += percentages[i];
        }
        require(total == 10000, "Percentages must sum to 100%");
        
        splitConfigs[recipient] = SplitConfig({
            recipients: splitRecipients,
            percentages: percentages,
            isActive: true
        });
    }
}

/**
 * @notice Tax Withholding Hook - Automatically withholds tax
 */
contract TaxWithholdingHook is IPaymentHook, Ownable {
    address public taxCollector;
    mapping(address => uint256) public taxRate; // basis points
    
    event TaxWithheld(
        bytes32 indexed paymentId,
        address indexed recipient,
        uint256 taxAmount,
        uint256 netAmount
    );
    
    constructor(address _taxCollector) Ownable(msg.sender) {
        taxCollector = _taxCollector;
    }
    
    function onPaymentReceived(
        bytes32 paymentId,
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external override returns (bytes memory) {
        uint256 rate = taxRate[recipient];
        
        if (rate == 0) {
            // No tax configured
            IERC20(msg.sender).transfer(recipient, amount);
            return abi.encode(0, amount);
        }
        
        uint256 taxAmount = (amount * rate) / 10000;
        uint256 netAmount = amount - taxAmount;
        
        // Send tax to collector
        IERC20(msg.sender).transfer(taxCollector, taxAmount);
        
        // Send net amount to recipient
        IERC20(msg.sender).transfer(recipient, netAmount);
        
        emit TaxWithheld(paymentId, recipient, taxAmount, netAmount);
        
        return abi.encode(taxAmount, netAmount);
    }
    
    function setTaxRate(address recipient, uint256 rate) external onlyOwner {
        require(rate <= 5000, "Tax rate too high"); // Max 50%
        taxRate[recipient] = rate;
    }
    
    function setTaxCollector(address _taxCollector) external onlyOwner {
        taxCollector = _taxCollector;
    }
}

/**
 * @notice Escrow Hook - Holds payment in escrow until conditions are met
 */
contract EscrowHook is IPaymentHook, Ownable {
    struct Escrow {
        bytes32 paymentId;
        address recipient;
        uint256 amount;
        uint256 releaseTime;
        bool released;
        bytes32 condition;
    }
    
    mapping(bytes32 => Escrow) public escrows;
    mapping(bytes32 => bool) public conditionsMet;
    
    event EscrowCreated(bytes32 indexed paymentId, address recipient, uint256 amount, uint256 releaseTime);
    event EscrowReleased(bytes32 indexed paymentId, address recipient, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    function onPaymentReceived(
        bytes32 paymentId,
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external override returns (bytes memory) {
        // Decode escrow parameters
        (uint256 lockPeriod, bytes32 condition) = abi.decode(data, (uint256, bytes32));
        
        uint256 releaseTime = block.timestamp + lockPeriod;
        
        escrows[paymentId] = Escrow({
            paymentId: paymentId,
            recipient: recipient,
            amount: amount,
            releaseTime: releaseTime,
            released: false,
            condition: condition
        });
        
        emit EscrowCreated(paymentId, recipient, amount, releaseTime);
        
        return abi.encode(releaseTime, condition);
    }
    
    function releaseEscrow(bytes32 paymentId) external {
        Escrow storage escrow = escrows[paymentId];
        require(!escrow.released, "Already released");
        require(
            block.timestamp >= escrow.releaseTime || 
            conditionsMet[escrow.condition],
            "Conditions not met"
        );
        
        escrow.released = true;
        IERC20(msg.sender).transfer(escrow.recipient, escrow.amount);
        
        emit EscrowReleased(paymentId, escrow.recipient, escrow.amount);
    }
    
    function setConditionMet(bytes32 condition) external onlyOwner {
        conditionsMet[condition] = true;
    }
}