// SPDX-License-Identifier: MIT
// Generated from ensdomains/contracts-v2 tag sepolia-deployment-2026-09-15 (f2f0a05e) deployments/sepolia/VerifiableFactory.json
pragma solidity ^0.8.26;

/// @dev CREATE2 salt is `keccak256(abi.encode(msg.sender, salt))`; `data` is delegatecalled on the implementation with the factory as `msg.sender`.
interface IVerifiableFactory {
    event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation);

    function deployProxy(address implementation, uint256 salt, bytes calldata data) external returns (address proxy);
    function verifyContract(address proxy) external view returns (address implementation);
}
