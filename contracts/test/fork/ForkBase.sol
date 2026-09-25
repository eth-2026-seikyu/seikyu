// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {Grant, RegistryRoles} from "../../src/interfaces/ens/EnsV2Types.sol";
import {IUserRegistry} from "../../src/interfaces/ens/IUserRegistry.sol";
import {IVerifiableFactory} from "../../src/interfaces/ens/IVerifiableFactory.sol";

/// @notice Contract-context caller standing in for InvoiceRegistrar. Forwards calls and reports the gas each one used.
contract RegistrarStub {
    struct Call {
        address target;
        bytes data;
    }

    function exec(address target, bytes calldata data) public returns (bytes memory ret, uint256 gasUsed) {
        require(target.code.length > 0, "RegistrarStub: no code at target");
        uint256 start = gasleft();
        bool ok;
        (ok, ret) = target.call(data);
        gasUsed = start - gasleft();
        if (!ok) {
            assembly {
                revert(add(ret, 32), mload(ret))
            }
        }
    }

    function execBatch(Call[] calldata calls) external returns (bytes[] memory rets, uint256[] memory gasUsed) {
        rets = new bytes[](calls.length);
        gasUsed = new uint256[](calls.length);
        for (uint256 i; i < calls.length; ++i) {
            (rets[i], gasUsed[i]) = exec(calls[i].target, calls[i].data);
        }
    }
}

/// @notice Sepolia fork fixture: our own UserRegistry proxy deployed through the real ENSv2 VerifiableFactory.
/// @dev Run with `--fork-url $SEPOLIA_RPC_URL --fork-block-number $FORK_BLOCK`.
abstract contract ForkBase is Test {
    uint256 internal constant SEPOLIA_CHAIN_ID = 11155111;

    IVerifiableFactory internal constant FACTORY = IVerifiableFactory(0x9e726Eb570beb6BCEb495AB8cdA7df517d4e841C);
    address internal constant USER_REGISTRY_IMPL = 0xA80338aAA8D23831cEa25E858D1774534aBb0263;
    address internal constant PERMISSIONED_RESOLVER_IMPL = 0x14F09Fd05d4585759e54844DC9B00147131Cf243;

    uint256 internal constant REGISTRY_SALT = uint256(keccak256("seikyu.userRegistry"));

    address internal testDeployer = makeAddr("testDeployer");
    RegistrarStub internal registrarStub;
    IUserRegistry internal registry;

    function setUp() public virtual {
        require(block.chainid == SEPOLIA_CHAIN_ID, "ForkBase: run with --fork-url <sepolia>");
        require(USER_REGISTRY_IMPL.code.length > 0, "ForkBase: UserRegistryImpl missing at fork block");

        Grant[] memory grants = new Grant[](1);
        grants[0] = Grant({account: testDeployer, roleBitmap: RegistryRoles.DEPLOYER_ADMIN_ONLY});
        vm.prank(testDeployer);
        registry = IUserRegistry(
            FACTORY.deployProxy(USER_REGISTRY_IMPL, REGISTRY_SALT, abi.encodeCall(IUserRegistry.initialize, (grants)))
        );

        registrarStub = new RegistrarStub();
        vm.prank(testDeployer);
        registry.grantRootRoles(RegistryRoles.REGISTRAR_ROOT, address(registrarStub));

        vm.label(address(registry), "UserRegistry(proxy)");
        vm.label(address(registrarStub), "RegistrarStub");
        vm.label(address(FACTORY), "VerifiableFactory");
    }

    /// @dev DNS wire format: "a.bc" => 0x01 'a' 0x02 'b' 'c' 0x00.
    function dnsEncode(string memory name) internal pure returns (bytes memory out) {
        bytes memory s = bytes(name);
        out = new bytes(s.length + 2);
        uint256 labelStart;
        uint256 lenPos;
        for (uint256 i; i <= s.length; ++i) {
            if (i == s.length || s[i] == ".") {
                uint256 len = i - labelStart;
                require(len > 0 && len < 256, "dnsEncode: bad label");
                out[lenPos] = bytes1(uint8(len));
                for (uint256 j; j < len; ++j) {
                    out[lenPos + 1 + j] = s[labelStart + j];
                }
                lenPos += len + 1;
                labelStart = i + 1;
            }
        }
    }

    /// @dev ENSIP-1 namehash of a DNS-encoded name.
    function namehash(bytes memory dnsName) internal pure returns (bytes32) {
        return _namehash(dnsName, 0);
    }

    function labelhash(string memory label) internal pure returns (uint256) {
        return uint256(keccak256(bytes(label)));
    }

    function _namehash(bytes memory dnsName, uint256 offset) private pure returns (bytes32) {
        uint256 len = uint8(dnsName[offset]);
        if (len == 0) {
            return bytes32(0);
        }
        bytes memory label = new bytes(len);
        for (uint256 i; i < len; ++i) {
            label[i] = dnsName[offset + 1 + i];
        }
        return keccak256(abi.encodePacked(_namehash(dnsName, offset + 1 + len), keccak256(label)));
    }
}
