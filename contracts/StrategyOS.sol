// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * StrategyOS — on-chain registry for strategies, executions, and creator royalties.
 * Deploy on ValueChain (chainId 286623 mainnet / 138565 testnet).
 *
 * Fee flow:
 *  - Caller pays ACTIVATION_FEE in SOSO when activating a strategy
 *  - On each execution, EXECUTION_FEE is charged and split:
 *      70% → strategy creator
 *      20% → module creators (split equally among modules used)
 *      10% → protocol treasury
 */
contract StrategyOS {

    // ─── Types ───────────────────────────────────────────────────────────────

    struct Execution {
        bytes32  strategyId;
        uint256  timestamp;
        int256   sentiment;
        bool     riskPass;
        bytes32  tradeId;
        bool     success;
        uint256  feeCharged;
    }

    struct Strategy {
        address  creator;
        bytes32  strategyId;
        bool     active;
        uint256  totalExecutions;
        uint256  totalFeesEarned;
        address[] moduleCreators;   // ordered list of module creator addresses
        uint256  registeredAt;
    }

    // ─── State ───────────────────────────────────────────────────────────────

    IERC20 public sosoToken;
    address public treasury;
    address public operator;          // backend hot wallet allowed to log executions

    uint256 public ACTIVATION_FEE  = 1e18;   // 1 SOSO to activate
    uint256 public EXECUTION_FEE   = 1e17;   // 0.1 SOSO per execution logged

    mapping(bytes32 => Strategy)    public strategies;
    mapping(bytes32 => Execution[]) public executions;
    mapping(address => uint256)     public creatorEarnings;  // claimable SOSO per address
    mapping(address => uint256)     public totalClaimed;

    bytes32[] public allStrategyIds;

    // ─── Events ──────────────────────────────────────────────────────────────

    event StrategyRegistered(bytes32 indexed strategyId, address indexed creator, address[] moduleCreators);
    event StrategyActivated(bytes32 indexed strategyId);
    event StrategyPaused(bytes32 indexed strategyId);
    event ExecutionLogged(
        bytes32 indexed strategyId,
        uint256 timestamp,
        int256  sentiment,
        bool    riskPass,
        bytes32 tradeId,
        bool    success,
        uint256 feeCharged
    );
    event RoyaltyClaimed(address indexed creator, uint256 amount);
    event FeeUpdated(uint256 activationFee, uint256 executionFee);

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == treasury, "Not operator");
        _;
    }

    modifier onlyCreator(bytes32 strategyId) {
        require(strategies[strategyId].creator == msg.sender, "Not strategy creator");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address _sosoToken, address _treasury) {
        sosoToken = IERC20(_sosoToken);
        treasury  = _treasury;
        operator  = msg.sender;
    }

    // ─── Strategy Registration ────────────────────────────────────────────────

    /**
     * Register a strategy on-chain. Creator pays ACTIVATION_FEE in SOSO.
     * moduleCreators: list of wallet addresses for each module used.
     */
    function registerStrategy(
        bytes32 strategyId,
        address[] calldata moduleCreators
    ) external {
        require(strategies[strategyId].creator == address(0), "Strategy already registered");
        require(moduleCreators.length > 0 && moduleCreators.length <= 10, "1-10 modules required");

        // Collect activation fee
        require(
            sosoToken.transferFrom(msg.sender, address(this), ACTIVATION_FEE),
            "SOSO fee transfer failed"
        );

        strategies[strategyId] = Strategy({
            creator:          msg.sender,
            strategyId:       strategyId,
            active:           false,
            totalExecutions:  0,
            totalFeesEarned:  0,
            moduleCreators:   moduleCreators,
            registeredAt:     block.timestamp
        });

        allStrategyIds.push(strategyId);

        // Activation fee goes to treasury
        sosoToken.transfer(treasury, ACTIVATION_FEE);

        emit StrategyRegistered(strategyId, msg.sender, moduleCreators);
    }

    function activateStrategy(bytes32 strategyId) external onlyCreator(strategyId) {
        strategies[strategyId].active = true;
        emit StrategyActivated(strategyId);
    }

    function pauseStrategy(bytes32 strategyId) external onlyCreator(strategyId) {
        strategies[strategyId].active = false;
        emit StrategyPaused(strategyId);
    }

    // ─── Execution Logging ────────────────────────────────────────────────────

    /**
     * Log an execution. Called by backend operator hot wallet.
     * Distributes EXECUTION_FEE from contract balance (pre-funded by protocol).
     * Fee split: 70% creator | 20% module creators | 10% treasury
     */
    function logExecution(
        bytes32 strategyId,
        int256  sentiment,
        bool    riskPass,
        bytes32 tradeId,
        bool    success
    ) external onlyOperator {
        Strategy storage strat = strategies[strategyId];

        uint256 fee = 0;
        if (strat.creator != address(0) && sosoToken.balanceOf(address(this)) >= EXECUTION_FEE) {
            fee = EXECUTION_FEE;
            _distributeFee(strat);
        }

        Execution memory exec = Execution({
            strategyId:  strategyId,
            timestamp:   block.timestamp,
            sentiment:   sentiment,
            riskPass:    riskPass,
            tradeId:     tradeId,
            success:     success,
            feeCharged:  fee
        });

        executions[strategyId].push(exec);
        strat.totalExecutions += 1;
        strat.totalFeesEarned += fee;

        emit ExecutionLogged(strategyId, block.timestamp, sentiment, riskPass, tradeId, success, fee);
    }

    function _distributeFee(Strategy storage strat) internal {
        uint256 fee = EXECUTION_FEE;
        uint256 creatorCut  = (fee * 70) / 100;
        uint256 moduleCut   = (fee * 20) / 100;
        uint256 treasuryCut = fee - creatorCut - moduleCut;

        creatorEarnings[strat.creator] += creatorCut;

        if (strat.moduleCreators.length > 0) {
            uint256 perModule = moduleCut / strat.moduleCreators.length;
            for (uint256 i = 0; i < strat.moduleCreators.length; i++) {
                creatorEarnings[strat.moduleCreators[i]] += perModule;
            }
        } else {
            treasuryCut += moduleCut;
        }

        sosoToken.transfer(treasury, treasuryCut);
    }

    // ─── Royalty Claims ───────────────────────────────────────────────────────

    function claimEarnings() external {
        uint256 amount = creatorEarnings[msg.sender];
        require(amount > 0, "Nothing to claim");
        require(sosoToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");

        creatorEarnings[msg.sender] = 0;
        totalClaimed[msg.sender] += amount;

        sosoToken.transfer(msg.sender, amount);
        emit RoyaltyClaimed(msg.sender, amount);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getExecutions(bytes32 strategyId) external view returns (Execution[] memory) {
        return executions[strategyId];
    }

    function getExecutionCount(bytes32 strategyId) external view returns (uint256) {
        return executions[strategyId].length;
    }

    function getStrategy(bytes32 strategyId) external view returns (Strategy memory) {
        return strategies[strategyId];
    }

    function getPendingEarnings(address creator) external view returns (uint256) {
        return creatorEarnings[creator];
    }

    function getAllStrategyCount() external view returns (uint256) {
        return allStrategyIds.length;
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    function setOperator(address _operator) external {
        require(msg.sender == treasury, "Only treasury");
        operator = _operator;
    }

    function setFees(uint256 _activationFee, uint256 _executionFee) external {
        require(msg.sender == treasury, "Only treasury");
        ACTIVATION_FEE = _activationFee;
        EXECUTION_FEE  = _executionFee;
        emit FeeUpdated(_activationFee, _executionFee);
    }

    // Fund the contract with SOSO to pay out execution royalties
    function fundContract(uint256 amount) external {
        require(sosoToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }
}
