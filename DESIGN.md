# Healthcare Claims App Design System


## Purpose


This document defines the visual and interaction system for a healthcare bill claims product that helps people challenge incorrect medical charges and pursue fair insurance outcomes.


The product should feel:


- Human
- Reassuring
- Clear
- Rigorous
- Modern


It should not feel:


- Aggressive
- Corporate-enterprise
- Flashy
- Clinical
- Legalistic
- Generic SaaS


The emotional outcome is relief and clarity first, with advocacy and trust supporting it.


## Core Design Thesis


### Visual Thesis


A calm, editorial-grade healthcare advocacy product built from warm neutrals, soft contrast, and a precise product workspace that turns a confusing bill into an understandable, defendable claim.


### Content Plan


1. Hero: explain the promise and show the signature claim transformation workspace.
2. Support: show how the product detects billing and insurance problems in plain language.
3. Detail: walk through the claim process from upload to insurer response.
4. Final CTA: invite the user to start their case with confidence.


### Interaction Thesis


1. The bill gently resolves into a structured claim view.
2. A sticky case timeline grounds the page as the user scrolls.
3. Evidence drawers and charge explanations reveal depth without clutter.


## Brand Positioning


### Product Role


The product is not a loud "fighter" brand. It is a calm patient advocate.


Its personality is:


- Steady under pressure
- Easy to understand
- Meticulous with details
- Respectful of stress and vulnerability


The product should communicate:


- "We help you make sense of this."
- "We identify what is wrong."
- "We build the case with you."
- "You stay informed and in control."


## Audience


Primary users:


- People facing confusing hospital or insurance bills
- People who feel overwhelmed by appeals and reimbursement processes
- Families helping a partner, parent, or child navigate a bill


Emotional realities to design for:


- Stress
- Distrust
- Fatigue
- Uncertainty
- Urgency


Design response:


- Reduce noise
- Use plain language
- Make progress visible
- Keep every action legible
- Never make the user feel behind or uninformed


## Experience Principles


### 1. Calm over confrontation


The interface should reassure through order, tone, and clear progress instead of using a hostile "fight the system" posture.


### 2. Explain before asking


Every major action should be preceded by context. The interface should show why something matters before requesting the next step.


### 3. One main idea per section


Each landing page section and product surface region should have one dominant purpose.


### 4. Use layout, not decoration


Hierarchy should come from spacing, scale, alignment, and contrast rather than cards, shadows, and visual effects.


### 5. Show evidence, not hype


The product earns trust by surfacing line-item explanations, policy references, and claim progress, not by promising magic.


## Art Direction


### Overall Mood


- Soft light
- Warm paper-like backgrounds
- Precise product UI
- Minimal chrome
- Quiet confidence


### Visual References To Channel


- Editorial healthcare trust
- Product-design restraint
- Consumer-finance clarity


### Visual References To Avoid


- Bright insurance blue with stock lifestyle photos
- Dark "cyber" dashboards
- Enterprise claim software aesthetics
- Card-heavy SaaS landing pages


## Color System


The color system should feel warm and grounded, with one reassuring action color and a muted signal color for disputed charges.


### Core Palette


| Token | Hex | Use |
| --- | --- | --- |
| `ink-900` | `#1F2923` | Primary text, main headings |
| `ink-700` | `#415048` | Secondary headings, body emphasis |
| `ink-500` | `#66736C` | Secondary body text, metadata |
| `stone-50` | `#FCFAF6` | Main page background |
| `stone-100` | `#F4F0E8` | Section background, quiet contrast shifts |
| `stone-200` | `#E7E0D3` | Borders, dividers, disabled states |
| `sage-100` | `#E7F0EA` | Reassuring wash behind educational content |
| `sage-300` | `#B6CDBE` | Soft supporting tint, subdued highlights |
| `teal-500` | `#2B7A72` | Primary action, links, focus accents |
| `teal-600` | `#215F59` | Hover, active states |
| `teal-700` | `#184A45` | Pressed state, strong contrast UI |
| `coral-400` | `#C86D54` | Disputed charges, warnings, correction markers |
| `coral-500` | `#A95742` | Hover and emphasis for issue states |
| `gold-300` | `#D7B56D` | Rare trust accent, small highlights only |
| `white` | `#FFFFFF` | Elevated surfaces where needed |


### Usage Rules


- `stone-50` is the default page background.
- `stone-100` should separate sections instead of heavy borders or cards.
- `teal-500` is the only strong accent for interactive elements.
- `coral-400` should only appear where the user needs to understand a problem, discrepancy, or dispute.
- `gold-300` should be rare and used only for tiny trust signals, not main CTAs.
- Avoid bright saturated blues and greens.


### Color Ratios


- 70% warm neutral base
- 20% ink and typography
- 8% teal interaction color
- 2% coral or gold accents


### Example CSS Tokens


```css
:root {
 --color-ink-900: #1f2923;
 --color-ink-700: #415048;
 --color-ink-500: #66736c;
 --color-stone-50: #fcfaf6;
 --color-stone-100: #f4f0e8;
 --color-stone-200: #e7e0d3;
 --color-sage-100: #e7f0ea;
 --color-sage-300: #b6cdbe;
 --color-teal-500: #2b7a72;
 --color-teal-600: #215f59;
 --color-teal-700: #184a45;
 --color-coral-400: #c86d54;
 --color-coral-500: #a95742;
 --color-gold-300: #d7b56d;
 --color-white: #ffffff;
}
```


## Typography


Use two typefaces maximum.


### Typeface Pairing


- Headlines and editorial moments: `Newsreader`
- UI, body, labels, and product surfaces: `Manrope`


### Why This Pairing


- `Newsreader` gives the product a human, literate, reassuring voice.
- `Manrope` stays modern and highly readable across dense UI and mobile layouts.
- Together they feel premium without becoming ornate.


### Font Roles


- Brand wordmark: `Newsreader` semi-bold or medium
- Hero headlines: `Newsreader` medium
- Section headlines: `Newsreader` medium
- Body, labels, buttons, form text: `Manrope`
- Numeric data, claim line metadata, timestamps: `Manrope`


### Type Scale


| Token | Desktop | Mobile | Use |
| --- | --- | --- | --- |
| `display-xl` | `88/0.92` | `52/0.98` | Hero headline |
| `display-lg` | `64/0.96` | `42/1.0` | Major section headline |
| `display-md` | `48/1.02` | `34/1.08` | Support section headline |
| `heading-lg` | `32/1.12` | `28/1.15` | Product story sections |
| `heading-md` | `24/1.2` | `22/1.22` | Component titles |
| `body-lg` | `20/1.55` | `18/1.55` | Hero support copy |
| `body-md` | `18/1.6` | `16/1.6` | Default body copy |
| `body-sm` | `16/1.55` | `15/1.55` | UI descriptions |
| `label` | `14/1.35` | `14/1.35` | Buttons, tabs, chips |
| `meta` | `13/1.35` | `13/1.35` | Eyebrows, timestamps |


Notation uses `font-size/line-height`.


### Typography Rules


- Keep hero headlines to 2-3 lines on desktop.
- Body copy should stay under 65 characters per line when possible.
- Use sentence case across the interface.
- Avoid all-caps except tiny metadata or overlines.
- Avoid excessively bold weights; trust comes from clarity, not heaviness.


## Grid, Layout, and Spacing


### Grid


- Desktop: 12-column grid
- Tablet: 8-column grid
- Mobile: 4-column grid


### Container Widths


- Full-page max width: `1440px`
- Content container: `1200px`
- Reading column: `640px`
- Narrow support copy column: `520px`


### Page Gutters


- Desktop: `72px`
- Tablet: `40px`
- Mobile: `20px`


### Spacing Scale


Use an 8px-based spacing system with a few tighter options for UI density.


| Token | Value |
| --- | --- |
| `space-1` | `4px` |
| `space-2` | `8px` |
| `space-3` | `12px` |
| `space-4` | `16px` |
| `space-5` | `24px` |
| `space-6` | `32px` |
| `space-7` | `48px` |
| `space-8` | `64px` |
| `space-9` | `96px` |
| `space-10` | `128px` |


### Section Rhythm


- Tight section spacing: `96px`
- Default section spacing: `128px`
- Hero to next section: `144px`
- Internal content group spacing: `24px` to `48px`


### Layout Rules


- Default to open layouts, not boxed cards.
- Use background changes, column shifts, and dividers instead of repeated bordered containers.
- Leave generous whitespace around key proof moments.
- Keep text blocks narrow and intentional.


## Shape Language


The product should feel softened and human, but still precise.


### Corner Radius


- Buttons: `999px` for pill CTAs
- Inputs and upload areas: `20px`
- Elevated surfaces: `24px`
- Product panels: `20px`
- Tiny tags or chips: `999px`


### Border Style


- Default border: `1px solid stone-200`
- Borders should be subtle and used sparingly.
- Avoid hard black borders.


### Shadow Style


Use shadows only on elevated, interactive, or layered surfaces.


```css
--shadow-soft: 0 10px 30px rgba(31, 41, 35, 0.08);
--shadow-medium: 0 18px 48px rgba(31, 41, 35, 0.12);
```


Rules:


- No dramatic floating shadows.
- No shadow on every element.
- Favor tonal contrast before depth.


## Homepage Structure


The homepage should read like a calming explanation, not a feature dump.


### 1. Hero


Purpose:


- Promise relief
- Show the signature product visual
- Make the first action obvious


Composition:


- Full-bleed hero background with a subtle warm-to-sage tonal shift
- Left-aligned copy column
- Right-aligned product composition showing a bill transformed into a claim workspace


Suggested content:


- Eyebrow: `Medical bill claims, explained clearly`
- Headline: `Your medical bill, made understandable and fair.`
- Support copy: `We review charges, flag what looks wrong, and help build the claim so you can move forward with confidence.`
- Primary CTA: `Start your claim`
- Secondary CTA: `See how it works`


Hero visual requirements:


- Show a real bill or bill-like document entering the system
- Show structured issue highlights
- Show a calm, legible claim review panel
- Show one clear result state, such as corrected responsibility or drafted appeal


Do not use:


- Floating stat cards
- Fake glassmorphism
- Abstract gradients with no narrative value
- Stock hero photos as the main visual


### 2. Support Section: What We Check


Purpose:


- Make the product feel useful immediately


Content blocks:


- Duplicate charges
- Incorrect out-of-network coding
- Denied coverage that may be disputable
- Missing plan-language alignment


Presentation:


- Use four vertically stacked or two-column explanation rows
- Pair plain-language descriptions with subtle claim annotations
- Use coral only to indicate problematic line items


### 3. Detail Section: How The Process Works


Purpose:


- Replace fear with process clarity


Recommended structure:


1. Upload the bill and insurer response
2. We identify likely errors and missing evidence
3. We draft the claim with supporting language
4. You review and approve
5. We track the response and next steps


Presentation:


- Sticky timeline on one side
- Large explanatory visual or panels on the other
- Each stage should feel calm and guided


### 4. Trust Section: You Stay In Control


Purpose:


- Address fear of complexity and loss of agency


Key points:


- Clear explanations for every issue found
- Progress visible at every step
- Simple records of documents and insurer responses
- Human-readable case history


Presentation:


- Use a quiet split layout
- Lean on copy and product UI fragments, not testimonials first


### 5. Final CTA


Purpose:


- Convert with calm confidence


Structure:


- Short headline
- One sentence of reassurance
- One strong CTA


Suggested content:


- Headline: `Start with the bill. We will help with the rest.`
- Body: `Upload your documents, understand what is wrong, and move forward with a claim that is easier to trust.`
- CTA: `Begin a claim`


## Signature Product UI


The claims workspace is the heart of the brand. It should feel more like a guided review table than a dashboard.


### Primary Workspace Regions


1. Main document or charge review area
2. Right-side explanation and evidence panel
3. Persistent claim progress rail
4. Light header with case status and next action


### Default Product Surface


- Background: `stone-50`
- Surface panels: `white` or very light stone tint
- Minimal chrome
- Clear spacing between content regions
- No dashboard-card mosaic


### Core Components


#### Claim Timeline


Use a horizontal stepper on desktop or vertical flow on mobile.


States:


- Uploaded
- Under review
- Issues found
- Draft prepared
- Submitted
- Awaiting response
- Resolved


Style:


- Small circular nodes
- Thin connecting lines
- Teal for active and complete
- Stone tones for incomplete
- Coral only for problem markers


#### Charge Review Rows


Each row should include:


- Provider/service label
- Service date
- Billed amount
- Patient responsibility
- Status
- Expand action


Expanded state should reveal:


- Why the charge is questionable
- What plan language or billing logic applies
- What action the claim uses


#### Explanation Panel


This is the main trust-building surface.


Contents:


- Short title in plain language
- One sentence summary
- Evidence bullets
- Relevant documents
- Recommended claim action


Tone:


- Calm
- Specific
- Non-legalistic


Example:


`This charge may be duplicated. We found two line items with the same date, provider, and service description.`


#### Upload Surface


The upload experience should feel safe and simple.


Requirements:


- Large rounded dropzone
- Plain-language instructions
- Accepted file type note
- Reassuring security or privacy note in small text


Style:


- Soft sage wash or white surface
- Dashed border only if very subtle
- No harsh upload iconography


#### Status Chips


Use chips sparingly for scanability.


Examples:


- `Reviewing`
- `Needs document`
- `Issue found`
- `Draft ready`
- `Submitted`


Chip rules:


- Rounded pill shape
- Light tinted background
- Medium-weight label
- Never use bright saturated fills


### Information Hierarchy


In the product UI, the user should see in this order:


1. Where they are in the process
2. What the product found
3. What action is needed next
4. Why the finding matters
5. The underlying details


## Buttons and Interactive Elements


### Button Styles


#### Primary Button


- Background: `teal-500`
- Text: `white`
- Radius: full pill
- Height: `52px`
- Padding: `0 22px`
- Hover: `teal-600`
- Pressed: `teal-700`


Use for:


- Start claim
- Continue
- Submit review


#### Secondary Button


- Background: transparent
- Text: `ink-900`
- Border: `1px solid stone-200`
- Hover background: `stone-100`


Use for:


- Learn more
- View document
- See process


#### Tertiary Button or Text Link


- Text: `teal-600`
- Underline on hover only
- Use sparingly


### Focus State


All interactive elements must show a visible focus ring.


```css
outline: 3px solid rgba(43, 122, 114, 0.24);
outline-offset: 2px;
```


## Forms


Forms should feel calm and short.


### Field Specs


- Height: `56px`
- Radius: `18px`
- Border: `1px solid stone-200`
- Background: `white`
- Label above field, never placeholder-only
- Error message in muted coral, not pure red


### Form Copy


- Write labels in plain language
- Avoid insurance jargon unless required
- Explain why sensitive information is needed


## Iconography


### Style


- Outline-first
- Slightly rounded stroke ends
- Stroke width around `1.75px`
- Minimal filled icons


### Icon Categories


- Upload
- Bill
- Shield/privacy
- Timeline/progress
- Evidence/document
- Message/help


Rules:


- Icons should support scanning, not decorate empty space.
- Avoid playful medical icons or overused hospital imagery.


## Imagery


Imagery must support trust and comprehension.


### Primary Image Type


The strongest visual anchor is product-led imagery:


- anonymized bill fragments
- claim review UI
- highlighted line items
- progress and explanation states


### Secondary Image Type


If human photography is used:


- Use real, quiet, domestic or everyday contexts
- Prefer moments of relief, review, or support
- Keep wardrobe and environments neutral
- Avoid smiling stock-doctor photography


### Image Rules


- No collage-style hero compositions
- No photos with heavy signage or text clutter
- No overly staged office scenes
- No hospital equipment unless directly relevant


## Motion System


Motion should make the experience feel easier to understand.


### Motion Principles


- Gentle
- Quick
- Low-friction
- Informative
- Consistent


### Key Motions


#### 1. Hero Resolution


As the page loads, the bill image subtly slides and resolves into structured claim rows and explanation markers.


Timing:


- 500ms to 700ms total
- Soft easing


#### 2. Sticky Timeline Progress


As users scroll through the process section, the current step fills in and the corresponding detail panel transitions into view.


Timing:


- 250ms to 400ms between stage changes


#### 3. Evidence Drawer Reveal


When a charge row expands, the explanation panel fades and rises in slightly.


Timing:


- 180ms to 220ms


#### 4. CTA Hover


Buttons should slightly deepen in tone and lift no more than `1px`.


### Motion Restraint


- No parallax-heavy hero
- No bouncing chips
- No decorative floating UI
- Respect reduced-motion preferences everywhere


## Responsive Behavior


### Mobile Priorities


- Headline stays clear in one glance
- CTA remains visible without clutter
- Product visual simplifies into one stacked claim review screen
- Sticky timeline becomes vertical
- Explanation drawers become full-width accordions


### Mobile Rules


- Reduce hero complexity, not just scale
- Keep top navigation minimal
- Compress whitespace while preserving calm pacing
- Avoid side-by-side layouts unless they stay readable


### Tablet Rules


- Preserve the product visual emphasis
- Keep copy column narrow
- Use 8-column layout with more generous gaps than desktop


## Accessibility


This product deals with stress and critical information. Accessibility is not optional.


### Requirements


- Body text contrast must meet WCAG AA at minimum
- Interactive states must remain clear without color alone
- Buttons and controls must meet at least `44px` touch targets
- Form labels must be persistent
- Motion must respect `prefers-reduced-motion`
- Status chips must include text, not color-only meaning


### Accessibility Tone


Readable and calm language is part of accessibility. Avoid insurance or billing jargon unless it is immediately explained.


## Copy Style


### Voice


- Calm
- Direct
- Reassuring
- Plain-spoken
- Respectful


### Preferred Language


- "We found something that may be incorrect."
- "Here is what this charge means."
- "This is the next step."
- "You can review before anything is submitted."


### Avoid


- "Fight the system"
- "Beat your insurer"
- "Win your claim"
- "AI-powered revolution"
- "Seamless disruption"


The product is strongest when it sounds informed and supportive, not promotional.


## Design Do And Do Not


### Do


- Lead with one strong product visual
- Use warm, paper-like backgrounds
- Keep layouts open and section-driven
- Use serif headlines with restrained elegance
- Show clear progress through the claim journey
- Make evidence and explanations feel central


### Do Not


- Use card grids as the main page structure
- Turn the brand into a legal-tech product
- Use loud red or warning-heavy UI
- Fill the page with dashboards, charts, or vanity metrics
- Use overbright healthcare blue
- Hide key explanations behind dense product jargon


## Implementation Notes


### Suggested Design Tokens


```css
:root {
 --font-display: "Newsreader", Georgia, serif;
 --font-ui: "Manrope", "Helvetica Neue", Arial, sans-serif;


 --radius-sm: 12px;
 --radius-md: 18px;
 --radius-lg: 24px;
 --radius-pill: 999px;


 --space-1: 4px;
 --space-2: 8px;
 --space-3: 12px;
 --space-4: 16px;
 --space-5: 24px;
 --space-6: 32px;
 --space-7: 48px;
 --space-8: 64px;
 --space-9: 96px;
 --space-10: 128px;


 --shadow-soft: 0 10px 30px rgba(31, 41, 35, 0.08);
 --shadow-medium: 0 18px 48px rgba(31, 41, 35, 0.12);
}
```


### Frontend Notes


- Build the page from sections, not repeated cards.
- Let the hero breathe edge-to-edge.
- Keep the inner text/action column constrained.
- Reuse the same color and radius logic across the landing page and app workspace.
- Make the claims workspace the visual anchor of the brand.


## Final Design Outcome


If executed correctly, the product should feel like:


- A trusted advocate, not a loud disruptor
- A clear guide, not a dense insurance tool
- A premium modern product, not a generic healthcare startup


The user should leave the first screen thinking:


`This finally makes sense, and I feel like someone is helping me handle it.`