---
title: "The proposal that wrote itself"
seoTitle: "How to automate custom trip proposals with AI (2026 guide)"
slug: "proposal-that-wrote-itself"
date: 2026-04-11
summary: "A four-hour proposal cut to seven minutes. The system behind it, who it works for, and where it falls over."
icps:
  - travel advisor
  - trip designer
tags:
  - proposals
  - office ops
  - ai
cluster: "Office Operations"
author: "Ali Murphy"
faq:
  - question: "Does this work if my proposals are highly visual (maps, photos, layouts)?"
    answer: "Yes, but the text-generation and layout-composition happen in different steps. Claude or GPT handles the writing. A templated doc system (Canva, Notion, Google Docs, or a custom tool) handles layout."
  - question: "Won't the proposals all sound the same?"
    answer: "Only if your prompt is the same. A good prompt encodes the designer's voice, past clients, and the guest brief. The output feels hand-written because the inputs are specific."
  - question: "What about the first draft problem — do I still need to review every line?"
    answer: "Review, yes. Rewrite, usually no. A well-tuned prompt produces 80–90% final copy. The 10% that needs editing is where your taste earns its keep."
---

Rachel is a custom trip designer in Boston. On a normal Tuesday she spends four hours writing one proposal. She reads the inquiry, digs through her vendor database, drafts the itinerary, writes the narrative paragraphs, formats the whole thing in Google Docs, and sends it to the guest.

By Friday she's built three proposals and answered sixty emails. Her conversion rate is 40 percent. Her revenue caps at what she can write.

Last month she replaced the four-hour proposal with a seven-minute one. Same voice, same detail, same conversion rate. Same Rachel.

Here's what changed.

## What the system actually does

The seven-minute proposal isn't magic. It's three steps run in sequence: brief capture, draft generation, and designer-level review.

1. Guest books a discovery call via a form. The form captures dates, destination interest, budget range, travel style, dietary needs, and the "why now."
2. A Claude prompt takes the form responses plus Rachel's vendor database and writes a first-draft proposal in her voice. Five paragraphs, a day-by-day itinerary, a pricing section, and a closing CTA.
3. Rachel reads the draft, tightens three paragraphs, swaps one hotel, and sends.

Step 2 is where the leverage is. The prompt includes three things most people miss: a library of Rachel's past proposals as voice examples, the specific structure she uses (inquiry → vision → day-by-day → inclusions → pricing → next step), and the actual guest brief.

## Why it works for Rachel but might not for you

This system worked for Rachel because her proposals follow a pattern. Every trip is different, but the *structure* of how she writes one is the same. The AI replaces the structure, not the creativity.

If your proposals are truly bespoke — no two look alike, no two follow the same outline — this system won't save you four hours. It'll save you maybe twenty minutes.

The test: open your last five proposals. If their section headers are 80 percent the same, automation works. If they're structurally different, automation fits differently.

## The prompt architecture

The prompt has four layers, each a separate variable that gets filled in at runtime:

| Layer | What goes in | Updated when |
|---|---|---|
| System context | Rachel's voice, brand rules, proposal structure | Once, when set up |
| Vendor library | Hotels, operators, transport options by destination | Monthly, when inventory changes |
| Past proposals | 5–10 sample proposals as voice reference | Quarterly, when writing style evolves |
| Guest brief | Today's inquiry form response | Per proposal |

Layers 1–3 are stable. Only layer 4 changes between proposals. This is why the system is fast: Rachel is reusing 90 percent of the input every time.

## What the output looks like

The first draft is not perfect. Out of ten proposals, seven go out with two or three word-level edits. Two need a paragraph rewritten. One needs substantial human work — usually because the guest brief was unusually complex or the destination was one Rachel hasn't done much of.

That last ratio is the critical one. If you're getting 10 out of 10 "needs substantial human work" drafts, your prompt is wrong. Fix the prompt, not the process.

## The real payoff isn't speed

Rachel still works 40 hours a week. She's not writing three proposals a day and calling it a win. What she's doing is sending six proposals on Tuesday, then spending the rest of the week on the parts of the job that actually differentiate her: source new hotels, build relationships with local guides, design the guest experience that happens *after* the proposal is signed.

The proposal was never where her value came from. It just took up the time that was.

## What to do next

If you're spending more than 90 minutes per proposal, and your proposals follow a repeatable structure, this is worth building. Two ways to go:

- Book a discovery call and we'll map it with you. Usually takes one session to confirm fit and two weeks to build the system.
- Or start DIY. Write out your proposal structure as a template. Collect five of your best past proposals. Drop them into Claude with today's brief. Iterate on the prompt for a week. You'll get something that works 70 percent as well as a custom-built version.

The 70-percent version is often enough.
