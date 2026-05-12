// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ExecutionLog {
    struct Execution {
        bytes32 strategyId;
        uint256 timestamp;
        int256 sentiment;
        bool riskPass;
        bytes32 tradeId;
        bool success;
    }

    mapping(bytes32 => Execution[]) public executions;

    event ExecutionLogged(
        bytes32 indexed strategyId,
        uint256 timestamp,
        int256 sentiment,
        bool riskPass,
        bytes32 tradeId,
        bool success
    );

    function logExecution(
        bytes32 strategyId,
        int256 sentiment,
        bool riskPass,
        bytes32 tradeId,
        bool success
    ) external {
        Execution memory exec = Execution(
            strategyId,
            block.timestamp,
            sentiment,
            riskPass,
            tradeId,
            success
        );

        executions[strategyId].push(exec);

        emit ExecutionLogged(
            strategyId,
            block.timestamp,
            sentiment,
            riskPass,
            tradeId,
            success
        );
    }

    function getExecutions(bytes32 strategyId)
        external
        view
        returns (Execution[] memory)
    {
        return executions[strategyId];
    }

    function getExecutionCount(bytes32 strategyId)
        external
        view
        returns (uint256)
    {
        return executions[strategyId].length;
    }
}
