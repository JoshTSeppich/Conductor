/**
 * Persist module barrel — generic atomic-JSON helpers used by the
 * daemon's registry layer (WB6 wires migration/schema-v2.ts through).
 */
export { writeAtomicJson, type WriteAtomicJsonOpts } from './atomic-write.js';
export {
  readJsonWithRecovery,
  type ReadJsonWithRecoveryOpts,
} from './read-with-recovery.js';
