# 2026-08-12 — Both factories, and fix the fixer (continued)

Twin of the BuilderOS/overlay captures.

Adam: the previous pass did not make hold-to-talk work; put a watchdog inside the system.

Native badge mic now reaches Chair (`voice.send result=sent`). Production watchdog watches governed-loop staleness and native false-blocks; factory-2 relaunches Taloa if she dies.
