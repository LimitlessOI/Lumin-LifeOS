package org.hopkinsgroup.lifeos.accessibility;

import android.accessibilityservice.AccessibilityService;
import android.os.Bundle;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.List;

/**
 * Android equivalent of the macOS AXUIElement driver: reads and drives the
 * foreground app's UI tree directly (find node -> click / set text), not by
 * synthesizing screen-coordinate taps. Command-driven only -- onAccessibilityEvent
 * is intentionally a no-op so nothing happens without an explicit LifeOS request.
 */
public class LifeosAccessibilityService extends AccessibilityService {

    private static LifeosAccessibilityService instance;

    public static boolean isRunning() {
        return instance != null;
    }

    public static LifeosAccessibilityService getInstance() {
        return instance;
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Intentionally empty: driving is pulled by explicit plugin calls, never
        // triggered reactively by what's on screen.
    }

    @Override
    public void onInterrupt() {
        // no-op
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (instance == this) instance = null;
    }

    public boolean clickByText(String text, boolean exact) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;
        AccessibilityNodeInfo node = findNodeByText(root, text, exact);
        if (node == null) return false;
        AccessibilityNodeInfo clickable = findClickableAncestorOrSelf(node);
        if (clickable == null) return false;
        return clickable.performAction(AccessibilityNodeInfo.ACTION_CLICK);
    }

    public boolean setTextByLabel(String label, String value) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;
        AccessibilityNodeInfo labelNode = findNodeByText(root, label, false);
        if (labelNode == null) return false;
        AccessibilityNodeInfo field = findNearestEditable(labelNode);
        if (field == null) return false;
        Bundle args = new Bundle();
        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value);
        return field.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
    }

    public String dumpVisibleText() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return "";
        StringBuilder sb = new StringBuilder();
        collectText(root, sb, 0);
        return sb.toString();
    }

    private void collectText(AccessibilityNodeInfo node, StringBuilder sb, int depth) {
        if (node == null || depth > 40) return;
        CharSequence t = node.getText();
        if (t != null && t.length() > 0) sb.append(t).append('\n');
        CharSequence d = node.getContentDescription();
        if (d != null && d.length() > 0) sb.append(d).append('\n');
        int count = node.getChildCount();
        for (int i = 0; i < count; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) collectText(child, sb, depth + 1);
        }
    }

    private AccessibilityNodeInfo findNodeByText(AccessibilityNodeInfo root, String text, boolean exact) {
        List<AccessibilityNodeInfo> matches = root.findAccessibilityNodeInfosByText(text);
        if (matches == null || matches.isEmpty()) return null;
        if (!exact) return matches.get(0);
        for (AccessibilityNodeInfo n : matches) {
            CharSequence t = n.getText();
            if (t != null && text.contentEquals(t)) return n;
        }
        return matches.get(0);
    }

    private AccessibilityNodeInfo findClickableAncestorOrSelf(AccessibilityNodeInfo node) {
        AccessibilityNodeInfo cur = node;
        int depth = 0;
        while (cur != null && depth < 8) {
            if (cur.isClickable()) return cur;
            cur = cur.getParent();
            depth++;
        }
        return cur;
    }

    private AccessibilityNodeInfo findNearestEditable(AccessibilityNodeInfo labelNode) {
        if (labelNode.isEditable()) return labelNode;
        AccessibilityNodeInfo parent = labelNode.getParent();
        if (parent == null) return null;
        int count = parent.getChildCount();
        for (int i = 0; i < count; i++) {
            AccessibilityNodeInfo sibling = parent.getChild(i);
            if (sibling != null && sibling.isEditable()) return sibling;
        }
        return null;
    }
}
