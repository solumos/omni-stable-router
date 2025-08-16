// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockCCTP {
    event DepositForBurn(
        uint64 indexed nonce,
        address indexed burnToken,
        uint256 amount,
        uint32 indexed destinationDomain,
        bytes32 mintRecipient,
        address depositor
    );
    
    event MessageSent(
        bytes message,
        uint32 destinationDomain
    );
    
    uint64 private _nonce;
    
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce) {
        // Transfer tokens from sender
        IERC20(burnToken).transferFrom(msg.sender, address(this), amount);
        
        nonce = ++_nonce;
        
        emit DepositForBurn(
            nonce,
            burnToken,
            amount,
            destinationDomain,
            mintRecipient,
            msg.sender
        );
        
        return nonce;
    }
    
    function depositForBurnWithCaller(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller
    ) external returns (uint64 nonce) {
        // Transfer tokens from sender
        IERC20(burnToken).transferFrom(msg.sender, address(this), amount);
        
        nonce = ++_nonce;
        
        emit DepositForBurn(
            nonce,
            burnToken,
            amount,
            destinationDomain,
            mintRecipient,
            msg.sender
        );
        
        return nonce;
    }
    
    function sendMessageWithCaller(
        uint32 destinationDomain,
        bytes32 recipient,
        bytes32 destinationCaller,
        bytes calldata messageBody
    ) external returns (uint64) {
        emit MessageSent(messageBody, destinationDomain);
        return ++_nonce;
    }
    
    function receiveMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external pure returns (bool) {
        return true;
    }
}