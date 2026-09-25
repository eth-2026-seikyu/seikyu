//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IPermissionedResolver
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iPermissionedResolverAbi = [
  {
    type: 'function',
    inputs: [{ name: 'node', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getRecordId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'setter', internalType: 'bytes', type: 'bytes' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'grantSetterRoles',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'resource', internalType: 'uint256', type: 'uint256' },
      { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'hasRoles',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'hasRootRoles',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'grants',
        internalType: 'struct Grant[]',
        type: 'tuple[]',
        components: [
          { name: 'account', internalType: 'address', type: 'address' },
          { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'calls', internalType: 'bytes[]', type: 'bytes[]' },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'calls', internalType: 'bytes[]', type: 'bytes[]' }],
    name: 'multicall',
    outputs: [{ name: 'results', internalType: 'bytes[]', type: 'bytes[]' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'name', internalType: 'bytes', type: 'bytes' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'resolve',
    outputs: [{ name: '', internalType: 'bytes', type: 'bytes' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'resource', internalType: 'uint256', type: 'uint256' },
      { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'revokeRoles',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'resource', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'roles',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'name', internalType: 'bytes', type: 'bytes' },
      { name: 'key', internalType: 'string', type: 'string' },
      { name: 'value', internalType: 'string', type: 'string' },
    ],
    name: 'setText',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'error',
    inputs: [{ name: 'dns', internalType: 'bytes', type: 'bytes' }],
    name: 'DNSDecodingFailed',
  },
  {
    type: 'error',
    inputs: [
      { name: 'resource', internalType: 'uint256', type: 'uint256' },
      { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'EACCannotGrantRoles',
  },
  {
    type: 'error',
    inputs: [
      { name: 'resource', internalType: 'uint256', type: 'uint256' },
      { name: 'role', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'EACMaxAssignees',
  },
  {
    type: 'error',
    inputs: [
      { name: 'resource', internalType: 'uint256', type: 'uint256' },
      { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'EACUnauthorizedAccountRoles',
  },
  {
    type: 'error',
    inputs: [{ name: 'selector', internalType: 'bytes4', type: 'bytes4' }],
    name: 'UnsupportedResolverProfile',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IUserRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iUserRegistryAbi = [
  {
    type: 'function',
    inputs: [{ name: 'anyId', internalType: 'uint256', type: 'uint256' }],
    name: 'getExpiry',
    outputs: [{ name: '', internalType: 'uint64', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'label', internalType: 'string', type: 'string' }],
    name: 'getResolver',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'anyId', internalType: 'uint256', type: 'uint256' }],
    name: 'getState',
    outputs: [
      {
        name: '',
        internalType: 'struct State',
        type: 'tuple',
        components: [
          { name: 'status', internalType: 'enum Status', type: 'uint8' },
          { name: 'expiry', internalType: 'uint64', type: 'uint64' },
          { name: 'latestOwner', internalType: 'address', type: 'address' },
          { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
          { name: 'resource', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'anyId', internalType: 'uint256', type: 'uint256' }],
    name: 'getStatus',
    outputs: [{ name: '', internalType: 'enum Status', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'label', internalType: 'string', type: 'string' }],
    name: 'getSubregistry',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'anyId', internalType: 'uint256', type: 'uint256' }],
    name: 'getTokenId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'grantRootRoles',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'hasRootRoles',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'grants',
        internalType: 'struct Grant[]',
        type: 'tuple[]',
        components: [
          { name: 'account', internalType: 'address', type: 'address' },
          { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'latestOwnerOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'label', internalType: 'string', type: 'string' },
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'registry', internalType: 'address', type: 'address' },
      { name: 'resolver', internalType: 'address', type: 'address' },
      { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
      { name: 'expiry', internalType: 'uint64', type: 'uint64' },
    ],
    name: 'register',
    outputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'anyId', internalType: 'uint256', type: 'uint256' },
      { name: 'newExpiry', internalType: 'uint64', type: 'uint64' },
    ],
    name: 'renew',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'revokeRootRoles',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'anyId', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'roles',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'anyId', internalType: 'uint256', type: 'uint256' },
      { name: 'resolver', internalType: 'address', type: 'address' },
    ],
    name: 'setResolver',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'anyId', internalType: 'uint256', type: 'uint256' }],
    name: 'unregister',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'error',
    inputs: [
      { name: 'oldExpiry', internalType: 'uint64', type: 'uint64' },
      { name: 'newExpiry', internalType: 'uint64', type: 'uint64' },
    ],
    name: 'CannotReduceExpiry',
  },
  {
    type: 'error',
    inputs: [{ name: 'expiry', internalType: 'uint64', type: 'uint64' }],
    name: 'CannotSetPastExpiry',
  },
  {
    type: 'error',
    inputs: [
      { name: 'resource', internalType: 'uint256', type: 'uint256' },
      { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'EACCannotGrantRoles',
  },
  {
    type: 'error',
    inputs: [
      { name: 'resource', internalType: 'uint256', type: 'uint256' },
      { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'EACCannotRevokeRoles',
  },
  {
    type: 'error',
    inputs: [
      { name: 'resource', internalType: 'uint256', type: 'uint256' },
      { name: 'roleBitmap', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'EACUnauthorizedAccountRoles',
  },
  {
    type: 'error',
    inputs: [{ name: 'label', internalType: 'string', type: 'string' }],
    name: 'LabelAlreadyRegistered',
  },
  {
    type: 'error',
    inputs: [{ name: 'label', internalType: 'string', type: 'string' }],
    name: 'LabelAlreadyReserved',
  },
  {
    type: 'error',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'LabelExpired',
  },
  {
    type: 'error',
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'from', internalType: 'address', type: 'address' },
    ],
    name: 'TransferDisallowed',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// InvoiceMarket
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const invoiceMarketAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'stable', internalType: 'contract IERC20', type: 'address' },
      {
        name: 'registrar',
        internalType: 'contract IInvoiceRegistrar',
        type: 'address',
      },
      { name: 'maxOpenPositions', internalType: 'uint256', type: 'uint256' },
      { name: 'operator_', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_OPEN_POSITIONS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_TENOR',
    outputs: [{ name: '', internalType: 'uint64', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'OVERDUE_EXTENSION',
    outputs: [{ name: '', internalType: 'uint64', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REGISTRAR',
    outputs: [
      { name: '', internalType: 'contract IInvoiceRegistrar', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'STABLE',
    outputs: [{ name: '', internalType: 'contract IERC20', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    name: 'buy',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    name: 'cancel',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'debtor', internalType: 'address', type: 'address' },
      { name: 'accountant', internalType: 'address', type: 'address' },
      { name: 'faceValue', internalType: 'uint128', type: 'uint128' },
      { name: 'price', internalType: 'uint128', type: 'uint128' },
      { name: 'dueDate', internalType: 'uint64', type: 'uint64' },
    ],
    name: 'createInvoice',
    outputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'invoiceCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'invoices',
    outputs: [
      { name: 'issuer', internalType: 'address', type: 'address' },
      { name: 'debtor', internalType: 'address', type: 'address' },
      { name: 'faceValue', internalType: 'uint128', type: 'uint128' },
      { name: 'price', internalType: 'uint128', type: 'uint128' },
      { name: 'dueDate', internalType: 'uint64', type: 'uint64' },
      {
        name: 'state',
        internalType: 'enum InvoiceMarket.State',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'operator', internalType: 'address', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'isVerified',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    name: 'markOverdue',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'nullifierOwner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'operator',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'investor', internalType: 'address', type: 'address' },
      { name: 'nullifier', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'revokeVerification',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOperator', internalType: 'address', type: 'address' }],
    name: 'setOperator',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'investor', internalType: 'address', type: 'address' },
      { name: 'nullifier', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'setVerified',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    name: 'settle',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'approved',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'operator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'approved', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'ApprovalForAll',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'investor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'nullifier',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
    ],
    name: 'InvestorVerificationRevoked',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'investor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'nullifier',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
    ],
    name: 'InvestorVerified',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
    ],
    name: 'InvoiceCancelled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'issuer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'debtor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'faceValue',
        internalType: 'uint128',
        type: 'uint128',
        indexed: false,
      },
      {
        name: 'price',
        internalType: 'uint128',
        type: 'uint128',
        indexed: false,
      },
      {
        name: 'dueDate',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
      { name: 'name', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'resolver',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'InvoiceCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'investor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'price',
        internalType: 'uint128',
        type: 'uint128',
        indexed: false,
      },
    ],
    name: 'InvoiceFunded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'newExpiry',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
    ],
    name: 'InvoiceOverdue',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'payer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'holder',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'faceValue',
        internalType: 'uint128',
        type: 'uint128',
        indexed: false,
      },
    ],
    name: 'InvoiceSettled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Paused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Transfer',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Unpaused',
  },
  { type: 'error', inputs: [], name: 'DueDatePassed' },
  {
    type: 'error',
    inputs: [
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    name: 'ERC721IncorrectOwner',
  },
  {
    type: 'error',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC721InsufficientApproval',
  },
  {
    type: 'error',
    inputs: [{ name: 'approver', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidApprover',
  },
  {
    type: 'error',
    inputs: [{ name: 'operator', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidOperator',
  },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'receiver', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidReceiver',
  },
  {
    type: 'error',
    inputs: [{ name: 'sender', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidSender',
  },
  {
    type: 'error',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ERC721NonexistentToken',
  },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  {
    type: 'error',
    inputs: [
      {
        name: 'actual',
        internalType: 'enum InvoiceMarket.State',
        type: 'uint8',
      },
    ],
    name: 'InvalidState',
  },
  { type: 'error', inputs: [], name: 'InvalidTerms' },
  { type: 'error', inputs: [], name: 'NameNotLive' },
  { type: 'error', inputs: [], name: 'NameStillLive' },
  { type: 'error', inputs: [], name: 'NotIssuer' },
  { type: 'error', inputs: [], name: 'NotOperator' },
  {
    type: 'error',
    inputs: [{ name: 'who', internalType: 'address', type: 'address' }],
    name: 'NotVerifiedInvestor',
  },
  { type: 'error', inputs: [], name: 'NotYetDue' },
  {
    type: 'error',
    inputs: [{ name: 'boundTo', internalType: 'address', type: 'address' }],
    name: 'NullifierAlreadyUsed',
  },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
  {
    type: 'error',
    inputs: [{ name: 'who', internalType: 'address', type: 'address' }],
    name: 'PositionCapReached',
  },
  {
    type: 'error',
    inputs: [{ name: 'ack', internalType: 'string', type: 'string' }],
    name: 'PurchaseBlockedByAck',
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  {
    type: 'error',
    inputs: [
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'length', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'StringsInsufficientHexLength',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// InvoiceRegistrar
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const invoiceRegistrarAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'registry',
        internalType: 'contract IUserRegistry',
        type: 'address',
      },
      {
        name: 'factory',
        internalType: 'contract IVerifiableFactory',
        type: 'address',
      },
      { name: 'resolverImpl', internalType: 'address', type: 'address' },
      { name: 'parentLabel', internalType: 'string', type: 'string' },
      { name: 'admin_', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FACTORY',
    outputs: [
      {
        name: '',
        internalType: 'contract IVerifiableFactory',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PARENT_LABEL',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PARENT_NODE',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REGISTRY',
    outputs: [
      { name: '', internalType: 'contract IUserRegistry', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'RESOLVER_IMPL',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'invoiceId', internalType: 'uint256', type: 'uint256' }],
    name: 'ackOf',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'admin',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'invoiceId', internalType: 'uint256', type: 'uint256' },
      { name: 'finalStatus', internalType: 'string', type: 'string' },
    ],
    name: 'closeInvoice',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'invoiceId', internalType: 'uint256', type: 'uint256' }],
    name: 'dnsNameOf',
    outputs: [{ name: '', internalType: 'bytes', type: 'bytes' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'invoiceId', internalType: 'uint256', type: 'uint256' }],
    name: 'isLive',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'invoiceId', internalType: 'uint256', type: 'uint256' }],
    name: 'labelOf',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [],
    name: 'market',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'invoiceId', internalType: 'uint256', type: 'uint256' }],
    name: 'nameOf',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'invoiceId', internalType: 'uint256', type: 'uint256' }],
    name: 'nodeOf',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'invoiceId', internalType: 'uint256', type: 'uint256' }],
    name: 'recordsOf',
    outputs: [
      { name: 'records', internalType: 'string[8]', type: 'string[8]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'invoiceId', internalType: 'uint256', type: 'uint256' },
      { name: 'issuer', internalType: 'address', type: 'address' },
      { name: 'accountant', internalType: 'address', type: 'address' },
      { name: 'dueDate', internalType: 'uint64', type: 'uint64' },
      { name: 'keys', internalType: 'string[]', type: 'string[]' },
      { name: 'values', internalType: 'string[]', type: 'string[]' },
    ],
    name: 'registerInvoice',
    outputs: [{ name: 'resolver', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'invoiceId', internalType: 'uint256', type: 'uint256' }],
    name: 'resolverOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'invoiceId', internalType: 'uint256', type: 'uint256' },
      { name: 'newExpiry', internalType: 'uint64', type: 'uint64' },
    ],
    name: 'reviveOverdue',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'market_', internalType: 'address', type: 'address' }],
    name: 'setMarket',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'invoiceId', internalType: 'uint256', type: 'uint256' },
      { name: 'status', internalType: 'string', type: 'string' },
    ],
    name: 'setStatus',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'invoiceId', internalType: 'uint256', type: 'uint256' }],
    name: 'statusOf',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'invoiceId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'finalStatus',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'unregistered',
        internalType: 'bool',
        type: 'bool',
        indexed: false,
      },
    ],
    name: 'InvoiceNameClosed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'invoiceId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'label', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'resolver',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'expiry',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
    ],
    name: 'InvoiceNameRegistered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'invoiceId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'expiry',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
    ],
    name: 'InvoiceNameRevived',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'invoiceId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'status',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'InvoiceStatusSet',
  },
  { type: 'error', inputs: [], name: 'AlreadyRegistered' },
  { type: 'error', inputs: [], name: 'BadRecords' },
  { type: 'error', inputs: [], name: 'MarketAlreadySet' },
  { type: 'error', inputs: [], name: 'NameStillLive' },
  { type: 'error', inputs: [], name: 'NotAdmin' },
  { type: 'error', inputs: [], name: 'NotMarket' },
  { type: 'error', inputs: [], name: 'UnknownInvoice' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MockUSDC
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const mockUsdcAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'spender', internalType: 'address', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', internalType: 'uint8', type: 'uint8' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'spender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Transfer',
  },
  {
    type: 'error',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'allowance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC20InsufficientAllowance',
  },
  {
    type: 'error',
    inputs: [
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'balance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC20InsufficientBalance',
  },
  {
    type: 'error',
    inputs: [{ name: 'approver', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidApprover',
  },
  {
    type: 'error',
    inputs: [{ name: 'receiver', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidReceiver',
  },
  {
    type: 'error',
    inputs: [{ name: 'sender', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidSender',
  },
  {
    type: 'error',
    inputs: [{ name: 'spender', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidSpender',
  },
] as const
