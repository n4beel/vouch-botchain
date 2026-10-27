// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test} from "forge-std/Test.sol";
import {Vouch} from "../src/Vouch.sol";

contract VouchHandler is Test {
  Vouch public vouchContract;
  address[5] public actors;

  constructor(Vouch _vouch) {
    vouchContract = _vouch;
    actors[0] = address(0x201);
    actors[1] = address(0x202);
    actors[2] = address(0x203);
    actors[3] = address(0x204);
    actors[4] = address(0x205);
  }

  function vouch(uint256 fromSeed, uint256 toSeed, bytes16 label) external {
    address from = actors[fromSeed % 5];
    address to = actors[toSeed % 5];
    if (from == to) return;

    if (!vouchContract.isVouched(from, to)) {
      (address[] memory tos,,) = vouchContract.outgoing(from);
      if (tos.length < 10) {
        vm.prank(from);
        vouchContract.vouch(to, label);
      }
    }
  }

  function unvouch(uint256 fromSeed, uint256 toSeed) external {
    address from = actors[fromSeed % 5];
    address to = actors[toSeed % 5];
    if (from == to) return;

    if (vouchContract.isVouched(from, to)) {
      vm.prank(from);
      vouchContract.unvouch(to);
    }
  }
}

contract VouchInvariantTest is Test {
  Vouch public vouchContract;
  VouchHandler public handler;

  function setUp() public {
    vm.warp(1_760_000_000);
    vouchContract = new Vouch();
    handler = new VouchHandler(vouchContract);
    targetContract(address(handler));
  }

  function invariant_BalanceZero() public view {
    assertEq(address(vouchContract).balance, 0);
  }

  function invariant_GraphConsistency() public view {
    uint256 totalOut = 0;
    for (uint256 i = 0; i < 5; i++) {
      address a = handler.actors(i);
      (address[] memory tos,,) = vouchContract.outgoing(a);
      assertTrue(tos.length <= 10);
      totalOut += tos.length;

      uint32 expectedIn = 0;
      for (uint256 j = 0; j < 5; j++) {
        address b = handler.actors(j);
        if (vouchContract.isVouched(b, a)) {
          expectedIn++;
        }
      }
      assertEq(vouchContract.incoming(a), expectedIn);

      // No self edges
      assertFalse(vouchContract.isVouched(a, a));

      // No duplicates in outgoing
      for (uint256 k = 0; k < tos.length; k++) {
        for (uint256 l = k + 1; l < tos.length; l++) {
          assertTrue(tos[k] != tos[l]);
        }
      }
    }
    assertEq(vouchContract.totalVouches(), totalOut);
  }
}
