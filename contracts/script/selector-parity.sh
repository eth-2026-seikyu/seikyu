#!/usr/bin/env bash
set -euo pipefail
: "${SEPOLIA_RPC_URL:?}"; fail=0; n=0
check() { local addr=$1; shift; local code; code=$(cast code "$addr" --rpc-url "$SEPOLIA_RPC_URL")
  for s in "$@"; do local sel; sel=$(cast sig "$s"); n=$((n+1))
    if [[ "$code" == *"${sel#0x}"* ]]; then echo "OK   $sel $s"; else echo "MISS $sel $s @ $addr"; fail=1; fi; done; }
check 0xa80338aaa8d23831cea25e858d1774534abb0263 "initialize((address,uint256)[])" "register(string,address,address,address,uint256,uint64)" \
  "renew(uint256,uint64)" "unregister(uint256)" "grantRootRoles(uint256,address)" "revokeRootRoles(uint256,address)" \
  "hasRootRoles(uint256,address)" "getState(uint256)" "setResolver(uint256,address)" "safeTransferFrom(address,address,uint256,uint256,bytes)"
check 0x14f09fd05d4585759e54844dc9b00147131cf243 "initialize((address,uint256)[],bytes[])" "setText(bytes,string,string)" \
  "grantSetterRoles(bytes,address)" "resolve(bytes,bytes)" "multicall(bytes[])" "hasRootRoles(uint256,address)"
check 0x9e726eb570beb6bceb495ab8cda7df517d4e841c "deployProxy(address,uint256,bytes)"
check 0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca "commit(bytes32)" "register(string,address,bytes32,address,address,uint64,address,bytes32)" \
  "makeCommitment(string,address,bytes32,address,address,uint64,bytes32)" "getRegisterPrice(string,uint64,address)" \
  "isAvailable(string)" "MIN_COMMITMENT_AGE()" "MIN_REGISTER_DURATION()"
check 0x657ea849311d3d5823348dded7c2aaafb3ede09e "getSubregistry(string)" "getState(uint256)"
if [[ $fail -eq 0 ]]; then echo "PARITY OK ($n selectors)"; else echo "PARITY FAIL"; exit 1; fi
