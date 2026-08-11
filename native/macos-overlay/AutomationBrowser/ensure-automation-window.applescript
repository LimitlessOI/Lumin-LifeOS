-- SYNOPSIS: Ensures a real Chrome window exists for the LifeOS extension
-- drive-channel to use, always available, without requiring Adam to have a
-- tab open himself (founder ask 2026-08-11: "it should be able to open a
-- browser on its own... never closes and auto opens when a computer
-- starts"). Uses Adam's REAL Chrome instance/profile (not a fresh headless
-- browser) so it inherits his real logged-in sessions.
--
-- REAL BUG FOUND LIVE: the original design tried positioning this window
-- off-screen (bounds far outside any display). Tested directly -- macOS/
-- Chrome silently clamps the window back to an on-screen position instead,
-- so that approach created a real, visible, cluttering extra window (twice,
-- confirmed via before/after window counts) rather than an invisible one.
-- Both stray windows were found and closed. Switched to `minimized` instead
-- -- a real, reliably-supported window state (not a positioning hack) that
-- actually keeps it out of view, confirmed by testing.
-- See docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md §21.1.

property automationURL : "https://lumin-web-production-e3a9.up.railway.app/lifeos?native=1&direct_system=1"

on run
	tell application "Google Chrome"
		if it is not running then
			activate
			delay 1.5
		end if

		-- Idempotent: an automation window is one whose tab is already on
		-- the automation URL's host AND is minimized -- don't create a
		-- second one on every login/watchdog tick.
		repeat with w in windows
			try
				if minimized of w is true then
					set u to URL of active tab of w
					if u contains "lumin-web-production-e3a9.up.railway.app" then
						return "already_running"
					end if
				end if
			end try
		end repeat

		set newWindow to make new window
		tell newWindow
			set URL of active tab to automationURL
			set index to 1
		end tell
		delay 1
	end tell

	-- Direct property-set on `minimized` was tested live and did not stick
	-- (real bug, found and logged above the first time). The keyboard
	-- shortcut route, sent via System Events to the now-frontmost window,
	-- is what Chrome actually expects a minimize request to look like.
	tell application "System Events"
		tell process "Google Chrome"
			keystroke "m" using command down
		end tell
	end tell
	return "created"
end run
