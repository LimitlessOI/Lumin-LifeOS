/**
 * SYNOPSIS: Service module — StruggleDetection.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
[
  {
    "old_string": "function dwellTimer(userId, action) {\n  if (action === 'start') {\n    startDwellTimer(userId);\n  } else if (action === 'stop') {\n    stopDwellTimer(userId);\n  }\n}\n\nexport { detectStruggles, updateDwellTime, updateClickRepeats, updateEditCycles, startDwellTimer, stopDwellTimer, dwellTimer };",
    "new_string": "function dwellTimer(userId, action) {\n  if (action === 'start') {\n    startDwellTimer(userId);\n  } else if (action === 'stop') {\n    stopDwellTimer(userId);\n  }\n}\n\nexport { detectStruggles, updateDwellTime, updateClickRepeats, updateEditCycles, startDwellTimer, stopDwellTimer, dwellTimer };"
  }
]
