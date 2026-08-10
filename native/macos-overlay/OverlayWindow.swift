// SYNOPSIS: Borderless, transparent, always-on-top NSWindow subclass for the
// Taloa floating overlay. See docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md §21.1.
import Cocoa

final class OverlayWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}
