// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test} from "forge-std/Test.sol";
import {Vouch} from "../src/Vouch.sol";

contract VouchTest is Test {
  Vouch public vouchContract;

  address public alice = address(0xA11CE);
  address public bob = address(0xB0B);
  address public charlie = address(0xCC);
  address public dave = address(0xDD);

  bytes16 public constant LABEL_FRIEND = "friend";
  bytes16 public constant LABEL_DEV = "developer";
  bytes16 public constant LABEL_COWORKER = "coworker";

  event Vouched(address indexed from, address indexed to, bytes16 label);
  event Unvouched(address indexed from, address indexed to);

  function setUp() public {
    vm.warp(1_760_000_000);
    vouchContract = new Vouch();
  }

  function test_VouchStoresEdge() public {
    vm.prank(alice);
    vm.expectEmit(true, true, false, true);
    emit Vouched(alice, bob, LABEL_FRIEND);
    vouchContract.vouch(bob, LABEL_FRIEND);

    assertTrue(vouchContract.isVouched(alice, bob));
    assertTrue(vouchContract.vouched(alice, bob));
    assertEq(vouchContract.incoming(bob), 1);
    assertEq(vouchContract.totalVouches(), 1);

    (address[] memory tos, bytes16[] memory labels, uint64[] memory sinces) =
      vouchContract.outgoing(alice);
    assertEq(tos.length, 1);
    assertEq(labels.length, 1);
    assertEq(sinces.length, 1);
    assertEq(tos[0], bob);
    assertEq(labels[0], LABEL_FRIEND);
    assertEq(sinces[0], 1_760_000_000);
  }

  function test_CannotVouchSelfOrZero() public {
    // Test zero target
    vm.prank(alice);
    vm.expectRevert(abi.encodeWithSelector(Vouch.BadTarget.selector, address(0)));
    vouchContract.vouch(address(0), LABEL_FRIEND);

    // Test self target
    vm.prank(alice);
    vm.expectRevert(abi.encodeWithSelector(Vouch.BadTarget.selector, alice));
    vouchContract.vouch(alice, LABEL_FRIEND);

    // Confirm state didn't change
    assertEq(vouchContract.totalVouches(), 0);
  }

  function test_DuplicateReverts() public {
    vm.startPrank(alice);
    vouchContract.vouch(bob, LABEL_FRIEND);

    vm.expectRevert(abi.encodeWithSelector(Vouch.AlreadyVouched.selector, bob));
    vouchContract.vouch(bob, LABEL_DEV);
    vm.stopPrank();

    assertEq(vouchContract.incoming(bob), 1);
    assertEq(vouchContract.totalVouches(), 1);
  }

  function test_EleventhVouchReverts() public {
    vm.startPrank(alice);
    for (uint160 i = 1; i <= 10; i++) {
      address target = address(i + 100);
      vouchContract.vouch(target, bytes16(bytes32(uint256(i))));
    }

    (address[] memory tos,,) = vouchContract.outgoing(alice);
    assertEq(tos.length, 10);
    assertEq(vouchContract.totalVouches(), 10);

    // Attempt 11th vouch
    address eleventh = address(999);
    vm.expectRevert(abi.encodeWithSelector(Vouch.TooManyVouches.selector, 10, 10));
    vouchContract.vouch(eleventh, "eleventh");
    vm.stopPrank();

    assertFalse(vouchContract.isVouched(alice, eleventh));
    assertEq(vouchContract.totalVouches(), 10);
  }

  function test_UnvouchSwapPopKeepsOthers() public {
    vm.startPrank(alice);
    vouchContract.vouch(bob, LABEL_FRIEND);
    vouchContract.vouch(charlie, LABEL_DEV);
    vouchContract.vouch(dave, LABEL_COWORKER);

    assertEq(vouchContract.incoming(charlie), 1);
    assertEq(vouchContract.totalVouches(), 3);

    // Unvouch middle item (charlie)
    vm.expectEmit(true, true, false, true);
    emit Unvouched(alice, charlie);
    vouchContract.unvouch(charlie);

    assertFalse(vouchContract.isVouched(alice, charlie));
    assertEq(vouchContract.incoming(charlie), 0);
    assertEq(vouchContract.totalVouches(), 2);

    // Verify remaining items: swap-and-pop should have placed dave in index 1
    (address[] memory tos, bytes16[] memory labels,) = vouchContract.outgoing(alice);
    assertEq(tos.length, 2);
    assertEq(tos[0], bob);
    assertEq(labels[0], LABEL_FRIEND);
    assertEq(tos[1], dave);
    assertEq(labels[1], LABEL_COWORKER);

    // Now unvouch last item (dave)
    vouchContract.unvouch(dave);
    (tos,,) = vouchContract.outgoing(alice);
    assertEq(tos.length, 1);
    assertEq(tos[0], bob);

    // Now unvouch only remaining item (bob)
    vouchContract.unvouch(bob);
    (tos,,) = vouchContract.outgoing(alice);
    assertEq(tos.length, 0);
    assertEq(vouchContract.totalVouches(), 0);

    vm.stopPrank();
  }

  function test_UnvouchMissingReverts() public {
    vm.prank(alice);
    vm.expectRevert(abi.encodeWithSelector(Vouch.NotVouched.selector, bob));
    vouchContract.unvouch(bob);
  }

  function test_IncomingCounts() public {
    // Multiple endorsers for bob
    vm.prank(alice);
    vouchContract.vouch(bob, LABEL_FRIEND);
    assertEq(vouchContract.incoming(bob), 1);

    vm.prank(charlie);
    vouchContract.vouch(bob, LABEL_DEV);
    assertEq(vouchContract.incoming(bob), 2);

    vm.prank(dave);
    vouchContract.vouch(bob, LABEL_COWORKER);
    assertEq(vouchContract.incoming(bob), 3);

    // Charlie unvouches
    vm.prank(charlie);
    vouchContract.unvouch(bob);
    assertEq(vouchContract.incoming(bob), 2);

    // Alice unvouches
    vm.prank(alice);
    vouchContract.unvouch(bob);
    assertEq(vouchContract.incoming(bob), 1);

    // Dave unvouches
    vm.prank(dave);
    vouchContract.unvouch(bob);
    assertEq(vouchContract.incoming(bob), 0);
  }

  function test_ReVouchAfterUnvouchResetsSince() public {
    vm.warp(1_760_000_100);
    vm.prank(alice);
    vouchContract.vouch(bob, LABEL_FRIEND);

    (,, uint64[] memory sinces1) = vouchContract.outgoing(alice);
    assertEq(sinces1[0], 1_760_000_100);

    vm.warp(1_760_000_500);
    vm.prank(alice);
    vouchContract.unvouch(bob);

    vm.warp(1_760_000_900);
    vm.prank(alice);
    vouchContract.vouch(bob, LABEL_DEV);

    (address[] memory tos, bytes16[] memory labels, uint64[] memory sinces2) =
      vouchContract.outgoing(alice);
    assertEq(tos.length, 1);
    assertEq(tos[0], bob);
    assertEq(labels[0], LABEL_DEV);
    assertEq(sinces2[0], 1_760_000_900);
  }

  function test_NoBalance_NoReceive() public {
    assertEq(address(vouchContract).balance, 0);

    // Attempting to send native currency must revert
    (bool success,) = address(vouchContract).call{value: 1 ether}("");
    assertFalse(success);
    assertEq(address(vouchContract).balance, 0);
  }

  function testFuzz_IncomingEqualsEdges(uint8 numOps) public {
    address[5] memory actors =
      [address(0x101), address(0x102), address(0x103), address(0x104), address(0x105)];

    uint256 ops = bound(numOps, 10, 60);

    for (uint256 i = 0; i < ops; i++) {
      uint256 fromIdx = i % 5;
      uint256 toIdx = (i + 1 + (i / 5)) % 5;
      address from = actors[fromIdx];
      address to = actors[toIdx];

      if (from == to) continue;

      bool isCurrentlyVouched = vouchContract.isVouched(from, to);

      if (!isCurrentlyVouched) {
        (address[] memory curTos,,) = vouchContract.outgoing(from);
        if (curTos.length < 10) {
          vm.prank(from);
          vouchContract.vouch(to, "fuzz-edge");
        }
      } else {
        vm.prank(from);
        vouchContract.unvouch(to);
      }
    }

    // Verify invariants across all actors
    uint256 totalEdges = 0;
    for (uint256 a = 0; a < 5; a++) {
      address actor = actors[a];
      (address[] memory outTos,,) = vouchContract.outgoing(actor);
      totalEdges += outTos.length;

      // Count how many actors vouch for actor
      uint32 expectedIncoming = 0;
      for (uint256 b = 0; b < 5; b++) {
        if (vouchContract.isVouched(actors[b], actor)) {
          expectedIncoming++;
        }
      }
      assertEq(vouchContract.incoming(actor), expectedIncoming);
    }
    assertEq(vouchContract.totalVouches(), totalEdges);
    assertEq(address(vouchContract).balance, 0);
  }
}
