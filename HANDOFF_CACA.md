# CACA MODE — Handoff Document
**Date:** 2026-05-14  
**Branch:** `feature/caca-mode`  
**Last EAS push:** "CACA V2: bone skeleton, 6 lifting animations, gym environment"

---

## Problem
The current V2 character animation is "super fragmented" — limbs snap/jitter rather than moving smoothly. The approach of lerping nested THREE.Group rotations with raw euler angles creates gimbal issues and discontinuous motion.

## Current Architecture (V2 — broken)
- File: `src/data/cacaHtml.ts` (604 lines)
- Loaded via WebView in `app/(tabs)/caca.tsx`
- Three.js 0.134.0 from CDN
- Character built from BoxGeometry + SphereGeometry primitives
- Bones = nested THREE.Group objects, rotated each frame
- 6 animation states: BICEP CURL, OVERHEAD PRESS, SQUATTING, DEADLIFTING, LATERAL RAISE, VICTORY FLEX
- Lerp: `cur[k] += (tgt[k] - cur[k]) * 0.14 * 3` — too fast, causes jitter
- Dumbbells parented to forearm groups

## Root Cause of Fragmentation
1. Euler angle lerping wraps at ±π causing jumps
2. `0.14 * 3 = 0.42` lerp factor is too high — snaps rather than eases
3. Animation targets change every ~3s but transition feels abrupt
4. No quaternion slerp — just raw rotation.x/y/z lerp

---

## What the Redo Should Do

### Approach: CSS/Canvas 2D instead of Three.js
Three.js bone hierarchies in WebView are too heavy and fragile. Use a **2D canvas character** with smooth sine-wave driven joints — much smoother, no gimbal lock, performant on mobile.

### Character Design
- Stick-figure-style with thick rounded limbs (like a cartoon athlete)
- Body parts: head, neck, torso, upper arms, forearms, thighs, shins, feet
- All drawn as rounded rectangles or capsules on canvas
- Muscles scale with `M` (0–1): limb thickness increases, head gets more defined

### Animation System
- Each joint has an angle driven by `sin(time * speed + phase)`
- No discrete states — continuous smooth motion
- Cycle through "poses" by shifting phase targets slowly (3–5s crossfade)
- Poses: idle sway, bicep curl, squat, overhead press, deadlift

### Tech Stack for Redo
- Pure HTML5 Canvas (no Three.js dependency = no CDN load lag)
- `requestAnimationFrame` loop
- Background: dark gradient + subtle grid
- Orange accent glow effects via canvas shadow

---

## Files to Change
- `src/data/cacaHtml.ts` — full rewrite (keep same function signature: `buildCacaHtml(muscle: number, level: number): string`)
- `app/(tabs)/caca.tsx` — no changes needed
- `src/store/cacaStore.ts` — no changes needed

## Function Signature to Keep
```typescript
export function buildCacaHtml(muscle: number, level: number): string
```
`muscle` is 0.0–1.0 (affects body thickness/size)  
`level` is integer 1+ (shown in scene but not directly used for animation)

---

## XP / Level System (in caca.tsx, do NOT change)
- `xpFromStats(totalWorkouts, lifetimeVolume)` → XP
- `xpToLevel(xp)` → level
- `muscleFromLevel(level)` → 0.0–1.0, reaches max at level ~40
- Stats panel shows: LVL, XP bar, Workouts / This Week / Lifetime volume

---

## EAS Info
- App ID: `438ccf9b-671d-4aef-9d28-5cf5b4861d77`
- Preview URL: `exp://u.expo.dev/438ccf9b-671d-4aef-9d28-5cf5b4861d77?channel-name=preview`
- Push command: `npx eas-cli update --branch preview --message "..." --non-interactive`
- After push: open Expo Go → wait 10s → force quit → reopen

---

## Next Steps
1. Rewrite `src/data/cacaHtml.ts` as a 2D canvas character (no Three.js)
2. Smooth sine-wave driven joint animation
3. Commit to `feature/caca-mode`
4. `npx eas-cli update --branch preview --message "CACA V3: smooth 2D canvas character" --non-interactive`
