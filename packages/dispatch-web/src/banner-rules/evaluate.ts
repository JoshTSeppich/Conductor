import type { EventV2Type } from 'dispatch-core/src/v2/schema.js';
import type { Banner } from '../store/ui.js';

// T21: §2.6 rule table codified as pure function. Returns banner
// data when (event, flag) maps to a banner-producing cell; null
// otherwise. Discriminated-union exhaustive switch + TS error if
// EventV2 schema gains a new type without updating this map.
//
// MODELED — banner copy text. Spec doesn't prescribe specific
// strings; UI-F-banner-copy followup territory for post-MVP
// audit. Per Decision 3 + operator pre-reg ack: ship with flag.
//   - cairn=error matches T13 "Invalid transition" severity
//   - gate_trip=warn distinguishes "operator-action-required"
//     from "violation"
//   - handoff=info matches T15/T16 success-toast convention
//
// Authority: TICKETS.md §2.6 rule table verbatim. Rule-execution
// truth source. DAEMON-S03 ADR supplies cross-session rationale
// (graceful-degradation when notifications_available=false) but
// §2.6 wins on conflicts per finding-#15 + finding-#45 multi-
// source authority mapping.
export type BannerData = Omit<Banner, 'id' | 'createdAt'>;

export function evaluateBannerRule(
  event: EventV2Type,
  notificationsAvailable: boolean,
): BannerData | null {
  switch (event.type) {
    case 'handoff_written':
      // §2.6: flag=true → no banner (native fired). flag=false →
      // toast (auto-dismiss, 5s) per Decision 4 in pushBanner.
      if (notificationsAvailable) return null;
      return {
        kind: 'toast',
        severity: 'info',
        title: `Handoff written for ${event.session}`,
      };
    case 'cairn_violation_detected':
      // §2.6: sticky regardless of flag (defense in depth when
      // native fires too — duplicate attention is benign per
      // DAEMON-S03 §"Graceful degradation").
      return {
        kind: 'sticky',
        severity: 'error',
        title: `Cairn violation in ${event.session}`,
        body: `${event.data.violation_type}: ${event.data.details}`,
      };
    case 'gate_trip':
      // §2.6: sticky regardless of flag. DAEMON-S03 §"Event-to-
      // notification mapping" said gate_trip "deferred to ticket
      // time"; §2.6 resolved to sticky always. §2.6 wins per
      // finding-#15.
      return {
        kind: 'sticky',
        severity: 'warn',
        title: `Gate trip in ${event.session}`,
        body: `${event.data.gate_name}: ${event.data.expected_action}`,
      };
    case 'state_changed':
    case 'prompt_sent':
    case 'test_status_updated':
    case 'commit_landed':
      // §2.6: none for both flag states. State_changed surfaces
      // via kanban; prompt/commit via ticker; test_status via
      // focused detail. Banner would duplicate existing surfaces.
      return null;
  }
}
