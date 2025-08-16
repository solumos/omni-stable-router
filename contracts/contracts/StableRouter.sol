// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IRouteProcessor.sol";
import "./interfaces/ISwapExecutor.sol";
import "./interfaces/IFeeManager.sol";

contract StableRouter is 
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    struct RouteParams {
        address sourceToken;
        address destToken;
        uint256 amount;
        uint256 destChainId;
        address recipient;
        uint256 minAmountOut;
        bytes routeData;
    }

    struct TokenInfo {
        address tokenAddress;
        uint8 decimals;
        bool isSupported;
        uint8 protocolId; // 0: None, 1: CCTP, 2: LayerZero OFT, 3: Stargate
    }

    IRouteProcessor public routeProcessor;
    ISwapExecutor public swapExecutor;
    IFeeManager public feeManager;

    mapping(string => TokenInfo) public tokens;
    mapping(uint256 => bool) public supportedChains;
    
    uint256 public constant PROTOCOL_FEE_BPS = 10; // 0.1%
    uint256 public constant MAX_SLIPPAGE_BPS = 300; // 3%
    
    event RouteInitiated(
        address indexed user,
        address sourceToken,
        address destToken,
        uint256 amount,
        uint256 destChainId,
        address recipient
    );
    
    event RouteCompleted(
        bytes32 indexed routeId,
        address indexed user,
        uint256 amountOut
    );
    
    event ProtocolsUpdated(
        address routeProcessor,
        address swapExecutor,
        address feeManager
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _routeProcessor,
        address _swapExecutor,
        address _feeManager
    ) public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        routeProcessor = IRouteProcessor(_routeProcessor);
        swapExecutor = ISwapExecutor(_swapExecutor);
        feeManager = IFeeManager(_feeManager);
        
        _initializeTokens();
        _initializeChains();
    }

    function executeRoute(
        RouteParams calldata params
    ) external payable whenNotPaused nonReentrant {
        _validateRoute(params);
        
        // Collect tokens from user
        IERC20(params.sourceToken).safeTransferFrom(
            msg.sender,
            address(this),
            params.amount
        );
        
        // Calculate and collect fees
        uint256 protocolFee = (params.amount * PROTOCOL_FEE_BPS) / 10000;
        uint256 amountAfterFee = params.amount - protocolFee;
        
        if (protocolFee > 0) {
            IERC20(params.sourceToken).safeTransfer(
                address(feeManager),
                protocolFee
            );
            feeManager.recordFee(params.sourceToken, protocolFee);
        }
        
        // Determine protocol and execute
        uint8 protocol = _determineProtocol(
            params.sourceToken,
            params.destToken,
            params.destChainId
        );
        
        bytes32 routeId = _generateRouteId(params);
        
        emit RouteInitiated(
            msg.sender,
            params.sourceToken,
            params.destToken,
            params.amount,
            params.destChainId,
            params.recipient
        );
        
        // Execute based on protocol
        if (protocol == 1) {
            // Standard CCTP (USDC to USDC)
            _executeCCTP(params, amountAfterFee);
        } else if (protocol == 2) {
            // LayerZero OFT (same token, non-USDC)
            _executeLayerZeroOFT(params, amountAfterFee);
        } else if (protocol == 3) {
            // Stargate (USDT to USDT)
            _executeStargate(params, amountAfterFee);
        } else if (protocol == 4) {
            // LayerZero Composer (cross-token, no USDC)
            _executeComposer(params, amountAfterFee);
        } else if (protocol == 5) {
            // CCTP with hooks (USDC to other token)
            _executeCCTPWithHooks(params, amountAfterFee);
        } else if (protocol == 6) {
            // LayerZero OFT with destination swap to USDC
            _executeOFTWithSwap(params, amountAfterFee);
        } else if (protocol == 7) {
            // Stargate with destination swap to USDC
            _executeStargateWithSwap(params, amountAfterFee);
        } else {
            revert("Unsupported route");
        }
    }

    function _executeCCTP(
        RouteParams calldata params,
        uint256 amount
    ) internal {
        // Approve and execute CCTP transfer
        IERC20(params.sourceToken).approve(
            address(routeProcessor),
            amount
        );
        
        routeProcessor.executeCCTP(
            params.sourceToken,
            amount,
            params.destChainId,
            params.recipient
        );
    }

    function _executeLayerZeroOFT(
        RouteParams calldata params,
        uint256 amount
    ) internal {
        // Approve and execute LayerZero OFT transfer
        IERC20(params.sourceToken).approve(
            address(routeProcessor),
            amount
        );
        
        uint256 lzFee = routeProcessor.estimateLayerZeroFee(
            params.destChainId,
            params.recipient,
            amount
        );
        
        require(msg.value >= lzFee, "Insufficient LZ fee");
        
        routeProcessor.executeLayerZeroOFT{value: lzFee}(
            params.sourceToken,
            amount,
            params.destChainId,
            params.recipient
        );
        
        // Refund excess fee
        if (msg.value > lzFee) {
            (bool success, ) = msg.sender.call{value: msg.value - lzFee}("");
            require(success, "Fee refund failed");
        }
    }

    function _executeStargate(
        RouteParams calldata params,
        uint256 amount
    ) internal {
        // Approve and execute Stargate transfer
        IERC20(params.sourceToken).approve(
            address(routeProcessor),
            amount
        );
        
        uint256 stargateFee = routeProcessor.estimateStargateFee(
            params.destChainId,
            params.sourceToken
        );
        
        require(msg.value >= stargateFee, "Insufficient Stargate fee");
        
        routeProcessor.executeStargate{value: stargateFee}(
            params.sourceToken,
            amount,
            params.destChainId,
            params.recipient
        );
        
        // Refund excess fee
        if (msg.value > stargateFee) {
            (bool success, ) = msg.sender.call{value: msg.value - stargateFee}("");
            require(success, "Fee refund failed");
        }
    }

    function _executeComposer(
        RouteParams calldata params,
        uint256 amount
    ) internal {
        // For cross-token routes using LayerZero Composer
        IERC20(params.sourceToken).approve(
            address(routeProcessor),
            amount
        );
        
        uint256 composerFee = routeProcessor.estimateComposerFee(
            params.destChainId,
            params.recipient,
            params.routeData
        );
        
        require(msg.value >= composerFee, "Insufficient Composer fee");
        
        routeProcessor.executeComposer{value: composerFee}(
            params.sourceToken,
            params.destToken,
            amount,
            params.destChainId,
            params.recipient,
            params.minAmountOut,
            params.routeData
        );
        
        // Refund excess fee
        if (msg.value > composerFee) {
            (bool success, ) = msg.sender.call{value: msg.value - composerFee}("");
            require(success, "Fee refund failed");
        }
    }

    function _validateRoute(RouteParams calldata params) internal view {
        require(params.amount > 0, "Invalid amount");
        require(params.recipient != address(0), "Invalid recipient");
        require(supportedChains[params.destChainId], "Unsupported chain");
        
        string memory sourceSymbol = _getTokenSymbol(params.sourceToken);
        string memory destSymbol = _getTokenSymbol(params.destToken);
        
        // Check if tokens are supported
        require(bytes(sourceSymbol).length > 0, "Source token not supported");
        require(bytes(destSymbol).length > 0, "Dest token not supported");
        
        TokenInfo memory sourceToken = tokens[sourceSymbol];
        TokenInfo memory destToken = tokens[destSymbol];
        
        require(sourceToken.isSupported, "Source token not supported");
        require(destToken.isSupported, "Dest token not supported");
        
        // Validate native deployment on destination
        require(
            _isNativeOnChain(params.destToken, params.destChainId),
            "Token not native on destination"
        );
    }

    function _determineProtocol(
        address sourceToken,
        address destToken,
        uint256 destChainId
    ) internal view returns (uint8) {
        string memory sourceSymbol = _getTokenSymbol(sourceToken);
        string memory destSymbol = _getTokenSymbol(destToken);
        
        // ALWAYS prioritize CCTP for USDC source routes
        if (keccak256(bytes(sourceSymbol)) == keccak256(bytes("USDC"))) {
            if (keccak256(bytes(sourceSymbol)) == keccak256(bytes(destSymbol))) {
                return 1; // Standard CCTP for USDC->USDC
            } else {
                return 5; // CCTP with hooks for USDC->other token
            }
        }
        
        // If destination is USDC but source isn't, still use CCTP hooks if possible
        if (keccak256(bytes(destSymbol)) == keccak256(bytes("USDC"))) {
            // For non-USDC to USDC, we need to bridge first then no swap needed
            // This would use the source token's native protocol
            if (keccak256(bytes(sourceSymbol)) == keccak256(bytes("PYUSD")) ||
                keccak256(bytes(sourceSymbol)) == keccak256(bytes("USDe")) ||
                keccak256(bytes(sourceSymbol)) == keccak256(bytes("crvUSD"))) {
                return 6; // LayerZero OFT with swap to USDC on destination
            } else if (keccak256(bytes(sourceSymbol)) == keccak256(bytes("USDT"))) {
                return 7; // Stargate with swap to USDC on destination
            }
        }
        
        // Same token routes (non-USDC)
        if (keccak256(bytes(sourceSymbol)) == keccak256(bytes(destSymbol))) {
            if (keccak256(bytes(sourceSymbol)) == keccak256(bytes("PYUSD")) ||
                keccak256(bytes(sourceSymbol)) == keccak256(bytes("USDe")) ||
                keccak256(bytes(sourceSymbol)) == keccak256(bytes("crvUSD"))) {
                return 2; // LayerZero OFT
            } else if (keccak256(bytes(sourceSymbol)) == keccak256(bytes("USDT"))) {
                return 3; // Stargate
            }
        }
        
        // Cross-token routes (neither is USDC) use LayerZero Composer
        return 4;
    }

    function _initializeTokens() internal {
        // USDC
        tokens["USDC"] = TokenInfo({
            tokenAddress: address(0), // Set per chain
            decimals: 6,
            isSupported: true,
            protocolId: 1
        });
        
        // PYUSD
        tokens["PYUSD"] = TokenInfo({
            tokenAddress: address(0),
            decimals: 6,
            isSupported: true,
            protocolId: 2
        });
        
        // USDT
        tokens["USDT"] = TokenInfo({
            tokenAddress: address(0),
            decimals: 6,
            isSupported: true,
            protocolId: 3
        });
        
        // USDe
        tokens["USDe"] = TokenInfo({
            tokenAddress: address(0),
            decimals: 18,
            isSupported: true,
            protocolId: 2
        });
        
        // crvUSD
        tokens["crvUSD"] = TokenInfo({
            tokenAddress: address(0),
            decimals: 18,
            isSupported: true,
            protocolId: 2
        });
    }

    function _initializeChains() internal {
        supportedChains[1] = true;     // Ethereum
        supportedChains[42161] = true;  // Arbitrum
        supportedChains[10] = true;     // Optimism
        supportedChains[8453] = true;   // Base
        supportedChains[137] = true;    // Polygon
        supportedChains[43114] = true;  // Avalanche
    }

    function _getTokenSymbol(address token) internal view returns (string memory) {
        // This would be implemented with actual token address mappings
        // For testing, we'll use a simple mapping based on token name
        try IERC20Metadata(token).symbol() returns (string memory symbol) {
            return symbol;
        } catch {
            return "";
        }
    }

    function _isNativeOnChain(address token, uint256 chainId) internal view returns (bool) {
        // Check if token is natively deployed on destination chain
        string memory symbol = _getTokenSymbol(token);
        
        // USDC is native on all chains
        if (keccak256(bytes(symbol)) == keccak256(bytes("USDC"))) {
            return true;
        }
        
        // PYUSD is only native on Ethereum and Optimism
        if (keccak256(bytes(symbol)) == keccak256(bytes("PYUSD"))) {
            return chainId == 1 || chainId == 10;
        }
        
        // USDe is native on Ethereum, Arbitrum, Optimism, Base
        if (keccak256(bytes(symbol)) == keccak256(bytes("USDe"))) {
            return chainId == 1 || chainId == 42161 || chainId == 10 || chainId == 8453;
        }
        
        // crvUSD is native on Ethereum, Arbitrum, Optimism
        if (keccak256(bytes(symbol)) == keccak256(bytes("crvUSD"))) {
            return chainId == 1 || chainId == 42161 || chainId == 10;
        }
        
        // USDT is native on all chains except Base
        if (keccak256(bytes(symbol)) == keccak256(bytes("USDT"))) {
            return chainId != 8453;
        }
        
        return false;
    }

    function _executeCCTPWithHooks(
        RouteParams calldata params,
        uint256 amount
    ) internal {
        // CCTP with hooks for USDC to other token swaps
        IERC20(params.sourceToken).approve(
            address(routeProcessor),
            amount
        );
        
        // No additional fee needed for CCTP
        routeProcessor.executeCCTPWithHooks(
            params.sourceToken,
            params.destToken,
            amount,
            params.destChainId,
            params.recipient,
            params.minAmountOut,
            params.routeData
        );
    }

    function _executeOFTWithSwap(
        RouteParams calldata params,
        uint256 amount
    ) internal {
        // LayerZero OFT bridge followed by swap to USDC
        IERC20(params.sourceToken).approve(
            address(routeProcessor),
            amount
        );
        
        uint256 lzFee = routeProcessor.estimateLayerZeroFee(
            params.destChainId,
            params.recipient,
            amount
        );
        
        require(msg.value >= lzFee, "Insufficient LZ fee");
        
        routeProcessor.executeOFTWithSwap{value: lzFee}(
            params.sourceToken,
            params.destToken,
            amount,
            params.destChainId,
            params.recipient,
            params.minAmountOut,
            params.routeData
        );
        
        // Refund excess fee
        if (msg.value > lzFee) {
            (bool success, ) = msg.sender.call{value: msg.value - lzFee}("");
            require(success, "Fee refund failed");
        }
    }

    function _executeStargateWithSwap(
        RouteParams calldata params,
        uint256 amount
    ) internal {
        // Stargate bridge followed by swap to USDC
        IERC20(params.sourceToken).approve(
            address(routeProcessor),
            amount
        );
        
        uint256 stargateFee = routeProcessor.estimateStargateFee(
            params.destChainId,
            params.sourceToken
        );
        
        require(msg.value >= stargateFee, "Insufficient Stargate fee");
        
        routeProcessor.executeStargateWithSwap{value: stargateFee}(
            params.sourceToken,
            params.destToken,
            amount,
            params.destChainId,
            params.recipient,
            params.minAmountOut,
            params.routeData
        );
        
        // Refund excess fee
        if (msg.value > stargateFee) {
            (bool success, ) = msg.sender.call{value: msg.value - stargateFee}("");
            require(success, "Fee refund failed");
        }
    }

    function _generateRouteId(RouteParams calldata params) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                msg.sender,
                params.sourceToken,
                params.destToken,
                params.amount,
                params.destChainId,
                block.timestamp
            )
        );
    }

    function updateProtocols(
        address _routeProcessor,
        address _swapExecutor,
        address _feeManager
    ) external onlyOwner {
        routeProcessor = IRouteProcessor(_routeProcessor);
        swapExecutor = ISwapExecutor(_swapExecutor);
        feeManager = IFeeManager(_feeManager);
        
        emit ProtocolsUpdated(_routeProcessor, _swapExecutor, _feeManager);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    receive() external payable {}
}