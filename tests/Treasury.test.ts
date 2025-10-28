import { describe, it, expect, beforeEach } from "vitest";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_AMOUNT = 101;
const ERR_INSUFFICIENT_BALANCE = 102;
const ERR_DAO_CORE_NOT_SET = 103;
const ERR_INVALID_RECIPIENT = 107;
const ERR_TRANSFER_FAILED = 106;
const ERR_ALREADY_RELEASED = 108;

interface Result<T> {
  ok: boolean;
  value: T;
}

class TreasuryMock {
  state: {
    daoCoreContract: string | null;
    totalReleased: number;
    releasedFunds: Map<number, number>;
    milestoneReleases: Map<string, number>;
    stxBalance: number;
  } = {
    daoCoreContract: null,
    totalReleased: 0,
    releasedFunds: new Map(),
    milestoneReleases: new Map(),
    stxBalance: 0,
  };
  caller: string = "ST1OWNER";
  owner: string = "ST1OWNER";
  contractPrincipal: string = "ST2TREASURY";

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      daoCoreContract: null,
      totalReleased: 0,
      releasedFunds: new Map(),
      milestoneReleases: new Map(),
      stxBalance: 0,
    };
    this.caller = "ST1OWNER";
  }

  setDaoCore(core: string): Result<boolean> {
    if (this.caller !== this.owner)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.daoCoreContract = core;
    return { ok: true, value: true };
  }

  deposit(amount: number): Result<boolean> {
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    this.state.stxBalance += amount;
    return { ok: true, value: true };
  }

  releaseFunds(
    proposalId: number,
    amount: number,
    recipient: string,
    caller: string
  ): Result<boolean> {
    if (!this.state.daoCoreContract)
      return { ok: false, value: ERR_DAO_CORE_NOT_SET };
    if (caller !== this.state.daoCoreContract)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (recipient === this.contractPrincipal)
      return { ok: false, value: ERR_INVALID_RECIPIENT };
    if (this.state.stxBalance < amount)
      return { ok: false, value: ERR_INSUFFICIENT_BALANCE };
    this.state.stxBalance -= amount;
    const current = this.state.releasedFunds.get(proposalId) || 0;
    this.state.releasedFunds.set(proposalId, current + amount);
    this.state.totalReleased += amount;
    return { ok: true, value: true };
  }

  releaseMilestone(
    proposalId: number,
    milestone: number,
    amount: number,
    recipient: string,
    caller: string
  ): Result<boolean> {
    if (!this.state.daoCoreContract)
      return { ok: false, value: ERR_DAO_CORE_NOT_SET };
    if (caller !== this.state.daoCoreContract)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    const key = `${proposalId}-${milestone}`;
    if (this.state.milestoneReleases.has(key))
      return { ok: false, value: ERR_ALREADY_RELEASED };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (recipient === this.contractPrincipal)
      return { ok: false, value: ERR_INVALID_RECIPIENT };
    if (this.state.stxBalance < amount)
      return { ok: false, value: ERR_INSUFFICIENT_BALANCE };
    this.state.stxBalance -= amount;
    this.state.milestoneReleases.set(key, amount);
    const current = this.state.releasedFunds.get(proposalId) || 0;
    this.state.releasedFunds.set(proposalId, current + amount);
    this.state.totalReleased += amount;
    return { ok: true, value: true };
  }

  emergencyWithdraw(amount: number, recipient: string): Result<boolean> {
    if (this.caller !== this.owner)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (this.state.stxBalance < amount)
      return { ok: false, value: ERR_INSUFFICIENT_BALANCE };
    this.state.stxBalance -= amount;
    return { ok: true, value: true };
  }

  getTotalReleased(): Result<number> {
    return { ok: true, value: this.state.totalReleased };
  }

  getReleasedForProposal(id: number): Result<number> {
    return { ok: true, value: this.state.releasedFunds.get(id) || 0 };
  }

  getMilestoneRelease(id: number, milestone: number): Result<number> {
    return {
      ok: true,
      value: this.state.milestoneReleases.get(`${id}-${milestone}`) || 0,
    };
  }
}

describe("Treasury", () => {
  let treasury: TreasuryMock;

  beforeEach(() => {
    treasury = new TreasuryMock();
    treasury.reset();
  });

  it("sets DAO core by owner", () => {
    const result = treasury.setDaoCore("ST3CORE");
    expect(result.ok).toBe(true);
    expect(treasury.state.daoCoreContract).toBe("ST3CORE");
  });

  it("rejects DAO core set by non-owner", () => {
    treasury.caller = "ST4HACKER";
    const result = treasury.setDaoCore("ST3CORE");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("deposits STX successfully", () => {
    const result = treasury.deposit(10000);
    expect(result.ok).toBe(true);
    expect(treasury.state.stxBalance).toBe(10000);
  });

  it("releases funds by DAO core", () => {
    treasury.setDaoCore("ST3CORE");
    treasury.deposit(10000);
    const result = treasury.releaseFunds(1, 5000, "ST5RECIPIENT", "ST3CORE");
    expect(result.ok).toBe(true);
    expect(treasury.state.stxBalance).toBe(5000);
    expect(treasury.getReleasedForProposal(1).value).toBe(5000);
    expect(treasury.getTotalReleased().value).toBe(5000);
  });

  it("rejects release without DAO core", () => {
    treasury.deposit(10000);
    const result = treasury.releaseFunds(1, 5000, "ST5RECIPIENT", "ST3CORE");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_DAO_CORE_NOT_SET);
  });

  it("rejects release by non-core", () => {
    treasury.setDaoCore("ST3CORE");
    treasury.deposit(10000);
    const result = treasury.releaseFunds(1, 5000, "ST5RECIPIENT", "ST4FAKE");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("releases milestone funds once", () => {
    treasury.setDaoCore("ST3CORE");
    treasury.deposit(10000);
    const result1 = treasury.releaseMilestone(
      1,
      0,
      3000,
      "ST5RECIPIENT",
      "ST3CORE"
    );
    const result2 = treasury.releaseMilestone(
      1,
      0,
      1000,
      "ST5RECIPIENT",
      "ST3CORE"
    );
    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(false);
    expect(result2.value).toBe(ERR_ALREADY_RELEASED);
    expect(treasury.getMilestoneRelease(1, 0).value).toBe(3000);
  });

  it("rejects milestone release with insufficient balance", () => {
    treasury.setDaoCore("ST3CORE");
    treasury.deposit(1000);
    const result = treasury.releaseMilestone(
      1,
      0,
      5000,
      "ST5RECIPIENT",
      "ST3CORE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSUFFICIENT_BALANCE);
  });

  it("emergency withdraw by owner", () => {
    treasury.deposit(10000);
    const result = treasury.emergencyWithdraw(8000, "ST6OWNER");
    expect(result.ok).toBe(true);
    expect(treasury.state.stxBalance).toBe(2000);
  });

  it("rejects emergency withdraw by non-owner", () => {
    treasury.caller = "ST7HACKER";
    treasury.deposit(10000);
    const result = treasury.emergencyWithdraw(5000, "ST6OWNER");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("tracks total and per-proposal released amounts", () => {
    treasury.setDaoCore("ST3CORE");
    treasury.deposit(20000);
    treasury.releaseFunds(1, 7000, "ST5A", "ST3CORE");
    treasury.releaseFunds(2, 3000, "ST5B", "ST3CORE");
    expect(treasury.getTotalReleased().value).toBe(10000);
    expect(treasury.getReleasedForProposal(1).value).toBe(7000);
    expect(treasury.getReleasedForProposal(2).value).toBe(3000);
  });
});
