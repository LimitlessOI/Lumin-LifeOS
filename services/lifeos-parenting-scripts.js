/**
 * SYNOPSIS: Age-specific parenting script library for common ruptures.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const LIBRARY = [
  {
    id: 'tantrum-toddler',
    ages: [1, 2, 3, 4],
    situation: 'tantrum',
    script: 'I see big feelings. I am right here. We can breathe together when you are ready.',
    developmental_read: 'Toddlers borrow your calm; naming the feeling is the repair.',
  },
  {
    id: 'meltdown-school',
    ages: [5, 6, 7, 8, 9],
    situation: 'meltdown',
    script: 'Your body is overloaded. We can pause. You are safe with me.',
    developmental_read: 'School-age meltdowns are often sensory/load, not defiance.',
  },
  {
    id: 'sibling-conflict',
    ages: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    situation: 'sibling_conflict',
    script: 'I will not pick a winner. Each of you gets a turn to say what you needed.',
    developmental_read: 'Fairness > verdicts. Coaching turn-taking builds repair skill.',
  },
  {
    id: 'screen-pushback',
    ages: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    situation: 'screen_pushback',
    script: 'Screens are done for now. I know that is hard. What is the next small thing we do together?',
    developmental_read: 'Offer a bridge activity; avoid debating the limit mid-protest.',
  },
  {
    id: 'bedtime',
    ages: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    situation: 'bedtime',
    script: 'Bodies need rest to grow. I will stay close for one more minute, then lights down.',
    developmental_read: 'Predictable close + presence beats new negotiations.',
  },
  {
    id: 'teen-pushback',
    ages: [13, 14, 15, 16, 17],
    situation: 'screen_pushback',
    script: 'I am not fighting you. The limit stands. I still want to hear what this matters for.',
    developmental_read: 'Autonomy + relationship: hold the boundary, invite the why.',
  },
];

export function createParentingScriptService() {
  return {
    listSituations() {
      return [...new Set(LIBRARY.map((x) => x.situation))];
    },

    /**
     * @param {{ childAge?: number, situation?: string }} opts
     */
    getScripts({ childAge = null, situation = null } = {}) {
      let rows = LIBRARY.slice();
      if (situation) {
        const s = String(situation).toLowerCase();
        rows = rows.filter((r) => r.situation === s || r.situation.includes(s));
      }
      if (childAge != null && Number.isFinite(Number(childAge))) {
        const age = Number(childAge);
        rows = rows.filter((r) => r.ages.includes(age));
      }
      if (!rows.length) rows = LIBRARY.filter((r) => r.situation === 'meltdown').slice(0, 2);
      return {
        ok: true,
        scripts: rows.map(({ id, situation: sit, script, developmental_read, ages }) => ({
          id,
          situation: sit,
          script,
          developmental_read,
          ages,
        })),
      };
    },

    oneLiner({ childAge = null, situation = 'meltdown' } = {}) {
      const { scripts } = this.getScripts({ childAge, situation });
      const top = scripts[0];
      return {
        ok: true,
        script: top?.script || 'I am here. We can figure the next step together.',
        developmental_read: top?.developmental_read || null,
        situation: top?.situation || situation,
      };
    },
  };
}