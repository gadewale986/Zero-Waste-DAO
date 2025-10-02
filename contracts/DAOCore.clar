(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-PROPOSAL-ID u101)
(define-constant ERR-INVALID-QUORUM u102)
(define-constant ERR-INVALID-VOTING-PERIOD u103)
(define-constant ERR-PROPOSAL-NOT-ACTIVE u104)
(define-constant ERR-ALREADY-VOTED u105)
(define-constant ERR-PROPOSAL-EXPIRED u106)
(define-constant ERR-INSUFFICIENT-QUORUM u107)
(define-constant ERR-PROPOSAL-NOT-FOUND u108)
(define-constant ERR-INVALID-STATUS u109)
(define-constant ERR-INVALID-FUND-AMOUNT u110)
(define-constant ERR-TREASURY-NOT-SET u111)
(define-constant ERR-TOKEN-NOT-SET u112)
(define-constant ERR-EXECUTION-FAILED u113)
(define-constant ERR-INVALID-MILESTONE u114)
(define-constant ERR-INVALID-PROPOSER u115)
(define-constant ERR-INVALID-VOTE u116)
(define-constant ERR-INVALID-DELEGATE u117)
(define-constant ERR-DELEGATION-LOOP u118)
(define-constant ERR-INVALID-REWARD u119)
(define-constant ERR-INVALID-STAKE u120)
(define-constant ERR-STAKING-NOT-REQUIRED u121)
(define-constant ERR-INVALID-SLASH-RATE u122)
(define-constant ERR-INVALID-PROPOSAL-TYPE u123)
(define-constant ERR-INVALID-IMPACT-METRIC u124)
(define-constant ERR-INVALID-BUDGET u125)

(define-data-var next-proposal-id uint u0)
(define-data-var quorum-threshold uint u50)
(define-data-var voting-period uint u1440)
(define-data-var treasury-contract (optional principal) none)
(define-data-var governance-token-contract (optional principal) none)
(define-data-var execution-engine-contract (optional principal) none)
(define-data-var staking-vault-contract (optional principal) none)
(define-data-var rewards-distributor-contract (optional principal) none)
(define-data-var proposal-submission-contract (optional principal) none)
(define-data-var voting-mechanism-contract (optional principal) none)

(define-map proposals
  uint
  {
    proposer: principal,
    description: (string-utf8 500),
    budget: uint,
    start-block: uint,
    end-block: uint,
    votes-for: uint,
    votes-against: uint,
    status: (string-ascii 20),
    proposal-type: (string-ascii 50),
    impact-metric: (string-utf8 100),
    milestones: (list 10 uint)
  }
)

(define-map votes
  { proposal-id: uint, voter: principal }
  bool
)

(define-map delegations
  principal
  principal
)

(define-map proposal-stakes
  { proposal-id: uint, staker: principal }
  uint
)

(define-read-only (get-proposal (id uint))
  (map-get? proposals id)
)

(define-read-only (get-vote (id uint) (voter principal))
  (map-get? votes { proposal-id: id, voter: voter })
)

(define-read-only (get-delegation (delegator principal))
  (map-get? delegations delegator)
)

(define-read-only (get-proposal-stake (id uint) (staker principal))
  (map-get? proposal-stakes { proposal-id: id, staker: staker })
)

(define-read-only (get-quorum-threshold)
  (ok (var-get quorum-threshold))
)

(define-read-only (get-voting-period)
  (ok (var-get voting-period))
)

(define-private (validate-quorum (quorum uint))
  (if (and (> quorum u0) (<= quorum u100))
    (ok true)
    (err ERR-INVALID-QUORUM))
)

(define-private (validate-voting-period (period uint))
  (if (> period u0)
    (ok true)
    (err ERR-INVALID-VOTING-PERIOD))
)

(define-private (validate-proposal-id (id uint))
  (if (is-some (map-get? proposals id))
    (ok true)
    (err ERR-PROPOSAL-NOT-FOUND))
)

(define-private (validate-status (status (string-ascii 20)))
  (if (or (is-eq status "active") (is-eq status "approved") (is-eq status "rejected") (is-eq status "executed"))
    (ok true)
    (err ERR-INVALID-STATUS))
)

(define-private (validate-fund-amount (amount uint))
  (if (> amount u0)
    (ok true)
    (err ERR-INVALID-FUND-AMOUNT))
)

(define-private (validate-proposal-type (type (string-ascii 50)))
  (if (or (is-eq type "funding") (is-eq type "governance") (is-eq type "impact"))
    (ok true)
    (err ERR-INVALID-PROPOSAL-TYPE))
)

(define-private (validate-impact-metric (metric (string-utf8 100)))
  (if (> (len metric) u0)
    (ok true)
    (err ERR-INVALID-IMPACT-METRIC))
)

(define-private (validate-budget (budget uint))
  (if (> budget u0)
    (ok true)
    (err ERR-INVALID-BUDGET))
)

(define-private (validate-milestones (milestones (list 10 uint)))
  (if (> (len milestones) u0)
    (ok true)
    (err ERR-INVALID-MILESTONE))
)

(define-private (is-authorized (caller principal))
  (if (is-eq caller contract-caller)
    (ok true)
    (err ERR-NOT-AUTHORIZED))
)

(define-public (set-quorum-threshold (new-quorum uint))
  (begin
    (try! (is-authorized tx-sender))
    (try! (validate-quorum new-quorum))
    (var-set quorum-threshold new-quorum)
    (ok true)
  )
)

(define-public (set-voting-period (new-period uint))
  (begin
    (try! (is-authorized tx-sender))
    (try! (validate-voting-period new-period))
    (var-set voting-period new-period)
    (ok true)
  )
)

(define-public (set-treasury-contract (contract principal))
  (begin
    (try! (is-authorized tx-sender))
    (var-set treasury-contract (some contract))
    (ok true)
  )
)

(define-public (set-governance-token-contract (contract principal))
  (begin
    (try! (is-authorized tx-sender))
    (var-set governance-token-contract (some contract))
    (ok true)
  )
)

(define-public (set-execution-engine-contract (contract principal))
  (begin
    (try! (is-authorized tx-sender))
    (var-set execution-engine-contract (some contract))
    (ok true)
  )
)

(define-public (set-staking-vault-contract (contract principal))
  (begin
    (try! (is-authorized tx-sender))
    (var-set staking-vault-contract (some contract))
    (ok true)
  )
)

(define-public (set-rewards-distributor-contract (contract principal))
  (begin
    (try! (is-authorized tx-sender))
    (var-set rewards-distributor-contract (some contract))
    (ok true)
  )
)

(define-public (set-proposal-submission-contract (contract principal))
  (begin
    (try! (is-authorized tx-sender))
    (var-set proposal-submission-contract (some contract))
    (ok true)
  )
)

(define-public (set-voting-mechanism-contract (contract principal))
  (begin
    (try! (is-authorized tx-sender))
    (var-set voting-mechanism-contract (some contract))
    (ok true)
  )
)

(define-public (submit-proposal
  (description (string-utf8 500))
  (budget uint)
  (proposal-type (string-ascii 50))
  (impact-metric (string-utf8 100))
  (milestones (list 10 uint))
)
  (let (
    (id (var-get next-proposal-id))
    (start block-height)
    (end (+ start (var-get voting-period)))
    (submission-contract (unwrap! (var-get proposal-submission-contract) (err ERR-TREASURY-NOT-SET)))
  )
    (try! (contract-call? submission-contract submit-proposal id tx-sender description budget proposal-type impact-metric milestones))
    (try! (validate-budget budget))
    (try! (validate-proposal-type proposal-type))
    (try! (validate-impact-metric impact-metric))
    (try! (validate-milestones milestones))
    (map-set proposals id
      {
        proposer: tx-sender,
        description: description,
        budget: budget,
        start-block: start,
        end-block: end,
        votes-for: u0,
        votes-against: u0,
        status: "active",
        proposal-type: proposal-type,
        impact-metric: impact-metric,
        milestones: milestones
      }
    )
    (var-set next-proposal-id (+ id u1))
    (print { event: "proposal-submitted", id: id })
    (ok id)
  )
)

(define-public (vote-on-proposal (id uint) (vote bool))
  (let (
    (proposal (unwrap! (map-get? proposals id) (err ERR-PROPOSAL-NOT-FOUND)))
    (voting-contract (unwrap! (var-get voting-mechanism-contract) (err ERR-TOKEN-NOT-SET)))
    (token-contract (unwrap! (var-get governance-token-contract) (err ERR-TOKEN-NOT-SET)))
  )
    (asserts! (is-eq (get status proposal) "active") (err ERR-PROPOSAL-NOT-ACTIVE))
    (asserts! (<= block-height (get end-block proposal)) (err ERR-PROPOSAL-EXPIRED))
    (asserts! (is-none (map-get? votes { proposal-id: id, voter: tx-sender })) (err ERR-ALREADY-VOTED))
    (try! (contract-call? voting-contract cast-vote id tx-sender vote))
    (let ((voting-power (unwrap! (as-contract (contract-call? token-contract get-balance tx-sender)) (err ERR-NOT-AUTHORIZED))))
      (if vote
        (map-set proposals id (merge proposal { votes-for: (+ (get votes-for proposal) voting-power) }))
        (map-set proposals id (merge proposal { votes-against: (+ (get votes-against proposal) voting-power) }))
      )
    )
    (map-set votes { proposal-id: id, voter: tx-sender } vote)
    (print { event: "vote-cast", id: id, voter: tx-sender, vote: vote })
    (ok true)
  )
)

(define-public (finalize-proposal (id uint))
  (let (
    (proposal (unwrap! (map-get? proposals id) (err ERR-PROPOSAL-NOT-FOUND)))
    (total-votes (+ (get votes-for proposal) (get votes-against proposal)))
    (quorum (var-get quorum-threshold))
    (token-contract (unwrap! (var-get governance-token-contract) (err ERR-TOKEN-NOT-SET)))
    (total-supply (unwrap! (as-contract (contract-call? token-contract get-total-supply)) (err ERR-NOT-AUTHORIZED)))
    (execution-contract (unwrap! (var-get execution-engine-contract) (err ERR-TREASURY-NOT-SET)))
  )
    (asserts! (> block-height (get end-block proposal)) (err ERR-PROPOSAL-NOT-ACTIVE))
    (asserts! (>= (* total-votes u100) (* quorum total-supply)) (err ERR-INSUFFICIENT-QUORUM))
    (if (> (get votes-for proposal) (get votes-against proposal))
      (begin
        (map-set proposals id (merge proposal { status: "approved" }))
        (try! (contract-call? execution-contract execute-proposal id (get budget proposal)))
        (map-set proposals id (merge proposal { status: "executed" }))
        (print { event: "proposal-executed", id: id })
      )
      (map-set proposals id (merge proposal { status: "rejected" }))
    )
    (ok true)
  )
)

(define-public (delegate-vote (delegate principal))
  (begin
    (asserts! (not (is-eq tx-sender delegate)) (err ERR-INVALID-DELEGATE))
    (asserts! (is-none (map-get? delegations delegate)) (err ERR-DELEGATION-LOOP))
    (map-set delegations tx-sender delegate)
    (ok true)
  )
)

(define-public (stake-for-proposal (id uint) (amount uint))
  (let (
    (staking-contract (unwrap! (var-get staking-vault-contract) (err ERR-TREASURY-NOT-SET)))
  )
    (try! (validate-proposal-id id))
    (try! (validate-fund-amount amount))
    (try! (contract-call? staking-contract stake-tokens tx-sender amount id))
    (map-set proposal-stakes { proposal-id: id, staker: tx-sender } amount)
    (ok true)
  )
)