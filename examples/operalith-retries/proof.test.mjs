import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fixture, workspaceId, request } from './harness.mjs';
const save = (repo, body) => repo.mutate(workspaceId, body);

test('packaged extracted code matches recorded SHA-256 values', () => {
  const manifest = JSON.parse(readFileSync(new URL('./provenance.json', import.meta.url)));
  for (const item of manifest.source) {
    const bytes = readFileSync(new URL(item.packagedFile, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.packagedSHA256);
    const excerpt = bytes.subarray(Buffer.byteLength(item.prependedText));
    assert.equal(createHash('sha256').update(excerpt).digest('hex'), item.excerptSHA256);
  }
});
test('first save returns expected revision and IDs, writes exactly one synthetic record/receipt/audit', () => {
  const { repo, state } = fixture();
  assert.deepEqual(save(repo, request()), { revision: 1, toolId: 'synthetic-tool', changeId: 'change-1' });
  assert.deepEqual(state.workspace.tools[0].records, [{ id: 'record-1', title: 'Fictional task' }]);
  assert.equal(state.revision, 1);
  assert.equal(state.persistCalls, 1);
  assert.equal(state.receipts.length, 1);
  assert.equal(state.audit.length, 1);
});
test('retry after discarded response returns stored result without any duplicate write', () => {
  const { repo, state } = fixture();
  save(repo, request()); // Simulates caller discarding a completed return, NOT network failure.
  const before = structuredClone(state);
  assert.deepEqual(save(repo, request()), { revision: 1, toolId: 'synthetic-tool', changeId: 'change-1', replay: true });
  assert.deepEqual(state, before);
});
test('retry still replays original result after a later successful edit', () => {
  const { repo, state } = fixture();
  save(repo, request());
  save(repo, request('synthetic-key-0002', 1, 'Later fictional task'));
  const before = structuredClone(state);
  assert.deepEqual(save(repo, request()), { revision: 1, toolId: 'synthetic-tool', changeId: 'change-1', replay: true });
  assert.equal(state.revision, 2);
  assert.deepEqual(state, before);
});
test('same operation key with changed content is a conflict with zero additional writes', () => {
  const { repo, state } = fixture();
  save(repo, request());
  const before = structuredClone(state);
  assert.throws(() => save(repo, request('synthetic-key-0001', 0, 'Different task')), {
    status: 409, message: 'Operation key reused with different content.',
  });
  assert.deepEqual(state, before);
});
test('new operation key with stale revision is a conflict with zero writes', () => {
  const { repo, state } = fixture();
  save(repo, request());
  const before = structuredClone(state);
  assert.throws(() => save(repo, request('synthetic-key-0002', 0)), error => error.status === 409 && /changed in another session/.test(error.message));
  assert.deepEqual(state, before);
});
test('stored receipt cannot bypass admission check (stubbed denial)', () => {
  const { repo, state } = fixture();
  save(repo, request());
  state.allowed = false;
  const before = structuredClone(state);
  assert.throws(() => save(repo, request()), { status: 404 });
  assert.deepEqual(state, before);
});
