---
version: alpha
name: Tidepool
description: Demo design system for a community treasury app with an AI copilot. Warm paper, deep-teal ink, one teal for confirmed actions, violet for anything the copilot suggests.
colors:
  primary: "#0F7B6C"
  on-primary: "#FFFFFF"
  primary-soft: "#EAF4F1"
  background: "#F6F4EF"
  surface: "#FFFFFF"
  surface-sunken: "#EFECE5"
  ink: "#10221F"
  ink-secondary: "#5C6966"
  ink-placeholder: "#8F9996"
  line: "#E2E0DA"
  copilot: "#5B3EF0"
  copilot-soft: "#EEEAFF"
  success: "#177A4C"
  success-soft: "#E3F0EA"
  warning: "#9A5B00"
  warning-soft: "#F3EBDD"
  danger: "#B42F26"
  danger-soft: "#F8E5E3"
  dark-background: "#0F1514"
  dark-surface: "#172120"
  dark-ink: "#EEF3F1"
  dark-primary: "#3FBFA8"
  dark-on-primary: "#06201C"
typography:
  display:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.6px
  title:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
  heading:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.5
  body-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0.4px
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 20px
  button-secondary:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 20px
  button-copilot:
    backgroundColor: "{colors.copilot-soft}"
    textColor: "{colors.copilot}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: 48px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  bottom-sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: 24px
  list-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    height: 56px
  input:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: 48px
  chip:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    height: 32px
  badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
  badge-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
  badge-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
  copilot-card:
    backgroundColor: "{colors.copilot-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 16px
  proposal-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 16px
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: 12px
  chip-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
  text-secondary:
    textColor: "{colors.ink-secondary}"
  input-placeholder:
    textColor: "{colors.ink-placeholder}"
  divider:
    backgroundColor: "{colors.line}"
  page-dark:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-ink}"
  card-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.lg}"
  icon-tile:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    size: 40px
  icon-tile-copilot:
    backgroundColor: "{colors.copilot-soft}"
    textColor: "{colors.copilot}"
    rounded: "{rounded.md}"
    size: 40px
  copilot-avatar:
    backgroundColor: "{colors.copilot}"
    rounded: "{rounded.full}"
    size: 40px
  bubble-copilot:
    backgroundColor: "{colors.copilot-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 12px
  coin:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    size: 36px
  button-primary-dark:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-on-primary}"
    rounded: "{rounded.md}"
    height: 48px
---

# Tidepool — DESIGN.md

> A **demo** design system for `design-md-mcp`. Tidepool is a fictional app where a community
> manages a shared treasury: members propose payments, vote, and an AI **copilot** drafts
> proposals and flags risks. Everything here is made up for the example.

## Overview

Calm, paper-like and trustworthy. Money moves only when people decide, so the interface keeps
a hard line between **what a person confirmed** (teal) and **what the copilot suggests** (violet).

- **Warm paper, deep-teal ink.** No pure white page, no pure black text.
- **One teal action per view.** Teal means "a human confirms this".
- **The copilot is always violet** and always labelled. It never borrows teal.
- **Flat by default.** Cards sit on a 1px line; only floating layers cast shadows.

## Setup

Every Tidepool page loads the same four files (paths relative to this folder):

```html
<link rel="stylesheet" href="tokens.css">                 <!-- tokens + component classes -->
<script src="icons.js" defer></script>                     <!-- icon sprite: <use href="#i-…"> -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="tide.js"></script>                            <!-- optional: 3D copilot, mountTide(canvas) -->
```

- Dark mode: set `data-theme="dark"` on `<html>`. Tide and every token follow it.

## Colors

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F6F4EF` | `#0F1514` | Page background |
| `--surface` | `#FFFFFF` | `#172120` | Cards, sheets, list rows |
| `--surface-sunken` | `#EFECE5` | `#0B100F` | Inputs, chips, secondary buttons |
| `--ink` | `#10221F` | `#EEF3F1` | Titles, amounts, body text |
| `--ink-2` | `#5C6966` | `#A3AFAC` | Labels, captions, secondary text |
| `--ink-3` | `#8F9996` | `#6C7875` | Placeholder, disabled |
| `--line` | `#E2E0DA` | `#26322F` | Dividers, card outlines |
| `--primary` | `#0F7B6C` | `#3FBFA8` | The confirm action, active tab, links |
| `--on-primary` | `#FFFFFF` | `#06201C` | Text on the primary button |
| `--primary-soft` | `#EAF4F1` | `#183A35` | Selected rows, focus rings |
| `--copilot` | `#5B3EF0` | `#9C88FF` | Copilot label, icon, text links |
| `--copilot-soft` | `#EEEAFF` | `#2A2550` | Copilot card and button fill |
| `--copilot-hi` | `#B9A8FF` | `#D6CCFF` | Tide's pastel body (mixed 60% with `--copilot`) and highlight |
| `--copilot-deep` | `#2E1F9E` | `#3A2CB8` | Soft shade at the bottom of Tide |
| `--success` / `-soft` | `#177A4C` / `#E3F0EA` | `#4CC38A` / `#173327` | Passed, paid |
| `--warning` / `-soft` | `#9A5B00` / `#F3EBDD` | `#F0B54A` / `#3A2E17` | Voting, pending |
| `--danger` / `-soft` | `#B42F26` / `#F8E5E3` | `#FF7A6E` / `#3D1F1C` | Rejected, risk |

### Colour rules
- **Teal means confirmed.** Use `--primary` only for the one action a person takes, and for links.
- **Violet means suggested.** Anything the copilot wrote or proposes uses `--copilot` / `--copilot-soft`, never teal.
- Status shows as a **soft fill with coloured text**. Never a solid red or green panel.
- In dark mode the primary turns lighter (`#3FBFA8`) and its label turns dark (`--on-primary`).

## Typography

**Font: Manrope**, weights 500 / 600 / 700. Amounts always use `tabular-nums`.

| Role | Size / line | Weight | Use |
|---|---|---|---|
| Display | 40 / 1.1 | 700 | The one big amount on a screen |
| Title | 24 / 1.2 | 700 | Screen and sheet titles |
| Heading | 18 / 1.3 | 600 | Card titles |
| Body | 15 / 1.5 | 500 | Default text, buttons |
| Body small | 13 / 1.45 | 500 | Metadata, chips |
| Label | 12 / 1.3 | 700 | Badges, overlines (uppercase, +0.4 tracking) |

Rules:
- The currency code follows the amount in `--ink-2`: `1,250.00 USDC`.
- One display-size number per screen at most.
- Sentence case everywhere except labels.

## Layout

### Spacing (4px grid)

| Token | Value | Use |
|---|---|---|
| `--s-1` | 4px | Icon to text |
| `--s-2` | 8px | Inside chips, between badges |
| `--s-3` | 12px | Row gaps |
| `--s-4` | 16px | Card padding, mobile gutter |
| `--s-6` | 24px | Sheet padding, between sections |
| `--s-8` | 32px | Desktop gutter |
| `--s-12` | 48px | Page top spacing |

- Mobile frame 390 wide, 16 gutters. Desktop content max 720.
- Buttons in a sheet sit side by side: secondary left, primary right.

## Elevation & Depth

| Token | Light | Dark | Use |
|---|---|---|---|
| `--shadow-float` | `0 12px 32px -12px rgba(16,34,31,.28)` | `0 12px 32px -12px rgba(0,0,0,.6)` | Sheets, toasts, menus |
| `--scrim` | `rgba(16,34,31,.40)` | `rgba(0,0,0,.60)` | Behind a sheet |

- Cards never cast shadows. They use a 1px `--line` outline.

## Shapes

| Token | Value | Use |
|---|---|---|
| `--r-sm` | 6px | Badges inside rows, small tags |
| `--r-md` | 10px | Buttons, inputs, toasts |
| `--r-lg` | 16px | Cards |
| `--r-xl` | 24px | Bottom sheet (top corners only) |
| `--r-full` | 9999px | Chips, avatars, badges |

## Components

### Primary button
`.btn .btn-primary`. Height 48, radius 10, teal fill, white 15/600 label. One per view.

### Secondary button
`.btn .btn-secondary`. Sunken fill, ink label. Sits left of the primary.

### Copilot button
`.btn .btn-copilot`. Violet soft fill, violet label. For "Ask copilot" or "Use suggestion". Never the confirm action.

### Card
`.card`. Surface fill, 1px line, radius 16, padding 16. No shadow.

### Bottom sheet
`.sheet` over `.scrim`. Radius 24 on top corners, padding 24, `--shadow-float`, a 36×4 handle.

### List row
`.list-row`. 56 tall: avatar or icon, title + caption, value on the right.

### Input
`.input`. Sunken fill, radius 10, 48 tall. Focus: 2px `--primary-soft` ring.

### Chip
`.chip`. Pill, sunken fill, 13/500. Selected: `--primary-soft` fill, `--primary` text.

### Badge
`.badge` + `.badge-success` / `.badge-warning` / `.badge-danger`. Soft fill, coloured 12/700 uppercase label.

### Copilot card
`.copilot-card`. Violet soft fill, a "Suggested by copilot" label with the spark icon, then the content.
The person confirms with a teal button **outside** the card.

### Proposal card
`.proposal-card`. Title, amount (tabular), recipient, a vote bar (`.vote-bar`) and a status badge.

### Copilot avatar
`.copilot-avatar` (+ `.sm` 28 / `.lg` 64, or any `--size`). Tide, flat: a pastel felt orb with calm,
half-closed eyes behind round wire glasses, no mouth. Same character as the 3D Tide, so it marks
everything the copilot says. `logo.svg` at the repo root is the same mark as a standalone file.

### Copilot bubble
`.bubble-copilot` inside `.agent-line` (avatar + bubble). Violet soft fill, tail at bottom-left.
Use it for what the copilot noticed or checked, in plain words.

### Icon tile
`.icon-tile` + `.copilot` / `.success` / `.warning` / `.danger`. 40×40, radius 10, soft fill, 20px
line icon. Leads every suggestion, proposal and setting row.

### Icons
`.icon` from `icons.js`: `<svg class="icon"><use href="#i-check"/></svg>`. 24px grid, 1.8 stroke,
round caps and joins, `currentColor`. `.icon.fill` only for the copilot spark. Icons sit 18px inside
buttons, left of the label.

Set: `i-spark` (copilot) · `i-shield` (verified) · `i-alert` (risk) · `i-vote` · `i-users` · `i-send` ·
`i-clock` · `i-check` · `i-wallet` · `i-home` · `i-list` · `i-up` (growth) · `i-copy` · `i-split` (split payment).

### Copilot 3D (Tide)
`tide.js` → `mountTide(canvas, { coins, sparks, glasses, followPointer, size })`. A soft pastel blob
(copilot violet mixed 60% toward `--copilot-hi`) in a felt coat with a slightly rough outline. Calm,
half-closed eyes behind round wire glasses, no mouth: the wise, careful one who checks payments. It
wobbles, bounces and watches the pointer; three token coins (generic `$`, diamond, `T` glyphs, never brand
logos) orbit it with sparkles. Use it **once per page, in hero or empty states only**, never on a screen
where money moves. Falls back to a `.copilot-avatar` without WebGL.

### Coin
`.coin` (+ `.violet` / `.amber`). 36px disc with a soft highlight and two-letter ticker. Generic, never
a brand logo.

### Timeline
`.timeline` of `.tl-step` rows: `.copilot` (drafted by copilot, violet), `.done` (green check),
`.now` (teal, bold: the step the person takes).

### Toast
`.toast`. Ink fill, surface text, radius 10, `--shadow-float`. Bottom centre, 4 seconds.

## Do's and Don'ts

| Do | Don't |
|---|---|
| One teal button per view | Two primary buttons side by side |
| Copilot content in violet, labelled | Copilot suggestions in teal |
| Soft status fills with coloured text | Solid red or green panels |
| 1px line on cards | Drop shadows on cards |
| Currency code after the amount, in ink-2 | Currency symbol and code together ($1,250 USDC) |
| Shadows only on floating layers | Shadows on rows or chips |
| Every copilot message starts with the avatar or spark | Copilot text with no marker |
| An icon tile leads each suggestion or proposal | Bare text rows for actions |
