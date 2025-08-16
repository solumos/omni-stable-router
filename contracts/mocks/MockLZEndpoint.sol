// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract MockLZEndpoint {
    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }
    
    mapping(address => mapping(uint32 => bytes32)) public peers;
    
    event PacketSent(
        bytes encodedPayload,
        uint32 dstEid,
        address sender
    );
    
    function send(
        uint32 _dstEid,
        bytes calldata _message,
        bytes calldata _options,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable returns (bytes32 guid) {
        emit PacketSent(_message, _dstEid, msg.sender);
        return keccak256(abi.encodePacked(block.timestamp, _message));
    }
    
    function quote(
        uint32 _dstEid,
        bytes calldata _message,
        bytes calldata _options,
        bool _payInLzToken
    ) external pure returns (MessagingFee memory) {
        return MessagingFee({
            nativeFee: 0.001 ether,
            lzTokenFee: 0
        });
    }
    
    function setPeer(uint32 _eid, bytes32 _peer) external {
        peers[msg.sender][_eid] = _peer;
    }
    
    function sendCompose(
        address _to,
        bytes32 _guid,
        uint16 _index,
        bytes calldata _message
    ) external {
        // Mock compose functionality
    }
}