import { describe, it, expect, beforeEach } from "vitest";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INSUFFICIENT_BALANCE = 101;
const ERR_TRANSFER_FAILED = 102;
const ERR_MINT_FAILED = 103;
const ERR_BURN_FAILED = 104;
const ERR_INVALID_AMOUNT = 105;
const ERR_DAO_CORE_NOT_SET = 106;
const ERR_INVALID_RECIPIENT = 107;
const ERR_MAX_SUPPLY_EXCEEDED = 108;
const MAX_SUPPLY = 100000000000000;

interface Result<T> {
  ok: boolean;
  value: T;
}

class GovernanceTokenMock {
  state: {
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: number;
    balances: Map<string, number>;
    daoCoreContract: string | null;
  } = {
    name: "ZeroWasteDAO",
    symbol: "ZWD",
    decimals: 6,
    totalSupply: 0,
    balances: new Map(),
    daoCoreContract: null,
  };
  caller: string = "ST1OWNER";
  owner: string = "ST1OWNER";

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      name: "ZeroWasteDAO",
      symbol: "ZWD",
      decimals: 6,
      totalSupply: 0,
      balances: new Map(),
      daoCoreContract: null,
    };
    this.caller = "ST1OWNER";
  }

  getName(): Result<string> {
    return { ok: true, value: this.state.name };
  }

  getSymbol(): Result<string> {
    return { ok: true, value: this.state.symbol };
  }

  getDecimals(): Result<number> {
    return { ok: true, value: this.state.decimals };
  }

  getBalance(account: string): Result<number> {
    return { ok: true, value: this.state.balances.get(account) || 0 };
  }

  getTotalSupply(): Result<number> {
    return { ok: true, value: this.state.totalSupply };
  }

  setDaoCore(core: string): Result<boolean> {
    if (this.caller !== this.owner)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.daoCoreContract = core;
    return { ok: true, value: true };
  }

  transfer(amount: number, sender: string, recipient: string): Result<boolean> {
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (sender === recipient)
      return { ok: false, value: ERR_INVALID_RECIPIENT };
    const senderBal = this.state.balances.get(sender) || 0;
    if (senderBal < amount)
      return { ok: false, value: ERR_INSUFFICIENT_BALANCE };
    this.state.balances.set(sender, senderBal - amount);
    this.state.balances.set(
      recipient,
      (this.state.balances.get(recipient) || 0) + amount
    );
    return { ok: true, value: true };
  }

  mint(amount: number, recipient: string): Result<boolean> {
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (!this.state.daoCoreContract)
      return { ok: false, value: ERR_DAO_CORE_NOT_SET };
    if (this.caller !== this.state.daoCoreContract)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.totalSupply + amount > MAX_SUPPLY)
      return { ok: false, value: ERR_MAX_SUPPLY_EXCEEDED };
    this.state.totalSupply += amount;
    this.state.balances.set(
      recipient,
      (this.state.balances.get(recipient) || 0) + amount
    );
    return { ok: true, value: true };
  }

  burn(amount: number, sender: string): Result<boolean> {
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    const senderBal = this.state.balances.get(sender) || 0;
    if (senderBal < amount)
      return { ok: false, value: ERR_INSUFFICIENT_BALANCE };
    this.state.balances.set(sender, senderBal - amount);
    this.state.totalSupply -= amount;
    return { ok: true, value: true };
  }
}

describe("GovernanceToken", () => {
  let token: GovernanceTokenMock;

  beforeEach(() => {
    token = new GovernanceTokenMock();
    token.reset();
  });

  it("gets token metadata", () => {
    expect(token.getName().value).toBe("ZeroWasteDAO");
    expect(token.getSymbol().value).toBe("ZWD");
    expect(token.getDecimals().value).toBe(6);
  });

  it("mints tokens by DAO core", () => {
    token.setDaoCore("ST2CORE");
    token.caller = "ST2CORE";
    const result = token.mint(1000, "ST3USER");
    expect(result.ok).toBe(true);
    expect(token.getBalance("ST3USER").value).toBe(1000);
    expect(token.getTotalSupply().value).toBe(1000);
  });

  it("rejects mint without DAO core", () => {
    token.caller = "ST2CORE";
    const result = token.mint(1000, "ST3USER");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_DAO_CORE_NOT_SET);
  });

  it("rejects mint by non-core", () => {
    token.setDaoCore("ST2CORE");
    const result = token.mint(1000, "ST3USER");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("transfers tokens successfully", () => {
    token.state.balances.set("ST1SENDER", 1000);
    const result = token.transfer(500, "ST1SENDER", "ST2RECIPIENT");
    expect(result.ok).toBe(true);
    expect(token.getBalance("ST1SENDER").value).toBe(500);
    expect(token.getBalance("ST2RECIPIENT").value).toBe(500);
  });

  it("rejects transfer with insufficient balance", () => {
    token.state.balances.set("ST1SENDER", 100);
    const result = token.transfer(500, "ST1SENDER", "ST2RECIPIENT");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSUFFICIENT_BALANCE);
  });

  it("rejects zero amount transfer", () => {
    const result = token.transfer(0, "ST1SENDER", "ST2RECIPIENT");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });

  it("burns tokens successfully", () => {
    token.state.balances.set("ST1USER", 1000);
    token.state.totalSupply = 1000;
    const result = token.burn(400, "ST1USER");
    expect(result.ok).toBe(true);
    expect(token.getBalance("ST1USER").value).toBe(600);
    expect(token.getTotalSupply().value).toBe(600);
  });

  it("rejects burn with insufficient balance", () => {
    token.state.balances.set("ST1USER", 100);
    const result = token.burn(500, "ST1USER");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSUFFICIENT_BALANCE);
  });

  it("enforces max supply on mint", () => {
    token.setDaoCore("ST2CORE");
    token.caller = "ST2CORE";
    token.state.totalSupply = MAX_SUPPLY;
    const result = token.mint(1, "ST3USER");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_SUPPLY_EXCEEDED);
  });

  it("sets DAO core by owner", () => {
    const result = token.setDaoCore("ST2CORE");
    expect(result.ok).toBe(true);
    expect(token.state.daoCoreContract).toBe("ST2CORE");
  });

  it("rejects DAO core set by non-owner", () => {
    token.caller = "ST3HACKER";
    const result = token.setDaoCore("ST2CORE");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });
});
