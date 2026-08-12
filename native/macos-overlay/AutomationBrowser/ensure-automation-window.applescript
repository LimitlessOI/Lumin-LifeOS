-- SYNOPSIS: Ensures a real Chrome window exists for the LifeOS extension
-- drive-channel to use, always available, without requiring Adam to have a
-- tab open himself (founder ask 2026-08-11: "it should be able to open a
-- browser on its own... never closes and auto opens when a computer
-- starts"). Uses Adam's REAL Chrome instance/profile (not a fresh headless
-- browser) so it inherits his real logged-in sessions.
--
-- REAL BUG FOUND LIVE (2026-08-11, second one): this script opened ~12
-- windows and would have kept going forever at one every 5 minutes. The
-- idempotency check required a window to be BOTH on the automation host AND
-- minimized, but minimizing depends on a System Events keystroke that was
-- failing every single run with "AppleEvent timed out (-1712)" — System
-- Events needs Accessibility permission this agent never reliably had. So
-- the window it had just created never matched its own liveness check, and
-- the next tick created another one. A cosmetic step (minimize) was load-
-- bearing for a correctness decision (does one already exist?), which is the
-- actual design error.
--
-- Fixes: (1) presence is judged by the URL alone — minimize is cosmetic and
-- may fail freely; (2) minimize is best-effort inside a timeout so a hung
-- System Events can never stall or fail the run; (3) a hard cap closes
-- extras, so even a future logic slip self-heals instead of accumulating.
-- See docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md §21.1.

property automationURL : "https://lumin-web-production-e3a9.up.railway.app/lifeos?native=1&direct_system=1"
property automationHost : "lumin-web-production-e3a9.up.railway.app"

on run
	tell application "Google Chrome"
		if it is not running then
			activate
			delay 1.5
		end if

		-- Presence, judged only by the URL. Whether the window is minimized is
		-- cosmetic and must never decide whether another one gets created.
		set existing to {}
		repeat with w in windows
			try
				if (URL of active tab of w) contains automationHost then
					set end of existing to w
				end if
			end try
		end repeat

		-- Self-heal: close any surplus. If this script ever miscounts again,
		-- the damage is bounded at one window instead of one every 5 minutes.
		if (count of existing) > 1 then
			repeat with i from (count of existing) to 2 by -1
				try
					close (item i of existing)
				end try
			end repeat
			return "closed_surplus"
		end if

		if (count of existing) is 1 then return "already_running"

		set newWindow to make new window
		tell newWindow
			set URL of active tab to automationURL
			set index to 1
		end tell
		delay 1
	end tell

	-- Best-effort, and genuinely optional. The window is already correct and
	-- discoverable without this; keeping it out of sight is a nicety. Wrapped
	-- in a timeout because the un-permissioned call previously hung for the
	-- full default AppleEvent window on every single run.
	try
		with timeout of 5 seconds
			tell application "System Events"
				tell process "Google Chrome"
					keystroke "m" using command down
				end tell
			end tell
		end timeout
	end try

	return "created"
end run
