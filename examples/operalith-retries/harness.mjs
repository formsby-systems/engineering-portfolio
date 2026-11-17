// Test-only adapters. This file is newly written, NOT extracted Operalith code.
import { readFileSync } from 'node:fs';
import {
  accountFail as fail, accountEqual as equal, accountFingerprint as hash,
} from './contract-helpers.mjs';

// Evaluate only the fixed, local, provenance-pinned source excerpt as a class method.
// No implementation lines are rewritten or replaced.
const method = readFileSync(new URL('./mutate-method.txt', import.meta.url), 'utf8');
const identity = value => value;
const applyChange = (before, action) => {
  if (action.type !== 'appendSyntheticRecord') throw new Error('Unsupported fixture action');
  const after = structuredClone(before);
  after.tools[0].records.push({ id: `record-${after.tools[0].records.length + 1}`, title: action.title });
  after.history.push({ id: `change-${after.history.length + 1}` });
  return after;
};
const unsupported = () => { throw new Error('Not covered by this harness'); };
const ExtractedRepository = new Function(
  'fail', 'equal', 'hash', 'accountMutationDefinitions', 'assertAccountWorkspace',
  'validateWorkspace', 'undoChange', 'applyChange',
  `return class ExtractedRepository {\n${method}\n}`,
)(fail, equal, hash, identity, identity, identity, unsupported, applyChange);

export function fixture() {
  const repo = new ExtractedRepository();
  const state = {
    revision: 0, receipts: [], audit: [], persistCalls: 0, allowed: true,
    workspace: { tools: [{ id: 'synthetic-tool', records: [] }], history: [] },
  };
  repo.user = 'synthetic-actor';
  // No SQL engine, locking, rollback, auth session, validation or durable storage is tested.
  repo.transaction = fn => fn();
  repo.admit = id => {
    if (id !== 'synthetic-workspace' || !state.allowed) fail('Workspace unavailable or access denied.', 404);
    return { revision: state.revision, definitionContract: {} };
  };
  repo.snapshot = () => structuredClone(state.workspace);
  repo.persist = after => { state.workspace = structuredClone(after); state.persistCalls++; };
  repo.get = (sql, ...args) => {
    if (sql === 'SELECT * FROM eco_receipt WHERE workspace_id=? AND actor=? AND key=?') {
      return state.receipts.find(row => row.workspace === args[0] && row.actor === args[1] && row.key === args[2]);
    }
    if (sql === 'SELECT count(*) AS n FROM eco_receipt WHERE workspace_id=?') {
      return { n: state.receipts.filter(row => row.workspace === args[0]).length };
    }
    throw new Error(`Unexpected fixture query: ${sql}`);
  };
  repo.run = (sql, ...args) => {
    if (sql === 'UPDATE eco_workspace SET revision=? WHERE id=? AND revision=?') {
      if (state.revision !== args[2]) throw new Error('Fixture revision mismatch');
      state.revision = args[0];
    } else if (sql === 'INSERT INTO eco_audit VALUES(?,?,?,?,?)') {
      state.audit.push(args);
    } else if (sql === 'INSERT INTO eco_receipt VALUES(?,?,?,?,?)') {
      const [workspace, actor, key, fingerprint, result] = args;
      state.receipts.push({ workspace, actor, key, fingerprint, result });
    } else throw new Error(`Unexpected fixture write: ${sql}`);
  };
  return { repo, state };
}
export const workspaceId = 'synthetic-workspace';
export const request = (key = 'synthetic-key-0001', revision = 0, title = 'Fictional task') => ({
  key, revision, action: { type: 'appendSyntheticRecord', toolId: 'synthetic-tool', title },
});
