#!/usr/bin/env node
/**
 * SYNOPSIS: Prototype V5 — Cross-Domain Personal Intelligence.
 * Maintains per-domain data silos, explicit cross-domain consent, audit logging,
 * and multi-domain inference under founder authority.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import assert from 'node:assert';

const DEFAULT_POLICIES = {
  calendar: { sensitive: false, shareByDefault: ['time', 'free_busy'] },
  tasks: { sensitive: false, shareByDefault: ['title', 'due'] },
  finance: { sensitive: true, shareByDefault: [] },
  health: { sensitive: true, shareByDefault: [] },
  contacts: { sensitive: false, shareByDefault: ['name'] },
};

export class Domain {
  constructor(id, label, policy = DEFAULT_POLICIES[id] || { sensitive: false, shareByDefault: [] }) {
    this.id = id;
    this.label = label;
    this.policy = policy;
    this.records = [];
    this.accessLog = [];
    this.sharedWith = new Map(); // target -> Set of fields
  }

  addRecord(record) {
    this.records.push({ id: `rec-${this.records.length + 1}`, ...record, addedAt: new Date().toISOString() });
    return this.records.at(-1);
  }

  query(predicate) {
    this.accessLog.push({ at: new Date().toISOString(), predicate: typeof predicate === 'function' ? 'function' : 'all' });
    return this.records.filter(predicate || (() => true));
  }

  grantConsent(targetDomainId, fields = []) {
    const set = this.sharedWith.get(targetDomainId) || new Set();
    for (const f of fields) set.add(f);
    this.sharedWith.set(targetDomainId, set);
    return [...set];
  }

  revokeConsent(targetDomainId) {
    this.sharedWith.delete(targetDomainId);
  }

  canShare(targetDomainId, field) {
    if (this.policy.sensitive && !this.sharedWith.has(targetDomainId)) return false;
    if (this.sharedWith.has(targetDomainId) && this.sharedWith.get(targetDomainId).has(field)) return true;
    if (this.policy.shareByDefault.includes(field)) return true;
    return false;
  }
}

export class PersonalIntelligence {
  constructor(userId, options = {}) {
    this.userId = userId;
    this.domains = new Map();
    this.receipts = [];
    this.options = options;
  }

  addDomain(domain) {
    this.domains.set(domain.id, domain);
    return domain;
  }

  log(action, details) {
    const receipt = { at: new Date().toISOString(), action, details };
    this.receipts.push(receipt);
    return receipt;
  }

  requestShare(sourceId, targetId, fields, reason) {
    const source = this.domains.get(sourceId);
    if (!source) throw new Error(`Unknown source domain ${sourceId}`);
    if (source.policy.sensitive && !fields.length) throw new Error(`Sensitive domain ${sourceId} requires explicit field list`);
    source.grantConsent(targetId, fields);
    return this.log('consent_granted', { sourceId, targetId, fields, reason });
  }

  queryCrossDomain(question, options = {}) {
    const lower = question.toLowerCase();
    const result = { question, answer: null, sources: [], blocked: [], confidence: 0 };

    if (lower.includes('free') || lower.includes('available') || /\bat\s+\d+(?::\d+)?\s*(am|pm)?/.test(lower)) {
      const calendar = this.domains.get('calendar');
      const tasks = this.domains.get('tasks');
      const contacts = this.domains.get('contacts');
      if (calendar) {
        result.sources.push({ domain: 'calendar', fields: ['time', 'free_busy'] });
        const events = calendar.query((r) => lower.includes(r.time?.toLowerCase?.()));
        result.answer = { free: !(events && events.length), events: events || [] };
        result.confidence = 0.75;
      }
      if (tasks) result.sources.push({ domain: 'tasks', fields: ['title', 'due'] });
      if (contacts && this.domains.get('contacts')?.canShare('calendar', 'name')) result.sources.push({ domain: 'contacts', fields: ['name'] });
    } else if (lower.includes('afford') || lower.includes('budget') || lower.includes('cost') || lower.includes('spend')) {
      const finance = this.domains.get('finance');
      if (!finance) return { ...result, answer: 'No finance domain available.', confidence: 0 };
      const accessible = finance.policy.shareByDefault.includes('balance') || finance.canShare('assistant', 'balance');
      if (!accessible) {
        result.blocked.push({ domain: 'finance', field: 'balance' });
        result.answer = 'Finance data is sensitive; explicit consent required to answer.';
        result.confidence = 0;
      } else {
        const balance = finance.query((r) => r.type === 'account')[0]?.balance;
        result.answer = { balance, assessment: balance > 1000 ? 'likely affordable' : 'check budget' };
        result.sources.push({ domain: 'finance', fields: ['balance'] });
        result.confidence = 0.8;
      }
    } else if (lower.includes('meeting') || lower.includes('prep')) {
      const calendar = this.domains.get('calendar');
      const tasks = this.domains.get('tasks');
      const contacts = this.domains.get('contacts');
      const events = calendar ? calendar.query() : [];
      const taskList = tasks ? tasks.query() : [];
      result.answer = { events, prepTasks: taskList };
      result.confidence = 0.6;
      if (calendar) result.sources.push({ domain: 'calendar', fields: ['time', 'title'] });
      if (tasks) result.sources.push({ domain: 'tasks', fields: ['title', 'due'] });
      if (contacts && contacts.canShare('assistant', 'name')) result.sources.push({ domain: 'contacts', fields: ['name'] });
    } else if (lower.includes('health') || lower.includes('tired') || lower.includes('sleep') || lower.includes('energy')) {
      const health = this.domains.get('health');
      if (!health) return { ...result, answer: 'No health domain available.', confidence: 0 };
      if (!health.canShare('assistant', 'sleep')) {
        result.blocked.push({ domain: 'health', field: 'sleep' });
        result.answer = 'Health data is sensitive; explicit consent required.';
      } else {
        const last = health.query().at(-1);
        result.answer = last ? { sleep: last.sleep, energy: last.energy } : 'No recent health records.';
        result.sources.push({ domain: 'health', fields: ['sleep', 'energy'] });
        result.confidence = last ? 0.8 : 0.4;
      }
    } else {
      result.answer = 'I need more context to answer that cross-domain question.';
      result.confidence = 0;
    }

    this.log('cross_domain_query', { question, result });
    return result;
  }

  getUnifiedProfile(consentedOnly = true) {
    const profile = { userId: this.userId, domains: {} };
    for (const [id, domain] of this.domains) {
      const visible = consentedOnly ? domain.policy.shareByDefault : Object.keys(domain.records[0] || {});
      profile.domains[id] = {
        label: domain.label,
        recordCount: domain.records.length,
        visibleFields: consentedOnly ? visible : visible,
      };
    }
    return profile;
  }
}

function selfTest() {
  const pi = new PersonalIntelligence('user-1');
  const calendar = pi.addDomain(new Domain('calendar', 'Calendar'));
  calendar.addRecord({ title: 'Sprint review', time: '3pm', date: '2026-08-07' });
  const finance = pi.addDomain(new Domain('finance', 'Finance'));
  finance.addRecord({ type: 'account', balance: 4200 });

  const q1 = pi.queryCrossDomain('Am I free at 3pm?');
  assert.ok(q1.answer.free === false || q1.answer.events.length === 1, 'calendar query works');

  const q2 = pi.queryCrossDomain('Can I afford a $500 expense?');
  assert.ok(q2.blocked.some((b) => b.domain === 'finance'), 'finance blocked without consent');

  pi.requestShare('finance', 'assistant', ['balance'], 'answer affordability question');
  const q3 = pi.queryCrossDomain('Can I afford a $500 expense?');
  assert.ok(q3.answer.assessment, 'finance accessible after consent');

  console.log('Cross-Domain V5 self-tests passed.');
}

if (process.argv.includes('--test')) {
  selfTest();
} else {
  selfTest();
}

export { selfTest };
