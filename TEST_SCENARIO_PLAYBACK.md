# Playback Controls Test Scenario

## Prerequisites
- Run `npm start` to launch Electron app
- Test videos auto-load in media library

## Test Scenario: Video Preview and Playback

### Step 1: Verify Auto-Load (✓ WORKING)
**Action:** Launch app  
**Expected:**
- Media library shows 2 videos:
  - screen-recording-video.mp4
  - screen-recording-video2.mp4
- First video automatically shown in preview
- Status: "Preview: screen-recording-video.mp4"

**Validation:**
- ✅ Media library populated
- ✅ Preview visible (not "No video loaded")
- ✅ Status message confirms video name

---

### Step 2: Switch Preview via Library Click (✓ WORKING)
**Action:** Click "screen-recording-video2.mp4" in media library  
**Expected:**
- Preview switches to video 2
- Status: "Preview: screen-recording-video2.mp4"
- Video player resets to 0:00

**Validation:**
- ✅ Preview updates
- ✅ Status confirms switch
- ✅ Can play video 2

---

### Step 3: Drag Clip to Timeline
**Action:** Drag first video from library to timeline  
**Expected:**
- Clip appears on timeline
- Status: "Clip added to timeline (count: 1)"
- Export button enabled

**Validation:**
- ✅ Visual clip on timeline
- ✅ Clip shows filename
- ✅ Export button active

---

### Step 4: Play Timeline (NEEDS TESTING)
**Action:** Click play button (▶)  
**Expected:**
- Button changes to pause (⏸)
- Video plays from start
- Playhead moves along timeline
- Status: "Playing: filename from 0:00"

**Validation:**
- ⏳ Button icon updates
- ⏳ Video playback starts
- ⏳ Playhead animates
- ⏳ Status updates

---

### Step 5: Pause Playback (NEEDS TESTING)
**Action:** Click pause button (⏸)  
**Expected:**
- Button changes back to play (▶)
- Video stops
- Playhead stays at current position
- Status: "Playback paused"

**Validation:**
- ⏳ Button icon updates
- ⏳ Video stops
- ⏳ Position maintained

---

### Step 6: Click Clip on Timeline
**Action:** Click clip on timeline  
**Expected:**
- Clip selected (orange border)
- Preview loads that clip
- Trim handles appear
- Status: "Preview: filename @ 0:00"

**Validation:**
- ✅ Orange selection border
- ✅ Preview loads clip
- ⏳ Trim handles visible

---

### Step 7: Multiple Clips
**Action:** Drag second video to timeline  
**Expected:**
- Two clips on timeline
- Export button still enabled
- Play button plays first clip only

**Validation:**
- ⏳ Both clips visible
- ⏳ Play works with multiple clips

---

## Known Issues
- Play button only plays first clip (multi-clip playback not implemented)
- Playhead stops at end of first clip's trim range
- Timeline composition preview not implemented (Wednesday feature)

---

## Performance Checks
- [ ] Preview switching is instant (< 100ms)
- [ ] Playhead animation smooth (30+ fps)
- [ ] No lag with 2+ clips on timeline
- [ ] Status updates don't flicker

---

## Next Steps (Wednesday)
1. Multi-clip timeline playback
2. Audio sync across clips
3. Timeline auto-scroll during playback
4. Keyboard shortcuts (space = play/pause)
