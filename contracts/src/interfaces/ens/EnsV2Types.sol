// SPDX-License-Identifier: MIT
// Generated from ensdomains/contracts-v2 tag sepolia-deployment-2026-09-15 (f2f0a05e) deployments/sepolia/UserRegistryImpl.json + PermissionedResolverImpl.json
// Role values vendored from src/registry/libraries/RegistryRolesLib.sol and src/resolver/libraries/PermissionedResolverLib.sol at the same tag.
pragma solidity ^0.8.26;

/// @dev Root-resource grant passed to `initialize` on UserRegistry and PermissionedResolver. Field order matters for ABI encoding.
struct Grant {
    address account;
    uint256 roleBitmap;
}

/// @dev `IPermissionedRegistry.Status`.
enum Status {
    AVAILABLE,
    RESERVED,
    REGISTERED
}

/// @dev `IPermissionedRegistry.State` as returned by `getState(anyId)`.
struct State {
    Status status;
    uint64 expiry;
    address latestOwner;
    uint256 tokenId;
    uint256 resource;
}

/// @dev namehash("eth").
bytes32 constant ETH_NODE = 0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae;

/// @dev EnhancedAccessControl root resource.
uint256 constant ROOT_RESOURCE = 0;

/// @dev Registry roles (RegistryRolesLib). Each role is one nybble; the admin variant is shifted 128 bits higher.
library RegistryRoles {
    uint256 internal constant ROLE_REGISTRAR = 1 << 0;
    uint256 internal constant ROLE_REGISTRAR_ADMIN = ROLE_REGISTRAR << 128;
    uint256 internal constant ROLE_REGISTER_RESERVED = 1 << 4;
    uint256 internal constant ROLE_REGISTER_RESERVED_ADMIN = ROLE_REGISTER_RESERVED << 128;
    uint256 internal constant ROLE_SET_PARENT = 1 << 8;
    uint256 internal constant ROLE_SET_PARENT_ADMIN = ROLE_SET_PARENT << 128;
    uint256 internal constant ROLE_UNREGISTER = 1 << 12;
    uint256 internal constant ROLE_UNREGISTER_ADMIN = ROLE_UNREGISTER << 128;
    uint256 internal constant ROLE_RENEW = 1 << 16;
    uint256 internal constant ROLE_RENEW_ADMIN = ROLE_RENEW << 128;
    uint256 internal constant ROLE_SET_SUBREGISTRY = 1 << 20;
    uint256 internal constant ROLE_SET_SUBREGISTRY_ADMIN = ROLE_SET_SUBREGISTRY << 128;
    uint256 internal constant ROLE_SET_RESOLVER = 1 << 24;
    uint256 internal constant ROLE_SET_RESOLVER_ADMIN = ROLE_SET_RESOLVER << 128;
    uint256 internal constant ROLE_CAN_TRANSFER_ADMIN = (1 << 28) << 128;
    uint256 internal constant ROLE_WAS_RESERVED = 1 << 32;
    uint256 internal constant ROLE_SET_URI = 1 << 36;
    uint256 internal constant ROLE_SET_URI_ADMIN = ROLE_SET_URI << 128;
    uint256 internal constant ROLE_CAN_NAME = 1 << 120;
    uint256 internal constant ROLE_CAN_NAME_ADMIN = ROLE_CAN_NAME << 128;
    uint256 internal constant ROLE_UPGRADE = 1 << 124;
    uint256 internal constant ROLE_UPGRADE_ADMIN = ROLE_UPGRADE << 128;

    /// @dev Deployer grant on our UserRegistry: can grant/revoke registrar, renew and unregister, but cannot use them.
    uint256 internal constant DEPLOYER_ADMIN_ONLY = ROLE_REGISTRAR_ADMIN | ROLE_RENEW_ADMIN | ROLE_UNREGISTER_ADMIN;
    /// @dev Root grant for InvoiceRegistrar on our UserRegistry.
    uint256 internal constant REGISTRAR_ROOT = ROLE_REGISTRAR | ROLE_RENEW | ROLE_UNREGISTER;
}

/// @dev PermissionedResolver roles (PermissionedResolverLib).
library ResolverRoles {
    uint256 internal constant ROLE_SET_ADDRESS = 1 << 0;
    uint256 internal constant ROLE_SET_ADDRESS_ADMIN = ROLE_SET_ADDRESS << 128;
    uint256 internal constant ROLE_SET_TEXT = 1 << 4;
    uint256 internal constant ROLE_SET_TEXT_ADMIN = ROLE_SET_TEXT << 128;
    uint256 internal constant ROLE_SET_CONTENTHASH = 1 << 8;
    uint256 internal constant ROLE_SET_CONTENTHASH_ADMIN = ROLE_SET_CONTENTHASH << 128;
    uint256 internal constant ROLE_SET_ABI = 1 << 12;
    uint256 internal constant ROLE_SET_ABI_ADMIN = ROLE_SET_ABI << 128;
    uint256 internal constant ROLE_SET_INTERFACE = 1 << 16;
    uint256 internal constant ROLE_SET_INTERFACE_ADMIN = ROLE_SET_INTERFACE << 128;
    uint256 internal constant ROLE_SET_NAME = 1 << 20;
    uint256 internal constant ROLE_SET_NAME_ADMIN = ROLE_SET_NAME << 128;
    uint256 internal constant ROLE_SET_DATA = 1 << 24;
    uint256 internal constant ROLE_SET_DATA_ADMIN = ROLE_SET_DATA << 128;
    uint256 internal constant ROLE_LINK = 1 << 28;
    uint256 internal constant ROLE_LINK_ADMIN = ROLE_LINK << 128;
    uint256 internal constant ROLE_CAN_NAME = 1 << 120;
    uint256 internal constant ROLE_CAN_NAME_ADMIN = ROLE_CAN_NAME << 128;
    uint256 internal constant ROLE_UPGRADE = 1 << 124;
    uint256 internal constant ROLE_UPGRADE_ADMIN = ROLE_UPGRADE << 128;

    /// @dev Setter scope for a text key: `keccak256(bytes(key))`. The name argument of the setter is ignored.
    function textResource(string memory key) internal pure returns (uint256) {
        return uint256(keccak256(bytes(key)));
    }
}
