import { describe, expect, it } from "vitest";
import { describeError, isUserRejection } from "../errors";

describe("lib/errors", () => {
  it("translates user rejection to 'Cancelled.'", () => {
    expect(describeError(new Error("User rejected the request."))).toBe("Cancelled.");
    expect(describeError({ code: 4001, message: "User denied transaction signature." })).toBe("Cancelled.");
    expect(isUserRejection(new Error("User rejected"))).toBe(true);
    expect(isUserRejection(new Error("Some RPC error"))).toBe(false);
  });

  it("translates custom revert errors to friendly sentences", () => {
    expect(describeError({ data: { errorName: "AlreadyVouched" } })).toBe(
      "You already vouch for this address."
    );
    expect(describeError({ data: { errorName: "TooManyVouches" } })).toBe(
      "You can vouch for 10 addresses. Remove one first."
    );
    expect(describeError({ data: { errorName: "BadTarget" } })).toBe(
      "That can't be vouched for."
    );
    expect(describeError({ data: { errorName: "NotVouched" } })).toBe(
      "You have not vouched for this address."
    );
  });

  it("handles unknown errors cleanly", () => {
    expect(describeError(new Error("Execution reverted: out of gas"))).toContain(
      "The network refused this transaction."
    );
    expect(describeError(null)).toBe("The network refused this transaction.");
  });
});
