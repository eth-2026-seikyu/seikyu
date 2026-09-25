// SPDX-License-Identifier: MIT
// Generated from ensdomains/contracts-v2 tag sepolia-deployment-2026-09-15 (f2f0a05e) deployments/sepolia/ETHRegistrar.json
pragma solidity ^0.8.26;

/// @dev Subset of ETHRegistrar used to register the parent `.eth` name (ERC-20 payment).
interface IETHRegistrar {
    error CommitmentTooNew(bytes32 commitment, uint64 validFrom, uint64 blockTimestamp);
    error CommitmentTooOld(bytes32 commitment, uint64 validTo, uint64 blockTimestamp);
    error DurationTooShort(uint64 duration, uint64 minDuration);
    error NameNotAvailable(string label);

    function commit(bytes32 commitment) external;
    function register(
        string calldata label,
        address owner,
        bytes32 secret,
        address subregistry,
        address resolver,
        uint64 duration,
        address paymentToken,
        bytes32 referrer
    ) external returns (uint256 tokenId);
    function makeCommitment(
        string calldata label,
        address owner,
        bytes32 secret,
        address subregistry,
        address resolver,
        uint64 duration,
        bytes32 referrer
    ) external pure returns (bytes32);
    function getRegisterPrice(string calldata label, uint64 duration, address paymentToken)
        external
        view
        returns (uint256 base, uint256 premium);
    function isAvailable(string calldata label) external view returns (bool);
    function commitmentAt(bytes32 commitment) external view returns (uint64 commitTime);
    function MIN_COMMITMENT_AGE() external view returns (uint64);
    function MAX_COMMITMENT_AGE() external view returns (uint64);
    function MIN_REGISTER_DURATION() external view returns (uint64);
}
