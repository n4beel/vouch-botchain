/**
 * Hand-written ABI for Vouch.sol
 * Matches compiled contract selector-for-selector.
 */
export const vouchAbi = [
  {
    type: "function",
    name: "MAX_OUT",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "incoming",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isVouched",
    inputs: [
      { name: "from", type: "address", internalType: "address" },
      { name: "to", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "outgoing",
    inputs: [{ name: "who", type: "address", internalType: "address" }],
    outputs: [
      { name: "tos", type: "address[]", internalType: "address[]" },
      { name: "labels", type: "bytes16[]", internalType: "bytes16[]" },
      { name: "sinces", type: "uint64[]", internalType: "uint64[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalVouches",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "unvouch",
    inputs: [{ name: "other", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "vouch",
    inputs: [
      { name: "other", type: "address", internalType: "address" },
      { name: "label", type: "bytes16", internalType: "bytes16" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "vouched",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Vouched",
    inputs: [
      { name: "from", type: "address", indexed: true, internalType: "address" },
      { name: "to", type: "address", indexed: true, internalType: "address" },
      { name: "label", type: "bytes16", indexed: false, internalType: "bytes16" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Unvouched",
    inputs: [
      { name: "from", type: "address", indexed: true, internalType: "address" },
      { name: "to", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AlreadyVouched",
    inputs: [{ name: "target", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "BadTarget",
    inputs: [{ name: "target", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "NotVouched",
    inputs: [{ name: "target", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "TooManyVouches",
    inputs: [
      { name: "count", type: "uint256", internalType: "uint256" },
      { name: "max", type: "uint256", internalType: "uint256" },
    ],
  },
] as const;

export const contractAbi = vouchAbi;
