/**
 * The frozen hand-off footer. Every prompt `fd send` delivers ends with this
 * block (added by `assemble()` if not already present). Claude Code sessions
 * reading their prompt are expected to write `./HANDOFF.md` per this
 * instruction when their phase ends.
 *
 * FROZEN after FD-T04. Changing this string breaks the convention every
 * registered session is expected to follow — requires a freeze(footer)
 * commit and nothing else.
 */
export const HANDOFF_FOOTER = `---
At phase end, write your hand-off note to ./HANDOFF.md.
Overwrite any prior contents. One paragraph. Nothing else in that file.`;
