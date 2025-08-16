// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// Simplified interfaces for LayerZero - actual implementations would use LayerZero contracts
interface IOFT {
    function send(
        uint16 _dstChainId,
        bytes calldata _toAddress,
        uint256 _amount,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;
}

interface ILayerZeroEndpoint {
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;
}

interface ITokenMessenger {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);
}

interface IStargateRouter {
    function swap(
        uint16 dstChainId,
        uint256 srcPoolId,
        uint256 dstPoolId,
        address payable refundAddress,
        uint256 amountLD,
        uint256 minAmountLD,
        STGSwapObj memory swapObj,
        bytes memory to,
        bytes memory payload
    ) external payable;

    struct STGSwapObj {
        uint256 amount;
        uint256 eqFee;
        uint256 eqReward;
        uint256 lpFee;
        uint256 protocolFee;
        uint256 lkbRemove;
    }

    function quoteLayerZeroFee(
        uint16 dstChainId,
        uint8 functionType,
        bytes calldata to,
        bytes calldata payload,
        STGSwapObj memory swapObj
    ) external view returns (uint256, uint256);
}

contract RouteProcessor is Ownable, Pausable {
    using SafeERC20 for IERC20;

    ITokenMessenger public cctpMessenger;
    ILayerZeroEndpoint public lzEndpoint;
    IStargateRouter public stargateRouter;

    mapping(uint256 => uint32) public chainIdToCCTPDomain;
    mapping(uint256 => uint16) public chainIdToLZChainId;
    mapping(address => address) public tokenToOFT;
    mapping(address => uint256) public tokenToStargatePoolId;

    event CCTPTransfer(
        address indexed token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    );

    event LayerZeroTransfer(
        address indexed token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    );

    event StargateTransfer(
        address indexed token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    );

    event ComposerTransfer(
        address indexed sourceToken,
        address indexed destToken,
        uint256 amount,
        uint256 destChainId,
        address recipient
    );

    constructor(
        address _cctpMessenger,
        address _lzEndpoint,
        address _stargateRouter
    ) Ownable(msg.sender) {
        cctpMessenger = ITokenMessenger(_cctpMessenger);
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
        stargateRouter = IStargateRouter(_stargateRouter);
        
        _initializeChainMappings();
    }

    function executeCCTP(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external whenNotPaused {
        require(amount > 0, "Invalid amount");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(token).approve(address(cctpMessenger), amount);
        
        uint32 destDomain = chainIdToCCTPDomain[destChainId];
        require(destDomain > 0, "Invalid destination domain");
        
        bytes32 mintRecipient = bytes32(uint256(uint160(recipient)));
        
        cctpMessenger.depositForBurn(
            amount,
            destDomain,
            mintRecipient,
            token
        );
        
        emit CCTPTransfer(token, amount, destChainId, recipient);
    }

    function executeLayerZeroOFT(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external payable whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(msg.value > 0, "LZ fee required");
        
        address oftAddress = tokenToOFT[token];
        require(oftAddress != address(0), "Token not OFT");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(token).approve(oftAddress, amount);
        
        uint16 lzChainId = chainIdToLZChainId[destChainId];
        require(lzChainId > 0, "Invalid LZ chain");
        
        // Prepare OFT send
        bytes memory adapterParams = abi.encodePacked(uint16(1), uint256(200000));
        
        IOFT(oftAddress).send{value: msg.value}(
            lzChainId,
            abi.encodePacked(recipient),
            amount,
            payable(msg.sender),
            address(0),
            adapterParams
        );
        
        emit LayerZeroTransfer(token, amount, destChainId, recipient);
    }

    function executeStargate(
        address token,
        uint256 amount,
        uint256 destChainId,
        address recipient
    ) external payable whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(msg.value > 0, "Stargate fee required");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(token).approve(address(stargateRouter), amount);
        
        uint16 lzChainId = chainIdToLZChainId[destChainId];
        uint256 srcPoolId = tokenToStargatePoolId[token];
        uint256 dstPoolId = srcPoolId; // Same pool for same token
        
        IStargateRouter.STGSwapObj memory swapObj = IStargateRouter.STGSwapObj({
            amount: amount,
            eqFee: 0,
            eqReward: 0,
            lpFee: 0,
            protocolFee: 0,
            lkbRemove: 0
        });
        
        stargateRouter.swap{value: msg.value}(
            lzChainId,
            srcPoolId,
            dstPoolId,
            payable(msg.sender),
            amount,
            (amount * 995) / 1000, // 0.5% slippage
            swapObj,
            abi.encodePacked(recipient),
            bytes("")
        );
        
        emit StargateTransfer(token, amount, destChainId, recipient);
    }

    function executeComposer(
        address sourceToken,
        address destToken,
        uint256 amount,
        uint256 destChainId,
        address recipient,
        uint256 minAmountOut,
        bytes calldata routeData
    ) external payable whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(msg.value > 0, "Composer fee required");
        
        IERC20(sourceToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // The composer logic would involve:
        // 1. Bridge source token to destination chain
        // 2. Swap on destination chain to dest token
        // This is simplified - actual implementation would use LayerZero Composer
        
        address oftAddress = tokenToOFT[sourceToken];
        if (oftAddress != address(0)) {
            // Use OFT with composer message
            IERC20(sourceToken).approve(oftAddress, amount);
            
            uint16 lzChainId = chainIdToLZChainId[destChainId];
            
            // Encode swap instruction for destination
            bytes memory payload = abi.encode(
                destToken,
                minAmountOut,
                recipient,
                routeData
            );
            
            // Send with composer payload
            IOFT(oftAddress).send{value: msg.value}(
                lzChainId,
                abi.encodePacked(recipient),
                amount,
                payable(msg.sender),
                address(0),
                payload
            );
        }
        
        emit ComposerTransfer(sourceToken, destToken, amount, destChainId, recipient);
    }

    function estimateLayerZeroFee(
        uint256 destChainId,
        address recipient,
        uint256 amount
    ) external view returns (uint256) {
        uint16 lzChainId = chainIdToLZChainId[destChainId];
        bytes memory adapterParams = abi.encodePacked(uint16(1), uint256(200000));
        
        // Simplified fee estimation
        return 0.001 ether;
    }

    function estimateStargateFee(
        uint256 destChainId,
        address token
    ) external view returns (uint256) {
        uint16 lzChainId = chainIdToLZChainId[destChainId];
        
        IStargateRouter.STGSwapObj memory swapObj = IStargateRouter.STGSwapObj({
            amount: 0,
            eqFee: 0,
            eqReward: 0,
            lpFee: 0,
            protocolFee: 0,
            lkbRemove: 0
        });
        
        (uint256 fee, ) = stargateRouter.quoteLayerZeroFee(
            lzChainId,
            1, // Swap function type
            abi.encodePacked(address(this)),
            bytes(""),
            swapObj
        );
        
        return fee;
    }

    function estimateComposerFee(
        uint256 destChainId,
        address recipient,
        bytes calldata routeData
    ) external view returns (uint256) {
        // Simplified fee estimation for composer
        return 0.002 ether;
    }

    function _initializeChainMappings() internal {
        // CCTP Domain IDs
        chainIdToCCTPDomain[1] = 0;      // Ethereum
        chainIdToCCTPDomain[42161] = 3;  // Arbitrum
        chainIdToCCTPDomain[10] = 2;     // Optimism
        chainIdToCCTPDomain[8453] = 6;   // Base
        chainIdToCCTPDomain[137] = 7;    // Polygon
        chainIdToCCTPDomain[43114] = 1;  // Avalanche
        
        // LayerZero Chain IDs
        chainIdToLZChainId[1] = 101;     // Ethereum
        chainIdToLZChainId[42161] = 110; // Arbitrum
        chainIdToLZChainId[10] = 111;    // Optimism
        chainIdToLZChainId[8453] = 184;  // Base
        chainIdToLZChainId[137] = 109;   // Polygon
        chainIdToLZChainId[43114] = 106; // Avalanche
    }

    function setTokenMappings(
        address token,
        address oft,
        uint256 stargatePoolId
    ) external onlyOwner {
        if (oft != address(0)) {
            tokenToOFT[token] = oft;
        }
        if (stargatePoolId > 0) {
            tokenToStargatePoolId[token] = stargatePoolId;
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}