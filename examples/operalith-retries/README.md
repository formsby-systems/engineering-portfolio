# Retry versus stale edit: an Operalith source excerpt

**Public code-and-test example.** This package contains real, unchanged Operalith source and a new synthetic test harness. It is an engineering sample, not a production reliability claim.

A save may succeed even if the caller never receives its result. Repeating that exact operation should return its earlier receipt without writing twice. A different operation based on an old revision should fail instead of overwriting newer work.

Read `mutate-method.txt` first: its 27 lines are byte-for-byte `AccountRepository.mutate`, including original whitespace. The method looks up a receipt scoped to workspace, actor and operation key. It compares a SHA-256 fingerprint of the serialized request, returns an exact replay, and only then checks revision freshness for a new operation. Admission is checked before the receipt lookup. `contract-helpers.mjs` contains three unchanged source lines plus a documented built-in crypto import.

From the downloaded folder, run with Node.js (observed version in `test-result.txt`; no dependencies):

```sh
node --test proof.test.mjs
```

Seven tests verify packaged excerpt hashes, expected first-save result and one record/receipt/audit, retry without duplicate writes, retry after a later edit, changed-content conflict, new stale-edit conflict, and admission-check ordering using a stubbed denial. All data are fictional and exist only in memory. Discarding a successful return models uncertainty at the caller; no real network failure is injected.

Download [the complete example ZIP](operalith-retries.zip), or run from the portfolio repository:

```sh
git clone --depth 1 https://github.com/formsby-systems/engineering-portfolio.git
cd engineering-portfolio
node --test examples/operalith-retries/proof.test.mjs
```

The expected result is **7 tests passed, 0 failed**. Read the [unchanged mutation method](mutate-method.txt), [test harness](harness.mjs), and [tests](proof.test.mjs) to inspect the behavior.

## Exactly what is real

Source commit: `c4dd1a3997421be29b3363a9706113a2123ea1db`.

- `src/lib/ecosystem/account-repository.js`, lines 66–92: complete unchanged mutation method.
- `src/lib/ecosystem/account-contract.js`, lines 5–7: unchanged error, equality and fingerprint helpers.
- `provenance.json`: original file hashes, Git blob IDs, extracted hashes, packaging additions and clean-worktree observation. Both source files were compared byte-for-byte with this commit before extraction. No Git author identity is used to claim human authorship or sole ownership.

## Test boundaries and tradeoffs

`harness.mjs` is newly written test support. It executes the fixed local method as a class method and supplies in-memory SQL-shaped adapters. Workspace validation and definition validation are identity stubs. The domain edit is a synthetic append action, not Operalith's real change engine. The transaction adapter simply calls its callback: it supplies no rollback, locks or persistence. Undo/upgrade, receipt-capacity failure, real authentication/authorization, tenant isolation, concurrent requests, process restart, database atomicity and HTTP behavior are not proved here. No production repository or runtime is modified or started.

The real fingerprint uses `JSON.stringify`, so object-property ordering matters. Retry the original serialized request; this does not establish semantic equivalence across differently ordered bodies. A replay returns the original revision/result, which may be older than the latest workspace state. That is intentional receipt behavior, not a fresh read.

## Publication

Dylan Becchetti authorized publication of this specific reviewed source-and-test package on November 17, 2026. It includes no other private project source, credentials, customer records, runtime state or database files. No additional software license is granted by this example. The executable excerpt, helpers, harness and tests are unchanged from the reviewed package; only these release notes and provenance status were updated for publication.
