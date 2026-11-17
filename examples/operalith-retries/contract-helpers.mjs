import { createHash } from 'node:crypto';

export const accountFail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
export const accountEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const accountFingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
