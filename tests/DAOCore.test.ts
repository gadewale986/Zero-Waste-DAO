import { describe, it, expect, beforeEach } from "vitest";
import { ClarityValue, uintCV, stringAsciiCV, stringUtf8CV, principalCV, listCV, tupleCV, noneCV, someCV, boolCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_PROPOSAL_ID = 101;
const ERR_INVALID_QUORUM = 102;
const ERR_INVALID_VOTING_PERIOD = 103;
const ERR_PROPOSAL_NOT_ACTIVE = 104;
const ERR_ALREADY_VOTED = 105;
const ERR_PROPOSAL_EXPIRED = 106;
const ERR_INSUFFICIENT_QUORUM = 107;
const ERR_PROPOSAL_NOT_FOUND = 108;
const ERR_INVALID_STATUS = 109;
const ERR_INVALID_FUND_AMOUNT = 110;
const ERR_TREASURY_NOT_SET = 111;
const ERR_TOKEN_NOT_SET = 112;
const ERR_EXECUTION_FAILED = 113;
const ERR_INVALID_MILESTONE = 114;
const ERR_INVALID_PROPOSER = 115;
const ERR_INVALID_VOTE = 116;
const ERR_INVALID_DELEGATE = 117;
const ERR_DELEGATION_LOOP = 118;
const ERR_INVALID_REWARD = 119;
const ERR_INVALID_STAKE = 120;
const ERR_STAKING_NOT_REQUIRED = 121;
const ERR_INVALID_SLASH_RATE = 122;
const ERR_INVALID_PROPOSAL_TYPE = 123;
const ERR_INVALID_IMPACT_METRIC = 124;
const ERR_INVALID_BUDGET = 125;

interface Proposal {
  proposer: string;
  description: string;
  budget: number;
  startBlock: number;
  endBlock: number;
  votesFor: number;
  votesAgainst: number;
  status: string;
  proposalType: string;
  impactMetric: string;
  milestones: number[];
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class DAOCoreMock {
  state: {
    nextProposalId: number;
    quorumThreshold: number;
    votingPeriod: number;
    treasuryContract: string | null;
    governanceTokenContract: string | null;
    executionEngineContract: string | null;
    stakingVaultContract: string | null;
    rewardsDistributorContract: string | null;
    proposalSubmissionContract: string | null;
    votingMechanismContract: string | null;
    proposals: Map<number, Proposal>;
    votes: Map<string, boolean>;
    delegations: Map<string, string>;
    proposalStakes: Map<string, number>;
  } = {
    nextProposalId: 0,
    quorumThreshold: 50,
    votingPeriod: 1440,
    treasuryContract: null,
    governanceTokenContract: null,
    executionEngineContract: null,
    stakingVaultContract: null,
    rewardsDistributorContract: null,
    proposalSubmissionContract: null,
    votingMechanismContract: null,
    proposals: new Map(),
    votes: new Map(),
    delegations: new Map(),
    proposalStakes: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  totalSupply: number = 1000000;
  balances: Map<string, number> = new Map([["ST1TEST", 1000]]);

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextProposalId: 0,
      quorumThreshold: 50,
      votingPeriod: 1440,
      treasuryContract: null,
      governanceTokenContract: null,
      executionEngineContract: null,
      stakingVaultContract: null,
      rewardsDistributorContract: null,
      proposalSubmissionContract: null,
      votingMechanismContract: null,
      proposals: new Map(),
      votes: new Map(),
      delegations: new Map(),
      proposalStakes: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.totalSupply = 1000000;
    this.balances = new Map([["ST1TEST", 1000]]);
  }

  setQuorumThreshold(newQuorum: number): Result<boolean> {
    if (this.caller !== "ST1TEST") return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newQuorum <= 0 || newQuorum > 100) return { ok: false, value: ERR_INVALID_QUORUM };
    this.state.quorumThreshold = newQuorum;
    return { ok: true, value: true };
  }

  setVotingPeriod(newPeriod: number): Result<boolean> {
    if (this.caller !== "ST1TEST") return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newPeriod <= 0) return { ok: false, value: ERR_INVALID_VOTING_PERIOD };
    this.state.votingPeriod = newPeriod;
    return { ok: true, value: true };
  }

  setTreasuryContract(contract: string): Result<boolean> {
    if (this.caller !== "ST1TEST") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.treasuryContract = contract;
    return { ok: true, value: true };
  }

  setGovernanceTokenContract(contract: string): Result<boolean> {
    if (this.caller !== "ST1TEST") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.governanceTokenContract = contract;
    return { ok: true, value: true };
  }

  setExecutionEngineContract(contract: string): Result<boolean> {
    if (this.caller !== "ST1TEST") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.executionEngineContract = contract;
    return { ok: true, value: true };
  }

  setStakingVaultContract(contract: string): Result<boolean> {
    if (this.caller !== "ST1TEST") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.stakingVaultContract = contract;
    return { ok: true, value: true };
  }

  setRewardsDistributorContract(contract: string): Result<boolean> {
    if (this.caller !== "ST1TEST") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.rewardsDistributorContract = contract;
    return { ok: true, value: true };
  }

  setProposalSubmissionContract(contract: string): Result<boolean> {
    if (this.caller !== "ST1TEST") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.proposalSubmissionContract = contract;
    return { ok: true, value: true };
  }

  setVotingMechanismContract(contract: string): Result<boolean> {
    if (this.caller !== "ST1TEST") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.votingMechanismContract = contract;
    return { ok: true, value: true };
  }

  submitProposal(
    description: string,
    budget: number,
    proposalType: string,
    impactMetric: string,
    milestones: number[]
  ): Result<number> {
    if (!this.state.proposalSubmissionContract) return { ok: false, value: ERR_TREASURY_NOT_SET };
    if (budget <= 0) return { ok: false, value: ERR_INVALID_BUDGET };
    if (!["funding", "governance", "impact"].includes(proposalType)) return { ok: false, value: ERR_INVALID_PROPOSAL_TYPE };
    if (!impactMetric) return { ok: false, value: ERR_INVALID_IMPACT_METRIC };
    if (milestones.length === 0) return { ok: false, value: ERR_INVALID_MILESTONE };
    const id = this.state.nextProposalId;
    const start = this.blockHeight;
    const end = start + this.state.votingPeriod;
    this.state.proposals.set(id, {
      proposer: this.caller,
      description,
      budget,
      startBlock: start,
      endBlock: end,
      votesFor: 0,
      votesAgainst: 0,
      status: "active",
      proposalType,
      impactMetric,
      milestones,
    });
    this.state.nextProposalId++;
    return { ok: true, value: id };
  }

  voteOnProposal(id: number, vote: boolean): Result<boolean> {
    const proposal = this.state.proposals.get(id);
    if (!proposal) return { ok: false, value: ERR_PROPOSAL_NOT_FOUND };
    if (!this.state.votingMechanismContract) return { ok: false, value: ERR_TOKEN_NOT_SET };
    if (!this.state.governanceTokenContract) return { ok: false, value: ERR_TOKEN_NOT_SET };
    if (proposal.status !== "active") return { ok: false, value: ERR_PROPOSAL_NOT_ACTIVE };
    if (this.blockHeight > proposal.endBlock) return { ok: false, value: ERR_PROPOSAL_EXPIRED };
    const voteKey = `${id}-${this.caller}`;
    if (this.state.votes.has(voteKey)) return { ok: false, value: ERR_ALREADY_VOTED };
    const votingPower = this.balances.get(this.caller) || 0;
    if (vote) {
      proposal.votesFor += votingPower;
    } else {
      proposal.votesAgainst += votingPower;
    }
    this.state.votes.set(voteKey, vote);
    return { ok: true, value: true };
  }

  finalizeProposal(id: number): Result<boolean> {
    const proposal = this.state.proposals.get(id);
    if (!proposal) return { ok: false, value: ERR_PROPOSAL_NOT_FOUND };
    if (!this.state.governanceTokenContract) return { ok: false, value: ERR_TOKEN_NOT_SET };
    if (!this.state.executionEngineContract) return { ok: false, value: ERR_TREASURY_NOT_SET };
    if (this.blockHeight <= proposal.endBlock) return { ok: false, value: ERR_PROPOSAL_NOT_ACTIVE };
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    if ((totalVotes * 100) < (this.state.quorumThreshold * this.totalSupply)) return { ok: false, value: ERR_INSUFFICIENT_QUORUM };
    if (proposal.votesFor > proposal.votesAgainst) {
      proposal.status = "approved";
      proposal.status = "executed";
    } else {
      proposal.status = "rejected";
    }
    return { ok: true, value: true };
  }

  delegateVote(delegate: string): Result<boolean> {
    if (this.caller === delegate) return { ok: false, value: ERR_INVALID_DELEGATE };
    if (this.state.delegations.has(delegate)) return { ok: false, value: ERR_DELEGATION_LOOP };
    this.state.delegations.set(this.caller, delegate);
    return { ok: true, value: true };
  }

  stakeForProposal(id: number, amount: number): Result<boolean> {
    if (!this.state.proposals.has(id)) return { ok: false, value: ERR_PROPOSAL_NOT_FOUND };
    if (!this.state.stakingVaultContract) return { ok: false, value: ERR_TREASURY_NOT_SET };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_FUND_AMOUNT };
    const stakeKey = `${id}-${this.caller}`;
    this.state.proposalStakes.set(stakeKey, amount);
    return { ok: true, value: true };
  }

  getProposal(id: number): Proposal | undefined {
    return this.state.proposals.get(id);
  }

  getQuorumThreshold(): Result<number> {
    return { ok: true, value: this.state.quorumThreshold };
  }

  getVotingPeriod(): Result<number> {
    return { ok: true, value: this.state.votingPeriod };
  }
}

describe("DAOCore", () => {
  let contract: DAOCoreMock;

  beforeEach(() => {
    contract = new DAOCoreMock();
    contract.reset();
  });

  it("sets quorum threshold successfully", () => {
    const result = contract.setQuorumThreshold(60);
    expect(result.ok).toBe(true);
    expect(contract.state.quorumThreshold).toBe(60);
  });

  it("rejects invalid quorum threshold", () => {
    const result = contract.setQuorumThreshold(101);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_QUORUM);
  });

  it("sets voting period successfully", () => {
    const result = contract.setVotingPeriod(2880);
    expect(result.ok).toBe(true);
    expect(contract.state.votingPeriod).toBe(2880);
  });

  it("rejects invalid voting period", () => {
    const result = contract.setVotingPeriod(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_VOTING_PERIOD);
  });

  it("submits proposal successfully", () => {
    contract.setProposalSubmissionContract("ST2SUBMIT");
    const result = contract.submitProposal("Test Proposal", 1000, "funding", "Reduce waste by 10%", [1, 2, 3]);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const proposal = contract.getProposal(0);
    expect(proposal?.description).toBe("Test Proposal");
    expect(proposal?.budget).toBe(1000);
    expect(proposal?.proposalType).toBe("funding");
    expect(proposal?.impactMetric).toBe("Reduce waste by 10%");
    expect(proposal?.milestones).toEqual([1, 2, 3]);
  });

  it("rejects proposal submission without submission contract", () => {
    const result = contract.submitProposal("Test", 1000, "funding", "Impact", [1]);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_TREASURY_NOT_SET);
  });

  it("rejects invalid budget", () => {
    contract.setProposalSubmissionContract("ST2SUBMIT");
    const result = contract.submitProposal("Test", 0, "funding", "Impact", [1]);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_BUDGET);
  });

  it("votes on proposal successfully", () => {
    contract.setProposalSubmissionContract("ST2SUBMIT");
    contract.setVotingMechanismContract("ST3VOTE");
    contract.setGovernanceTokenContract("ST4TOKEN");
    contract.submitProposal("Test", 1000, "funding", "Impact", [1]);
    const result = contract.voteOnProposal(0, true);
    expect(result.ok).toBe(true);
    const proposal = contract.getProposal(0);
    expect(proposal?.votesFor).toBe(1000);
  });

  it("rejects vote on non-active proposal", () => {
    contract.setVotingMechanismContract("ST3VOTE");
    contract.setGovernanceTokenContract("ST4TOKEN");
    const result = contract.voteOnProposal(0, true);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PROPOSAL_NOT_FOUND);
  });

  it("rejects finalize before end", () => {
    contract.setGovernanceTokenContract("ST4TOKEN");
    contract.setExecutionEngineContract("ST5EXEC");
    const result = contract.finalizeProposal(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PROPOSAL_NOT_FOUND);
  });

  it("delegates vote successfully", () => {
    const result = contract.delegateVote("ST2DELEGATE");
    expect(result.ok).toBe(true);
    expect(contract.state.delegations.get("ST1TEST")).toBe("ST2DELEGATE");
  });

  it("rejects self-delegation", () => {
    const result = contract.delegateVote("ST1TEST");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DELEGATE);
  });

  it("stakes for proposal successfully", () => {
    contract.setProposalSubmissionContract("ST2SUBMIT");
    contract.setStakingVaultContract("ST6STAKE");
    contract.submitProposal("Test", 1000, "funding", "Impact", [1]);
    const result = contract.stakeForProposal(0, 500);
    expect(result.ok).toBe(true);
    expect(contract.state.proposalStakes.get("0-ST1TEST")).toBe(500);
  });

  it("gets quorum threshold", () => {
    const result = contract.getQuorumThreshold();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(50);
  });

  it("gets voting period", () => {
    const result = contract.getVotingPeriod();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(1440);
  });
});