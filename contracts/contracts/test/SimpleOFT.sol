// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleOFT
 * @notice Simplified OFT-like token that integrates with LayerZero
 * @dev This is a simplified version for testing cross-chain transfers
 */
contract SimpleOFT is ERC20, Ownable {
    address public immutable layerZeroEndpoint;
    mapping(uint16 => bytes) public trustedRemoteLookup;
    
    event SendToChain(uint16 indexed _dstChainId, bytes indexed _toAddress, uint256 _amount);
    event ReceiveFromChain(uint16 indexed _srcChainId, bytes indexed _fromAddress, uint256 _amount);
    
    constructor(
        string memory _name,
        string memory _symbol,
        address _layerZeroEndpoint
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        layerZeroEndpoint = _layerZeroEndpoint;
    }
    
    /**
     * @notice Set trusted remote address for a destination chain
     */
    function setTrustedRemote(uint16 _remoteChainId, bytes calldata _path) external onlyOwner {
        trustedRemoteLookup[_remoteChainId] = _path;
    }
    
    /**
     * @notice Send tokens to another chain
     * @dev Burns tokens on source chain
     */
    function sendFrom(
        address _from,
        uint16 _dstChainId,
        bytes calldata _toAddress,
        uint256 _amount,
        address payable, // _refundAddress (unused in simple version)
        address, // _zroPaymentAddress (unused)
        bytes calldata // _adapterParams (unused)
    ) external payable {
        require(_from == msg.sender || allowance(_from, msg.sender) >= _amount, "Insufficient allowance");
        
        // Burn tokens on source chain
        _burn(_from, _amount);
        
        emit SendToChain(_dstChainId, _toAddress, _amount);
    }
    
    /**
     * @notice Estimate fee for sending tokens
     */
    function estimateSendFee(
        uint16,
        bytes calldata,
        uint256,
        bool,
        bytes calldata
    ) external pure returns (uint256 nativeFee, uint256 zroFee) {
        // Simplified: return a fixed fee estimate
        return (0.001 ether, 0);
    }
    
    /**
     * @notice Mint tokens (for testing receiving from other chains)
     */
    function mintTo(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }
    
    /**
     * @notice Get shared decimals (for OFT compatibility)
     */
    function sharedDecimals() external pure returns (uint8) {
        return 6; // Standard shared decimals
    }
}