// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IInvoiceRegistrar} from "./interfaces/IInvoiceRegistrar.sol";
import {ETH_NODE, Grant, ResolverRoles, State, Status} from "./interfaces/ens/EnsV2Types.sol";
import {IPermissionedResolver} from "./interfaces/ens/IPermissionedResolver.sol";
import {ITextResolver} from "./interfaces/ens/ITextResolver.sol";
import {IUserRegistry} from "./interfaces/ens/IUserRegistry.sol";
import {IVerifiableFactory} from "./interfaces/ens/IVerifiableFactory.sol";

/// @notice Extension to the frozen `IInvoiceRegistrar`: revives the expired name of an unpaid invoice.
interface IInvoiceRegistrarOverdue {
    event InvoiceNameRevived(uint256 indexed invoiceId, uint64 expiry);

    function reviveOverdue(uint256 invoiceId, uint64 newExpiry) external; // onlyMarket: renew, then status = "overdue"
}

/// @notice Issues `inv-<id>.<parent>.eth` on our ENSv2 UserRegistry for every invoice, with
/// `expiry = dueDate`, so the name lives only as long as the debt is current. Each invoice gets
/// its own PermissionedResolver: this contract holds root `ROLE_SET_TEXT` (+ admin, never
/// `ROLE_UPGRADE`) and the debtor's accountant is granted `ROLE_SET_TEXT` on the `ack` key only.
/// Records are always read through the stored resolver (path R), because the registry stops
/// returning it once the name expires or is unregistered.
contract InvoiceRegistrar is IInvoiceRegistrar, IInvoiceRegistrarOverdue {
    uint256 constant RESOLVER_ROOT_ROLES = ResolverRoles.ROLE_SET_TEXT | ResolverRoles.ROLE_SET_TEXT_ADMIN;

    IUserRegistry public immutable REGISTRY;
    IVerifiableFactory public immutable FACTORY;
    address public immutable RESOLVER_IMPL;
    bytes32 public immutable PARENT_NODE;
    string public PARENT_LABEL;

    address public immutable admin;
    address public market;

    mapping(uint256 => address) private _resolverOf;

    error NotMarket();
    error NotAdmin();
    error MarketAlreadySet();
    error AlreadyRegistered();
    error UnknownInvoice();
    error BadRecords();
    error NameStillLive();

    modifier onlyMarket() {
        if (msg.sender != market) revert NotMarket();
        _;
    }

    constructor(
        IUserRegistry registry,
        IVerifiableFactory factory,
        address resolverImpl,
        string memory parentLabel,
        address admin_
    ) {
        REGISTRY = registry;
        FACTORY = factory;
        RESOLVER_IMPL = resolverImpl;
        PARENT_LABEL = parentLabel;
        PARENT_NODE = keccak256(abi.encodePacked(ETH_NODE, keccak256(bytes(parentLabel))));
        admin = admin_;
    }

    function setMarket(address market_) external {
        if (msg.sender != admin) revert NotAdmin();
        if (market != address(0)) revert MarketAlreadySet();
        market = market_;
    }

    /// @dev E5–E7. The records are written inside `initialize`, where the resolver skips role
    /// checks. The `ack` grant has to be a separate call: during `initialize` the caller is the
    /// factory, which holds no admin role.
    function registerInvoice(
        uint256 invoiceId,
        address issuer,
        address accountant,
        uint64 dueDate,
        string[] calldata keys,
        string[] calldata values
    ) external onlyMarket returns (address resolver) {
        if (keys.length != values.length) revert BadRecords();
        if (_resolverOf[invoiceId] != address(0)) revert AlreadyRegistered();

        resolver = _deployResolver(invoiceId, keys, values);
        _resolverOf[invoiceId] = resolver;

        // The resolver keeps only the selector and key of the setter, so the name is left empty.
        IPermissionedResolver(resolver).grantSetterRoles(
            abi.encodeCall(IPermissionedResolver.setText, (bytes(""), "ack", "")), accountant
        );

        // roleBitmap 0: the issuer owns the name but cannot transfer it or change its resolver.
        string memory label = labelOf(invoiceId);
        REGISTRY.register(label, issuer, address(0), resolver, 0, dueDate);

        emit InvoiceNameRegistered(invoiceId, label, resolver, dueDate);
    }

    function setStatus(uint256 invoiceId, string calldata status) external onlyMarket {
        _setStatus(invoiceId, status);
    }

    /// @dev An expired name cannot be unregistered (`LabelExpired`), so only a live one is.
    function closeInvoice(uint256 invoiceId, string calldata finalStatus) external onlyMarket {
        _setStatus(invoiceId, finalStatus);
        bool live = isLive(invoiceId);
        if (live) REGISTRY.unregister(_labelId(invoiceId));
        emit InvoiceNameClosed(invoiceId, finalStatus, live);
    }

    /// @dev `renew` on an expired name restores it with the same owner and roles (it cannot
    /// reduce expiry), and the resolver storage was never touched, so only `status` changes.
    function reviveOverdue(uint256 invoiceId, uint64 newExpiry) external onlyMarket {
        address resolver = _resolverOrRevert(invoiceId);
        if (isLive(invoiceId)) revert NameStillLive();
        REGISTRY.renew(_labelId(invoiceId), newExpiry);
        IPermissionedResolver(resolver).setText(dnsNameOf(invoiceId), "status", "overdue");
        emit InvoiceNameRevived(invoiceId, newExpiry);
        emit InvoiceStatusSet(invoiceId, "overdue");
    }

    /// @dev Path L.
    function isLive(uint256 invoiceId) public view returns (bool) {
        State memory s = REGISTRY.getState(_labelId(invoiceId));
        return s.status == Status.REGISTERED && block.timestamp < s.expiry;
    }

    function statusOf(uint256 invoiceId) external view returns (string memory) {
        return _text(invoiceId, "status");
    }

    function ackOf(uint256 invoiceId) external view returns (string memory) {
        return _text(invoiceId, "ack");
    }

    /// @dev Path R: one `resolve(name, multicall(8 × text))`. A failed sub-call does not revert
    /// the multicall; its revert data lands in `results[i]` and reads as "".
    function recordsOf(uint256 invoiceId) external view returns (string[8] memory records) {
        address resolver = _resolverOrRevert(invoiceId);
        bytes32 node = nodeOf(invoiceId);
        string[8] memory keys = ["amount", "currency", "debtor", "dueDate", "status", "ack", "tokenId", "issuer"];
        bytes[] memory reads = new bytes[](8);
        for (uint256 i; i < 8; ++i) {
            reads[i] = abi.encodeCall(ITextResolver.text, (node, keys[i]));
        }
        bytes[] memory results = abi.decode(
            IPermissionedResolver(resolver).resolve(dnsNameOf(invoiceId), abi.encodeCall(ITextResolver.multicall, (reads))),
            (bytes[])
        );
        for (uint256 i; i < 8 && i < results.length; ++i) {
            records[i] = _decodeString(results[i]);
        }
    }

    function resolverOf(uint256 invoiceId) external view returns (address) {
        return _resolverOf[invoiceId];
    }

    function labelOf(uint256 invoiceId) public pure returns (string memory) {
        return string.concat("inv-", Strings.toString(invoiceId));
    }

    function nameOf(uint256 invoiceId) external view returns (string memory) {
        return string.concat(labelOf(invoiceId), ".", PARENT_LABEL, ".eth");
    }

    /// @dev DNS wire format: length-prefixed labels and a trailing zero byte.
    function dnsNameOf(uint256 invoiceId) public view returns (bytes memory) {
        bytes memory label = bytes(labelOf(invoiceId));
        bytes memory parent = bytes(PARENT_LABEL);
        return abi.encodePacked(uint8(label.length), label, uint8(parent.length), parent, uint8(3), "eth", uint8(0));
    }

    function nodeOf(uint256 invoiceId) public view returns (bytes32) {
        return keccak256(abi.encodePacked(PARENT_NODE, keccak256(bytes(labelOf(invoiceId)))));
    }

    function _deployResolver(uint256 invoiceId, string[] calldata keys, string[] calldata values)
        private
        returns (address)
    {
        bytes memory dnsName = dnsNameOf(invoiceId);
        Grant[] memory grants = new Grant[](1);
        grants[0] = Grant({account: address(this), roleBitmap: RESOLVER_ROOT_ROLES});
        bytes[] memory calls = new bytes[](keys.length);
        for (uint256 i; i < keys.length; ++i) {
            calls[i] = abi.encodeCall(IPermissionedResolver.setText, (dnsName, keys[i], values[i]));
        }
        return FACTORY.deployProxy(
            RESOLVER_IMPL,
            uint256(keccak256(abi.encode(invoiceId))),
            abi.encodeCall(IPermissionedResolver.initialize, (grants, calls))
        );
    }

    function _setStatus(uint256 invoiceId, string calldata status) private {
        IPermissionedResolver(_resolverOrRevert(invoiceId)).setText(dnsNameOf(invoiceId), "status", status);
        emit InvoiceStatusSet(invoiceId, status);
    }

    /// @dev The resolver ignores the node inside `text(node, key)` and uses `namehash(name)`.
    function _text(uint256 invoiceId, string memory key) private view returns (string memory) {
        address resolver = _resolverOrRevert(invoiceId);
        bytes memory ret = IPermissionedResolver(resolver).resolve(
            dnsNameOf(invoiceId), abi.encodeCall(ITextResolver.text, (nodeOf(invoiceId), key))
        );
        return abi.decode(ret, (string));
    }

    function _resolverOrRevert(uint256 invoiceId) private view returns (address resolver) {
        resolver = _resolverOf[invoiceId];
        if (resolver == address(0)) revert UnknownInvoice();
    }

    /// @dev `anyId` for the registry: the labelhash.
    function _labelId(uint256 invoiceId) private pure returns (uint256) {
        return uint256(keccak256(bytes(labelOf(invoiceId))));
    }

    /// @dev Decodes an ABI-encoded string, or returns "" when `data` is not one (e.g. revert data).
    function _decodeString(bytes memory data) private pure returns (string memory) {
        if (data.length < 64) return "";
        uint256 offset;
        uint256 len;
        assembly {
            offset := mload(add(data, 0x20))
            len := mload(add(data, 0x40))
        }
        if (offset != 0x20 || len > data.length - 64) return "";
        return abi.decode(data, (string));
    }
}
