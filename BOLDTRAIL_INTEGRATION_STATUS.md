<!-- SYNOPSIS: 🏠 BoldTrail Integration Status & Implementation Plan -->

# 🏠 BoldTrail Integration Status & Implementation Plan

## ✅ What Currently Exists

### 1. **Basic BoldTrail UI** (`public/overlay/boldtrail.html`)
- ✅ Draft Email interface
- ✅ Plan Showing interface  
- ✅ My Showings list
- ✅ Settings/Registration
- **Access:** `https://robust-magic-production.up.railway.app/boldtrail?key=MySecretKey2025LifeOS`

### 2. **Backend API Endpoints** (`server.js`)
- ✅ `POST /api/v1/boldtrail/register` - Register agent
- ✅ `POST /api/v1/boldtrail/draft-email` - Generate email drafts
- ✅ `POST /api/v1/boldtrail/plan-showing` - Plan showing routes
- ✅ `GET /api/v1/boldtrail/showings/:agentId` - Get showings
- ✅ `GET /api/v1/boldtrail/agent/:email` - Get agent info
- ✅ `POST /api/v1/boldtrail/create-subscription` - Stripe integration

### 3. **Database Tables**
- ✅ `boldtrail_agents` - Agent profiles
- ✅ `boldtrail_showings` - Scheduled showings
- ✅ `boldtrail_email_drafts` - Email drafts

### 4. **BoldTrail API Integration** (`src/integrations/boldtrail.js`)
- ✅ `createLead()` - Create leads in BoldTrail
- ✅ `appendTranscript()` - Add notes to leads
- ✅ `tagLead()` - Tag leads
- ⚠️ **NOT CURRENTLY USED** - Integration file exists but endpoints use our own AI

### 5. **Overlay System** (`public/overlay/overlay-window.js`)
- ✅ Draggable window overlay
- ✅ Minimize/Maximize/Close
- ✅ State persistence
- ⚠️ **NOT INTEGRATED** - Currently loads `/overlay/index.html`, not BoldTrail

### 6. **Sales Coaching Concepts** (Not Implemented)
- 📝 `public/sales-coaching.html` - Landing page mentions features
- 📝 `src/services/call-listener.js` - Skeleton only
- 📝 `coachingTips.js` - Basic structure
- 📝 `webhookHandler.js` - WebSocket coaching tips

---

## ❌ What's Missing (What You Asked For)

### 1. **BoldTrail AI Integration**
**Current:** Uses our own AI (`callCouncilWithFailover`)  
**Needed:** Use BoldTrail's actual API/AI where possible

**Missing:**
- No BoldTrail API calls in email drafting (uses our AI)
- No BoldTrail API calls in showing planning (uses our AI)
- `BOLDTRAIL_API_KEY` environment variable not used

### 2. **Sales Overlay for Live Training**
**Missing:**
- ❌ Live call listening/recording
- ❌ Live showing presentation overlay
- ❌ Real-time coaching during calls/showings
- ❌ "Whisper in your ear" feature (AR glasses/earpiece)
- ❌ Overlay that works on top of BoldTrail's interface

### 3. **Moment Recording & Coaching**
**Missing:**
- ❌ Record "good moments" from calls/showings
- ❌ Record "coaching clips" (bad habits)
- ❌ Automatic clip extraction
- ❌ Database tables for recordings/clips
- ❌ Video/audio timestamp marking

### 4. **Poor Sales Technique Detection**
**Missing:**
- ❌ AI analysis of call transcripts
- ❌ Pattern detection for bad habits
- ❌ Real-time alerts during calls
- ❌ Coaching suggestions based on detected issues
- ❌ Bad habit tracking over time

### 5. **Overlay Integration**
**Missing:**
- ❌ BoldTrail as overlay (not separate page)
- ❌ Click-through overlay with added functions
- ❌ Overlay that works on top of BoldTrail's native interface
- ❌ Browser extension or injectable overlay

---

## 🎯 Implementation Plan

### Phase 1: Integrate BoldTrail's AI (Priority 1)

**Goal:** Use BoldTrail's API instead of our own AI where possible

**Steps:**
1. Check BoldTrail API documentation for:
   - Email drafting endpoint
   - Showing planning endpoint
   - AI capabilities
2. Update `server.js` endpoints to:
   - Try BoldTrail API first (if `BOLDTRAIL_API_KEY` exists)
   - Fallback to our AI if BoldTrail unavailable
3. Use `src/integrations/boldtrail.js` functions

**Files to modify:**
- `server.js` (lines 7612-7685, 7687-7770)
- Add BoldTrail API calls before `callCouncilWithFailover`

### Phase 2: Sales Overlay System (Priority 2)

**Goal:** Create overlay that listens to calls/showings and provides coaching

**New Files Needed:**
1. `public/overlay/sales-coaching-overlay.js` - Main overlay controller
2. `src/services/call-recorder.js` - Call recording service
3. `src/services/presentation-recorder.js` - Showing presentation recording
4. `src/services/sales-technique-analyzer.js` - AI analysis of sales techniques

**Database Tables Needed:**
```sql
CREATE TABLE sales_call_recordings (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES boldtrail_agents(id),
  call_id VARCHAR(255),
  recording_url TEXT,
  transcript TEXT,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE coaching_clips (
  id SERIAL PRIMARY KEY,
  recording_id INTEGER REFERENCES sales_call_recordings(id),
  agent_id INTEGER REFERENCES boldtrail_agents(id),
  clip_type VARCHAR(50), -- 'good_moment' or 'coaching_needed'
  start_time INTEGER, -- seconds
  end_time INTEGER,
  transcript_segment TEXT,
  ai_analysis JSONB,
  technique_detected VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_technique_patterns (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES boldtrail_agents(id),
  technique_name VARCHAR(255),
  pattern_type VARCHAR(50), -- 'bad_habit', 'good_practice'
  frequency INTEGER,
  last_detected TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API Endpoints Needed:**
- `POST /api/v1/boldtrail/start-call-recording` - Start recording
- `POST /api/v1/boldtrail/stop-call-recording` - Stop and analyze
- `POST /api/v1/boldtrail/mark-moment` - Mark good/bad moment
- `GET /api/v1/boldtrail/coaching-clips/:agentId` - Get clips
- `GET /api/v1/boldtrail/technique-patterns/:agentId` - Get bad habits

### Phase 3: Overlay Integration (Priority 3)

**Goal:** Make BoldTrail work as overlay on top of their interface

**Approach:**
1. Create browser extension or injectable script
2. Load overlay on BoldTrail pages
3. Add our functions as overlay buttons/panels
4. Use `overlay-window.js` as base

**Files to create:**
- `public/overlay/boldtrail-overlay-inject.js` - Injects overlay into BoldTrail pages
- `public/overlay/boldtrail-overlay.html` - Overlay UI with our functions

---

## 🔍 How to Access What Exists Now

### BoldTrail Interface:
```
https://robust-magic-production.up.railway.app/boldtrail?key=MySecretKey2025LifeOS
```

### Current Features:
1. **Draft Email** - Uses our AI (not BoldTrail's)
2. **Plan Showing** - Basic route planning
3. **My Showings** - List scheduled showings
4. **Settings** - Register agent profile

### What Works:
- ✅ Agent registration
- ✅ Email drafting (using our AI)
- ✅ Showing planning
- ✅ Database storage

### What Doesn't Work Yet:
- ❌ BoldTrail API integration (uses our AI instead)
- ❌ Live call/presentation recording
- ❌ Coaching clips
- ❌ Sales technique detection
- ❌ Overlay on BoldTrail's interface

---

## 🚀 Next Steps

**Immediate:**
1. Get BoldTrail API documentation
2. Add `BOLDTRAIL_API_KEY` to environment variables
3. Update email/showing endpoints to use BoldTrail API first

**Short-term:**
1. Build call recording system
2. Create coaching clip extraction
3. Implement sales technique analyzer

**Long-term:**
1. Create overlay injection system
2. Build browser extension
3. Integrate with BoldTrail's native interface

---

## 📝 Questions to Answer

1. **Do you have BoldTrail API credentials?** (`BOLDTRAIL_API_KEY`)
2. **What BoldTrail API endpoints are available?** (Email drafting, AI features)
3. **How should we record calls?** (Twilio, browser audio, external service)
4. **How should we record showings?** (Video, audio, screen recording)
5. **Should overlay be browser extension or injectable script?**
