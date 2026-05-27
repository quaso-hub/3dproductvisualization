# SESSION HANDOFF — 2026-05-27 21:45 UTC

> Auto-generated. Baca ini di awal sesi baru sebelum ngapa-ngapain.

## TL;DR

**Branch:** `copilot/vscode1772805676982`
**Last commit:** `c0de9ce` — Session 10 Item 6: ScrubSink rebuild

## Commits sesi ini (2026-05-27)

- `0e00db2` Highlight rollout Exploded batch 1 (Hermetic+Curving+RAG+Laf)
- `a7b96bb` Highlight rollout Exploded batch 2 (Pacs+PassBox+ScrubSink+Ceiling+Surgical)
- `2d33178` Highlight rollout Assembled (Laf+RAG+Ceiling)
- `b7fc527` Lazy loading + performance optimization system
- `d82dc30` HVAC BIM v2 + mobile overlay
- `4163e9a` ViewerControls + useThreeScene + HermeticDoorLegend fixes
- `47eba00` Item 8: PACS Cabinet exploded fix (camera)
- `c0de9ce` Item 6: ScrubSink rebuild (Skytron/Belimed spec)

## Open Items (urutan prioritas)

| # | Item | Status | Notes |
|---|---|---|---|
| 7 | PassBox 2-pintu | ✅ DONE | Sudah benar |
| 8 | PACS exploded fix | ✅ DONE | Camera fix |
| 6 | ScrubSink rebuild | ✅ DONE | Skytron/Belimed spec |
| 2B | Animation scenarios | ❌ TODO | PACS door swing + Ceiling Panel slide |
| 9 | HVAC accuracy review | ❌ TODO | |
| V | Vibe upgrade | ❌ TODO | 3D reference patterns |

## Item 2B — Animation Plan

**PACS door swing:**
- Simpan ref ke `leftDoorGroup` + `rightDoorGroup` di `refsRef`
- Tambah state `doorsOpen: boolean` di React component
- Tombol "Buka Pintu" di ViewerControls
- Animasi: rotation.y lerp 0 → -Math.PI/2 (kiri) dan 0 → Math.PI/2 (kanan)
- Pivot point: tepi engsel (bukan center door)
- Gunakan `startRenderLoop` invalidate atau requestAnimationFrame loop

**Ceiling Panel slide:**
- Simpan ref ke panel meshes
- Animasi position.y += GAP saat klik "Explode"

## Vibe Upgrade Research Results

5 referensi sudah di-research. Key techniques:

| Teknik | Source | Difficulty |
|---|---|---|
| Lenis smooth scroll | semua | Easy |
| Scroll-driven camera path | digitalists | Medium |
| FBO scene transition | shader.se | Hard (2-3 days) |
| Fresnel ShaderMaterial SS | digitalists | Easy |
| Selective bloom emissive | shader.se | Medium |
| Per-product accent colors | NRG | Easy |
| Canvas image sequence hero | eatnaked + vaonis | Medium |
| `camera.setViewOffset` | digitalists | Easy |
| Clip-path wipe reveals | NRG | Easy |

**Color palette steal:**
```
Background: #f6f7f3  (warm off-white)
Dark:       #261d26  (aubergine)
Per-product accent colors
```

## Stack Reminder

- Vite 6.3 + React 18.3 + raw Three.js 0.183 (NOT R3F)
- Tailwind v4 CSS-first + Radix wrappers
- 17 produk, lazy-loaded Assembled+Exploded per produk
- `useThreeScene` + `useHighlightController` hooks
- Branch: `copilot/vscode1772805676982`
- Build: `npx vite build --outDir dist-verify --emptyOutDir`
- Ref fix pattern: `[System.IO.File]::WriteAllText($refPath, "$sha\n")`

## Failsafe Rules

1. Commit setelah setiap item selesai
2. Update file ini setelah setiap commit
3. Jika >150 pesan: tulis state packet, commit, mulai sesi baru
4. Jangan satu sesi >5M tokens
5. Build verify sebelum commit
