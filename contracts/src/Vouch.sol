// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/// @title Vouch
/// @notice A public, directed web of trust. Each wallet can vouch for up to 10 other wallets at a time with a short label.
/// @dev Implements a capped, revocable endorsement graph with no admin or issuer.
contract Vouch {
  /// @dev Represents a directed vouch endorsement edge.
  /// @dev Packed: `to` (20 bytes) + `since` (8 bytes) fit in 28 bytes of slot 0. `label` (16 bytes) occupies slot 1.
  struct Edge {
    address to;
    uint64 since;
    bytes16 label;
  }

  /// @notice Maximum number of active outgoing vouches permitted per wallet.
  uint256 public constant MAX_OUT = 10;

  /// @dev Mapping of endorser address to their active outgoing vouch edges.
  mapping(address => Edge[]) private _out;

  /// @notice Tracks whether a directed vouch exists from an endorser to a recipient.
  mapping(address => mapping(address => bool)) public vouched;

  /// @notice Number of active incoming vouches received by an address.
  mapping(address => uint32) public incoming;

  /// @notice Total active vouches currently recorded across the entire graph.
  uint256 public totalVouches;

  /// @notice Emitted when a wallet vouches for another address.
  /// @param from The endorser address.
  /// @param to The endorsed address.
  /// @param label Up to 16 ASCII bytes describing the context of the vouch.
  event Vouched(address indexed from, address indexed to, bytes16 label);

  /// @notice Emitted when a wallet revokes a vouch for another address.
  /// @param from The endorser address.
  /// @param to The previously endorsed address.
  event Unvouched(address indexed from, address indexed to);

  /// @notice Thrown when attempting to vouch for address(0) or self.
  /// @param target The invalid target address.
  error BadTarget(address target);

  /// @notice Thrown when attempting to vouch for an address already vouched for.
  /// @param target The address already vouched for.
  error AlreadyVouched(address target);

  /// @notice Thrown when an endorser attempts to exceed MAX_OUT active vouches.
  /// @param count The current number of outgoing vouches.
  /// @param max The maximum allowed outgoing vouches (10).
  error TooManyVouches(uint256 count, uint256 max);

  /// @notice Thrown when attempting to unvouch an address that is not currently vouched for.
  /// @param target The target address not found in outgoing vouches.
  error NotVouched(address target);

  /// @notice Create a directed vouch for another address with a label.
  /// @param other The address to vouch for (must be non-zero and not msg.sender).
  /// @param label Up to 16 bytes describing the vouch.
  function vouch(address other, bytes16 label) external {
    if (other == address(0) || other == msg.sender) {
      revert BadTarget(other);
    }
    if (vouched[msg.sender][other]) {
      revert AlreadyVouched(other);
    }
    uint256 currentCount = _out[msg.sender].length;
    if (currentCount >= MAX_OUT) {
      revert TooManyVouches(currentCount, MAX_OUT);
    }

    vouched[msg.sender][other] = true;
    _out[msg.sender].push(Edge({to: other, since: uint64(block.timestamp), label: label}));
    incoming[other]++;
    totalVouches++;

    emit Vouched(msg.sender, other, label);
  }

  /// @notice Revoke an existing vouch for another address.
  /// @param other The address to unvouch.
  function unvouch(address other) external {
    if (!vouched[msg.sender][other]) {
      revert NotVouched(other);
    }

    vouched[msg.sender][other] = false;
    incoming[other]--;
    totalVouches--;

    Edge[] storage edges = _out[msg.sender];
    uint256 len = edges.length;
    uint256 i = 0;
    while (edges[i].to != other) {
      unchecked {
        ++i;
      }
    }
    uint256 lastIndex = len - 1;
    if (i != lastIndex) {
      edges[i] = edges[lastIndex];
    }
    edges.pop();

    emit Unvouched(msg.sender, other);
  }

  /// @notice Returns all outgoing vouches for a given address.
  /// @param who The address whose outgoing vouches to inspect.
  /// @return tos The endorsed addresses (at most 10).
  /// @return labels The 16-byte labels for each vouch.
  /// @return sinces The unix timestamps when each vouch was created.
  function outgoing(address who)
    external
    view
    returns (address[] memory tos, bytes16[] memory labels, uint64[] memory sinces)
  {
    Edge[] storage edges = _out[who];
    uint256 len = edges.length;
    tos = new address[](len);
    labels = new bytes16[](len);
    sinces = new uint64[](len);

    for (uint256 i = 0; i < len;) {
      tos[i] = edges[i].to;
      labels[i] = edges[i].label;
      sinces[i] = edges[i].since;
      unchecked {
        ++i;
      }
    }
  }

  /// @notice Check if a directed vouch exists between two addresses.
  /// @param from The endorser address.
  /// @param to The endorsed address.
  /// @return bool True if `from` currently vouches for `to`.
  function isVouched(address from, address to) external view returns (bool) {
    return vouched[from][to];
  }
}
