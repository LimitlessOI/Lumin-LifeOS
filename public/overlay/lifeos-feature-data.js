window.LIFEOS_FEATURE_GUIDES = {
  'lifeos-today.html': {
    title: 'Today',
    short: 'Your operating snapshot for the day: state, priorities, focus, health, and what needs attention.',
    bullets: ['See if you are on track or drifting', 'Review blockers, wins, and the next right move'],
    details: ['Today pulls together your integrity, joy, focus, health, commitments, engine tasks, and the new compound-effect scoreboard.', 'Use it as the first screen in the morning and the reset screen when you drift off track during the day.'],
    visualTitle: 'How Today works',
    visualSteps: ['Read your current state', 'Check compound-effect score', 'Handle blockers first', 'Protect the next focus block'],
    controls: {
      'checkin': {
        title: 'Check In Today',
        short: 'Logs a joy/wellbeing snapshot so Today can measure how you are actually doing instead of assuming.',
        details: ['Use this when you have not yet logged today’s emotional state or when your state has shifted hard enough that Today should react to it.'],
        visualSteps: ['Notice current state', 'Log the check-in', 'Update joy score', 'Adjust today accordingly']
      },
      'focus-start': {
        title: 'Start Focus',
        short: 'Starts a timed focus block tied to a specific intention so LifeOS can measure whether you stayed on task.',
        details: ['Use this before deep work, admin, outreach, or any block you want scored later as on-track or drifting.'],
        visualSteps: ['State intention', 'Start timer', 'Protect the block', 'Review adherence']
      },
      'focus-stop': {
        title: 'End Focus',
        short: 'Closes the current focus block and records how much of it you actually protected.',
        details: ['Use this as soon as the block ends so Today can score your follow-through accurately.'],
        visualSteps: ['Stop block', 'Lock time used', 'Update adherence', 'Reflect on drift']
      },
      'focus-nudge': {
        title: 'Log Nudge',
        short: 'Records that LifeOS had to intervene to get you back on track during the current focus block.',
        details: ['This is part of the attention loop. It measures whether the system is helping and how often you drift.'],
        visualSteps: ['Notice drift', 'Record intervention', 'Track recovery', 'Improve future focus']
      },
      'privacy-1h': {
        title: 'Privacy 1 Hour',
        short: 'Turns on privacy mode for one hour so detailed capture pauses during that window.',
        details: ['Use this when you want a short block of reduced capture without leaving privacy mode on indefinitely.'],
        visualSteps: ['Start privacy window', 'Pause detailed capture', 'Protect the time block', 'Resume automatically']
      },
      'privacy-2h': {
        title: 'Privacy 2 Hours',
        short: 'Turns on privacy mode for two hours with the same protections as the shorter window.',
        details: ['Use this for longer family, recovery, or sensitive blocks where you want LifeOS quiet.'],
        visualSteps: ['Start longer privacy window', 'Pause detailed capture', 'Keep the window bounded', 'Resume automatically']
      },
      'privacy-off': {
        title: 'Privacy Off',
        short: 'Ends the active privacy window and resumes normal capture rules.',
        details: ['Use this when you want LifeOS to start paying attention again before the timer expires.'],
        visualSteps: ['End privacy window', 'Resume capture', 'Restore normal automation']
      },
      'commit-add': {
        title: 'Add Commitment',
        short: 'Creates a new explicit promise so Today and Mirror can hold it visible later.',
        details: ['Use this for anything you are actually putting your word on, not for vague wishes.'],
        visualSteps: ['State the commitment', 'Store it', 'Surface it daily', 'Mark it kept or broken']
      }
    }
  },
  'lifeos-mirror.html': {
    title: 'Mirror',
    short: 'Reflection and truth delivery: what you said you wanted, what you did, and where the gap is.',
    bullets: ['Track integrity against commitments', 'Surface truth without softening it'],
    details: ['Mirror is where LifeOS keeps promises visible and compares them against real behavior over time.', 'It is designed to reduce self-deception, not to shame you.'],
    visualTitle: 'Mirror loop',
    visualSteps: ['Declare intent', 'Log commitments', 'Check outcomes', 'Adjust behavior']
  },
  'lifeos-engine.html': {
    title: 'Engine',
    short: 'The action layer for outreach, calendar, communication rules, and operational follow-through.',
    bullets: ['Manage follow-ups and calendar events', 'Let LifeOS work tasks on your behalf'],
    details: ['Engine is where operational work gets organized: outreach tasks, communication queues, calendar events, and business execution.', 'Use it when Today shows that business follow-through is slipping.'],
    visualTitle: 'Engine flow',
    visualSteps: ['Capture a task', 'Queue the follow-up', 'Schedule it on the calendar', 'Mark it done or waiting'],
    controls: {
      'queue-task': {
        title: 'Queue Task',
        short: 'Creates a new outreach or follow-through task for the Engine to manage.',
        details: ['Use this when something should be sent, scheduled, or tracked instead of living only in your head.'],
        visualSteps: ['Capture the task', 'Queue it', 'Track status', 'Close the loop']
      },
      'save-event': {
        title: 'Save Event',
        short: 'Creates a LifeOS calendar event in the selected lane.',
        details: ['Use this for personal, family, work, social, or health time blocks you want inside the native LifeOS calendar.'],
        visualSteps: ['Define event', 'Choose lane', 'Save it', 'Review alongside the rest of life']
      },
      'sync-google': {
        title: 'Sync Google',
        short: 'Pulls the latest Google Calendar state into the native LifeOS calendar domain.',
        details: ['Use this after connecting Google or when outside changes need to appear inside LifeOS.'],
        visualSteps: ['Request sync', 'Pull calendar data', 'Merge into LifeOS', 'Review changes']
      },
      'connect-google': {
        title: 'Connect Google',
        short: 'Starts the Google Calendar authorization flow so LifeOS can sync your calendar.',
        details: ['Use this once per account, then reconnect only if access expires or settings change.'],
        visualSteps: ['Open auth flow', 'Grant access', 'Store token', 'Enable sync']
      },
      'add-rule': {
        title: 'Add Rule',
        short: 'Adds a calendar protection rule so LifeOS can preserve time according to your operating preferences.',
        details: ['Use this for protected focus blocks, no back-to-back rules, or category declines you want enforced repeatedly.'],
        visualSteps: ['Define rule', 'Save it', 'Apply it to scheduling', 'Protect time automatically']
      }
    }
  },
  'lifeos-health.html': {
    title: 'Health',
    short: 'Physical-state tracking so your energy, sleep, and recovery actually affect planning decisions.',
    bullets: ['Track sleep, HRV, energy, and mood', 'Catch risk before it becomes a bad day'],
    details: ['Health keeps a live pulse on your body-state and feeds that signal into the rest of LifeOS.', 'Low sleep or energy should change how aggressive the system expects you to be today.'],
    visualTitle: 'Health signal path',
    visualSteps: ['Log check-in', 'Update health score', 'Adjust expectations', 'Surface risk early']
  },
  'lifeos-inner.html': {
    title: 'Inner Work',
    short: 'Emotional repair, pattern awareness, and structured reflection instead of unmanaged internal noise.',
    bullets: ['Spot repeating emotional patterns', 'Work through them before they drive behavior'],
    details: ['Inner Work is for seeing what keeps recurring under the surface: fear, avoidance, grief, anger, or collapse patterns.', 'It should support regulation and honesty, not endless navel-gazing.'],
    visualTitle: 'Inner work loop',
    visualSteps: ['Notice the pattern', 'Name the trigger', 'Choose the repair', 'Re-enter life intentionally']
  },
  'lifeos-family.html': {
    title: 'Family',
    short: 'Household context, family rhythms, and relationship-aware coordination.',
    bullets: ['Track family state and obligations', 'Reduce dropped balls across the household'],
    details: ['Family keeps shared obligations and context from disappearing into private mental load.', 'It should help distribute clarity, not create surveillance.'],
    visualTitle: 'Family coordination',
    visualSteps: ['Capture family need', 'Assign owner or follow-up', 'Track status', 'Close the loop']
  },
  'lifeos-purpose.html': {
    title: 'Purpose',
    short: 'The layer that keeps your daily actions aligned with what you say your life is for.',
    bullets: ['Clarify direction and meaning', 'Keep drift from taking over'],
    details: ['Purpose connects the daily grind back to long-range meaning so execution is not detached from identity.', 'Use it when you are productive but not clearly aligned.'],
    visualTitle: 'Purpose alignment',
    visualSteps: ['State direction', 'Test current work', 'Identify drift', 'Re-align next actions']
  },
  'lifeos-child.html': {
    title: 'Kids',
    short: 'The child-facing developmental lane inside LifeOS, designed to adapt by stage over time.',
    bullets: ['Track wins, learning, and care needs', 'Support growth without flattening the child into a dashboard'],
    details: ['This is the child-development surface, not a toy version of the adult product.', 'It should adapt across childhood and eventually connect to teen/teacher workflows.'],
    visualTitle: 'Development loop',
    visualSteps: ['Capture a child moment', 'Tag growth or need', 'Review with parent/teacher context', 'Build continuity over years']
  },
  'lifeos-mediation.html': {
    title: 'Mediation',
    short: 'Neutral structure for conflict, hard conversations, and repair attempts.',
    bullets: ['De-escalate conflict', 'Help both sides get heard without manipulation'],
    details: ['Mediation gives structure to conflict without making the AI the judge.', 'It should help people prepare, clarify, and repair, not decide for them.'],
    visualTitle: 'Mediation path',
    visualSteps: ['Name the conflict', 'Separate facts from heat', 'Prepare each side', 'Attempt repair']
  },
  'lifeos-coach.html': {
    title: 'Coach',
    short: 'Interactive support when you need help framing a conversation, decision, or next move.',
    bullets: ['Get unstuck quickly', 'Prepare for pressure without improvising badly'],
    details: ['Coach is for active guidance in the moment: a conversation, decision, negotiation, or reset.', 'It should sharpen judgment, not replace it.'],
    visualTitle: 'Coaching flow',
    visualSteps: ['State the situation', 'Clarify what matters', 'Get a structure', 'Use it in real life']
  },
  'lifeos-identity.html': {
    title: 'Identity',
    short: 'Evidence-based identity work: who you say you are, what your behavior proves, and where they diverge.',
    bullets: ['Stress-test identity claims', 'Use real evidence instead of fantasy'],
    details: ['Identity should expose contradiction gently but clearly.', 'This is where self-story meets behavioral evidence.'],
    visualTitle: 'Identity test',
    visualSteps: ['State identity claim', 'Collect evidence', 'Surface contradictions', 'Choose a truer next move']
  },
  'lifeos-decisions.html': {
    title: 'Decisions',
    short: 'Decision intelligence: context, bias checks, and second-order thinking before major choices.',
    bullets: ['Improve decision quality', 'See how state affects judgment'],
    details: ['Decisions records the conditions around choices and helps detect recurring bias or bad timing.', 'Use it for high-cost choices, not every trivial option.'],
    visualTitle: 'Decision quality loop',
    visualSteps: ['Frame the decision', 'Check bias and state', 'Choose deliberately', 'Review outcomes later']
  },
  'lifeos-growth.html': {
    title: 'Growth',
    short: 'Track the compounding effect of effort, wins, identity evidence, and progress over time.',
    bullets: ['See what is compounding', 'Reinforce the right kinds of progress'],
    details: ['Growth is where LifeOS should prove that focused effort expands over time.', 'It is less about raw productivity and more about durable upward movement.'],
    visualTitle: 'Growth compounding',
    visualSteps: ['Log effort', 'Capture wins', 'Review trend', 'Invest in what compounds']
  },
  'lifeos-finance.html': {
    title: 'Finance',
    short: 'Money awareness: transactions, budget, goals, and financial clarity inside the same operating system.',
    bullets: ['See where money is going', 'Keep money decisions tied to real priorities'],
    details: ['Finance keeps money from becoming an invisible force acting on your life.', 'It should support clarity and values, not false precision or financial advice.'],
    visualTitle: 'Finance loop',
    visualSteps: ['Capture money flow', 'Review categories and goals', 'Spot stress points', 'Adjust behavior']
  },
  'lifeos-vision.html': {
    title: 'Vision',
    short: 'Long-range direction, future projection, and concrete imagination of where your current path leads.',
    bullets: ['See future consequences earlier', 'Protect the long game from short-term drift'],
    details: ['Vision exists so the future is concrete enough to influence today.', 'It should help you feel the cost of drift before years pass.'],
    visualTitle: 'Vision path',
    visualSteps: ['Describe the future', 'Project current trajectory', 'See both paths', 'Choose what to reinforce now']
  },
  'lifeos-legacy.html': {
    title: 'Legacy',
    short: 'Long-horizon projects, family inheritance, and what outlives the current week.',
    bullets: ['Keep long-range responsibility visible', 'Turn vague legacy ideas into real stewardship'],
    details: ['Legacy is for what should persist beyond the current cycle: projects, records, values, and handoff thinking.', 'It keeps important but non-urgent things from disappearing.'],
    visualTitle: 'Legacy stewardship',
    visualSteps: ['Name what matters long-term', 'Break it into stewardship tasks', 'Review regularly', 'Preserve and pass on']
  },
  'lifeos-healing.html': {
    title: 'Healing',
    short: 'Structured support for grief, memory repair, and emotionally charged recovery work.',
    bullets: ['Create safer healing structure', 'Reduce uncontained emotional spillover'],
    details: ['Healing is for emotionally sensitive work that needs pacing, framing, and respect.', 'It should never pretend to replace serious human care when that is needed.'],
    visualTitle: 'Healing process',
    visualSteps: ['Set consent and framing', 'Enter the memory safely', 'Process and repair', 'Exit with integration']
  },
  'lifeos-ethics.html': {
    title: 'Ethics & Privacy',
    short: 'The control surface for sovereignty, privacy, deletion, and how LifeOS is allowed to act.',
    bullets: ['Understand what data exists', 'Control how LifeOS uses it'],
    details: ['Ethics & Privacy is where the system explains its boundaries and gives you control over capture and retention.', 'This exists so trust is operational, not implied.'],
    visualTitle: 'Control model',
    visualSteps: ['Set boundaries', 'Grant or revoke consent', 'Review captured data', 'Delete or redact when needed']
  },
  'lifeos-onboarding.html': {
    title: 'Onboarding',
    short: 'The setup path that turns LifeOS from a shell into a system configured for your life.',
    bullets: ['Set identity and baseline preferences', 'Start the system with real context'],
    details: ['Onboarding should create the initial operating context: who you are, what matters, and how the system should behave.', 'It is where clarity starts.'],
    visualTitle: 'Onboarding sequence',
    visualSteps: ['Set identity', 'Connect key preferences', 'Choose baseline behavior', 'Enter the daily loop']
  },
  'lifeos-quick-entry.html': {
    title: 'Quick Entry',
    short: 'Fast capture for notes, commitments, commands, and brain dumps before they disappear.',
    bullets: ['Capture before you forget', 'Convert raw thought into structured actions'],
    details: ['Quick Entry is the inbox for fast reality capture.', 'It should reduce friction so important things get into the system instead of evaporating.'],
    visualTitle: 'Capture path',
    visualSteps: ['Capture raw input', 'Classify it', 'Extract actions or commitments', 'Review and apply'],
    controls: {
      'type-commitment': {
        title: 'Commitment',
        short: 'Opens the commitment capture form for promises you want LifeOS to hold visible.',
        details: ['Use this when you are making a concrete commitment, especially one with a due date.'],
        visualSteps: ['Open commitment form', 'State the promise', 'Save it', 'Track follow-through']
      },
      'type-joy': {
        title: 'Joy Check-In',
        short: 'Opens the daily wellbeing check-in so the system can adjust to your actual state.',
        details: ['Use this when your emotional state matters to how hard you should push today.'],
        visualSteps: ['Open joy check-in', 'Log score', 'Save note', 'Update Today']
      },
      'type-focus': {
        title: 'Focus Block',
        short: 'Opens the focus block form to start a tracked work session from Quick Entry.',
        details: ['Use this when you want to launch a focus block immediately without going through Today first.'],
        visualSteps: ['Open focus form', 'Set intention', 'Start block', 'Track adherence']
      },
      'type-privacy': {
        title: 'Privacy Mode',
        short: 'Opens privacy controls so you can pause detailed capture for a set duration.',
        details: ['Use this when you need immediate privacy from the fast-capture surface.'],
        visualSteps: ['Choose duration', 'Start privacy window', 'Pause capture', 'Resume later']
      },
      'type-command': {
        title: 'Command',
        short: 'Opens the natural-language command runner for focus, privacy, and other LifeOS actions.',
        details: ['Use this when it is faster to tell LifeOS what to do than to tap through forms.'],
        visualSteps: ['Write command', 'Interpret intent', 'Apply action', 'Confirm result']
      },
      'type-braindump': {
        title: 'Brain Dump',
        short: 'Opens the freeform inbox that extracts commitments, commands, and follow-up actions from messy input.',
        details: ['Use this when you have a lot on your mind and need LifeOS to sort it into structured next actions.'],
        visualSteps: ['Dump everything', 'Extract actions', 'Review suggestions', 'Apply what matters']
      },
      'capture-inbox': {
        title: 'Capture Inbox',
        short: 'Shows recently captured events and lets you ingest or apply suggested actions from them.',
        details: ['Use this to review what the event stream has already captured from conversations and quick input.'],
        visualSteps: ['Refresh inbox', 'Review captured items', 'Apply suggestions', 'Keep the stream clean']
      }
    }
  },
  'lifeos-notifications.html': {
    title: 'Notifications',
    short: 'Escalating reminders so what matters can actually reach you when passive notifications fail.',
    bullets: ['Escalate from overlay to SMS, alarm, or call', 'Tune how hard LifeOS should try to reach you'],
    details: ['Notifications is where the system decides how important something is and how far it should go to get your attention.', 'This should serve you, not harass you.'],
    visualTitle: 'Escalation ladder',
    visualSteps: ['Raise reminder', 'Try overlay first', 'Escalate if missed', 'Stop when acknowledged'],
    controls: {
      'ack-all': {
        title: 'Acknowledge All',
        short: 'Marks all current notifications as seen so the escalation ladder can stop for those items.',
        details: ['Use this when you have processed the visible notifications and want the system quiet again.'],
        visualSteps: ['Review notifications', 'Acknowledge them', 'Stop escalation', 'Reset the queue']
      },
      'sms-delay': {
        title: 'SMS Delay',
        short: 'Sets how many minutes LifeOS waits before escalating a missed item to SMS.',
        details: ['Lower values make the system more aggressive. Higher values make it more patient.'],
        visualSteps: ['Set delay', 'Save policy', 'Wait for missed notice', 'Escalate to SMS']
      },
      'alarm-delay': {
        title: 'Alarm Delay',
        short: 'Sets how many minutes LifeOS waits before escalating a missed item to an alarm.',
        details: ['Use this when overlay and SMS are not enough to reliably get your attention.'],
        visualSteps: ['Set delay', 'Save policy', 'Miss earlier stage', 'Trigger alarm']
      },
      'call-delay': {
        title: 'Call Delay',
        short: 'Sets how many minutes LifeOS waits before escalating a missed item to a call.',
        details: ['This is the highest-friction escalation and should be reserved for things that truly matter.'],
        visualSteps: ['Set delay', 'Save policy', 'Miss earlier stages', 'Trigger call']
      },
      'save-escalation': {
        title: 'Save Escalation Settings',
        short: 'Saves the current escalation ladder delays for the active user.',
        details: ['Use this after tuning your escalation thresholds so LifeOS remembers them.'],
        visualSteps: ['Adjust delays', 'Save policy', 'Use new ladder going forward']
      },
      'test-escalation': {
        title: 'Send Test Escalation',
        short: 'Triggers a test notification so you can verify the ladder works before relying on it.',
        details: ['Use this after changing escalation settings or when you want to confirm the system can still reach you.'],
        visualSteps: ['Trigger test', 'Watch overlay', 'Verify escalation path', 'Adjust if needed']
      }
    }
  },
  'lifeos-parent-view.html': {
    title: 'Parent View',
    short: 'Parent-facing visibility into the children lane without collapsing the child into a raw data object.',
    bullets: ['See support needs clearly', 'Track growth with context'],
    details: ['Parent View should summarize what matters for care, learning, and support.', 'It should preserve dignity while improving clarity.'],
    visualTitle: 'Parent support loop',
    visualSteps: ['See child signals', 'Review support needs', 'Take the next action', 'Track continuity over time']
  }
};
