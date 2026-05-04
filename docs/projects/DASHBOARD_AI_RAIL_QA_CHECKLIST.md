1. Verify that clicking the dock toggle button (`↕`) correctly switches the AI rail between the bottom and top of the screen.
2. Confirm that the AI rail's collapsed/expanded state and its dock position (top/bottom) are correctly persisted and restored from `sessionStorage` across page reloads.
3. Test the input field: pressing `Enter` sends the message, and `Shift+Enter` inserts a new line.
4. Validate that UI transitions (expand/collapse, dock change) respect the user's "prefers-reduced-motion" system setting.
5. On mobile devices, verify that the AI rail correctly adjusts its padding to account for `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` when docked.