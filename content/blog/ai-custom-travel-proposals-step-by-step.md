---
title: "How to Use AI to Generate Custom Travel Proposals"
seo_title: "How to Use AI to Generate Custom Travel Proposals (Step-by-Step Guide)"
slug: "ai-custom-travel-proposals-step-by-step"
description: "A practical guide to using Claude or ChatGPT to draft custom travel proposals in 20 minutes instead of four hours. Includes the exact prompts, the document setup, the brand-voice trick, and the three workflows that actually save time."
author: "Ali Murphy"
date_published: "2026-04-29"
date_modified: "2026-05-04"
cluster: "Office Operations"
role: "AEO-forward"
icps: ["TA", "CTD"]
angle: "Office Ops"
format: "Process Improvement"
funnel: "MOFU"
tags: ["custom proposals", "AI for travel advisors", "Claude prompts", "trip designers"]
featured_image: "/images/blog/ai-custom-travel-proposals-card.webp"
featured_image_alt: "Editorial illustration: a trip designer at her laptop with calendar, location, lodging, flight, and pricing icons feeding into a glowing travel proposal document, an arrow flowing the finished proposal out to a client recipient and email confirmation, captioned AI generates itinerary, automatically formatted, instantly sent to client."
faq:
  - question: "Can I use ChatGPT instead of Claude for this?"
    answer: "Yes, the workflow works with ChatGPT. The prompts above transfer directly. Claude tends to produce better prose voice matching and lower hallucination rates on travel content, which is why I recommend it for proposals specifically. Use what you have access to. The workflow design matters more than the model."
  - question: "What about Travefy, Tern, or Axus AI features?"
    answer: "If you already use one of these platforms, use their built-in AI proposal generation. They are designed to integrate with the rest of the trip-design workflow (booking, sharing, client portal). The principles in this post still apply: build the vendor knowledge file, build the brand voice document, edit for accuracy and magic. The platform handles the prompt for you."
  - question: "Is it safe to put client information into Claude?"
    answer: "Use the Claude Pro or Team plan, which does not train on your inputs. For the client intake document, anonymize names and contact details if you are concerned. For the proposal itself, the trip details are not particularly sensitive. If you handle passport numbers, payment information, or medical details for booking purposes, those should never go into any general-purpose AI tool, including Claude. Keep that data in your booking system."
  - question: "My proposals include images and complex layouts. Does this still work?"
    answer: "The workflow above produces text. The visual layout is still your job (or your platform's job, if you use Travefy and similar). The time savings come from getting the words right faster, which is usually the harder problem. Once the words are right, dropping them into a layout takes 10 to 15 minutes."
  - question: "How do I know if this is working?"
    answer: "Three metrics. Time per proposal (track it for a month before and a month after). Proposals sent per week (does it go up). Win rate (does it stay flat or go up). If any of those moves backward, something in the setup is off. Most often it is the brand voice document being too thin."
  - question: "What if I work with luxury clients who can spot a generic AI proposal from a mile away?"
    answer: "Luxury clients are the hardest case and also the case where this workflow shines hardest, because the bottleneck on luxury proposals is voice and detail, not structure. Spend two hours on the brand voice document, not 20 minutes. Use Claude (not ChatGPT) for the drafting. Always do the magic-touches edit pass. The luxury proposal that wins is not the one without AI involvement; it is the one where the AI involvement was invisible."
---

A custom trip designer I work with in Mexico City had a pattern. A new lead would come in Tuesday morning. By Tuesday at 11 PM, she would still be at her desk, on her third coffee, building a fifteen-page proposal in Canva. The trip itself, when it ran, would last ten days and gross around forty thousand dollars. The proposal that won it had taken her four hours. Sometimes five. Always too many.

She is not slow. She is one of the best in her market. The problem is that the proposal is a synthesis problem and humans are terrible at synthesis under time pressure. You are pulling from a vendor list, a destination knowledge base, a client questionnaire, past trip reports, and your own taste, and writing it all into a document that has to look beautiful and read like you, in a tone that matches a client you have spoken to once. Of course it takes four hours.

In April she started using Claude to draft her proposals. Her current average is twenty-two minutes from new lead to first draft she can review and personalize. Same win rate. Same client compliments. The forty thousand dollars now closes on Tuesday morning instead of Wednesday afternoon, which means she has Tuesday afternoons back for the rest of her life.

This post is how she did it. The setup, the prompts, the documents, the workflow, and the three things that broke before they worked.

## Which AI tool should travel advisors use to write proposals?

Use Claude. The longer answer: Claude has the best long-context handling for proposal work, the cleanest prose voice, and the lowest rate of factual hallucination on travel content. ChatGPT works but writes in a generic register that needs more cleanup. Gemini is fine for research, weak for drafting. For proposals specifically, Claude is the right tool, and the rest of this post assumes it.

If you are using a custom trip-designer platform like Travefy, Tern, or Axus, those platforms have their own AI proposal features that bolt onto your existing workflow. Use them if you are already inside that ecosystem. The principles below still apply.

## What you need before you start

Three documents in place before you write a single prompt. None of these takes more than an afternoon to build, and you build them once.

**1. A vendor knowledge file (one document, 5 to 30 pages).**
Every hotel, lodge, guide, driver, and experience you have ever used or seriously considered. Per vendor: name, location, price tier, what they are good at, what they are not, who they are right for, who they are wrong for, last time you checked, the contact's name. This is the single most valuable artifact you will build, and it is the difference between AI proposals that are useful and AI proposals that are generic.

If you do not have this, building it takes a day. Open a Google Doc. Go through your last twenty trips. Write a paragraph per vendor. Keep it short. You can refine forever once it exists, but the rough version is more useful than no version.

**2. A brand voice document (one to three pages).**
This is the secret. Most AI proposals read generic because most users do not give the model a voice to write in. Open a Google Doc and paste in three to five paragraphs from your best past proposals, your website's about page, and a long client email you wrote that sounded most like you. Above the paste-in, write four or five sentences describing how you write: do you use second person, what is your sentence length, do you use sensory detail, do you avoid certain words. This document teaches Claude your voice in one prompt.

**3. A client intake summary (per proposal, fresh each time).**
A short structured document or email summary capturing: who is traveling, ages and relationships, dates and length, total budget range, travel style, must-haves, deal-breakers, anything memorable from the discovery call. The richer this is, the better the proposal. Most designers already have a version of this in their CRM or Google Forms intake.

That is the full setup. Three documents. Half a day to build the first two.

## The exact prompt for the first draft

Open Claude. Start a new conversation. Upload the three documents (vendor file, brand voice file, client intake) using the paperclip icon, or paste them in if you prefer.

Then send this prompt. The wording matters. Pay attention to the parts in brackets, which you customize per client.

```
You are helping me draft a custom trip proposal for a returning client of my
trip-design business. I have attached three files:

1. My vendor knowledge file. Use only vendors from this file. Do not invent
   hotels, restaurants, or operators that are not in the document.

2. My brand voice document. Match this voice precisely. Read the example
   paragraphs and write in the same register, sentence rhythm, and word choice.

3. The client intake for [CLIENT NAME].

Draft a [N]-day trip proposal for [DESTINATION/REGION], dated [DATES], for
[NUMBER] travelers. The total budget is [BUDGET RANGE], all-inclusive of
accommodations, in-trip transport, guides, and listed experiences (international
flights excluded).

The proposal should include:

- A one-paragraph opening that speaks directly to this client by name and
  references something specific from their intake.
- A day-by-day itinerary. Each day has: a date, a one-sentence headline for
  the day, two to four short paragraphs of narrative description, the
  accommodation, and any included experiences with one-line context on why
  they fit this client.
- A short "what's included" and "what's not included" section.
- A pricing summary with a range, presented as "Investment: starting at
  $X per person, double occupancy."
- A short closing paragraph that does not feel like a closing paragraph.

Important constraints:
- Match my brand voice document. Do not write in generic AI prose.
- Recommend only vendors from my vendor file. If you do not have a strong
  match in the file for a slot in the itinerary, leave a placeholder in
  brackets like [VENDOR NEEDED: small luxury hotel near Oaxaca, $400-600/night]
  and tell me at the end which slots need my input.
- Do not invent factual details. If you don't know something, say so.

Output: the proposal as a single document, formatted in Markdown, ready for
me to review.
```

That prompt produces a 80-percent-there draft on the first try. The remaining 20 percent is your edit pass.

## The edit pass (15 minutes)

Read the draft once for voice. If a phrase makes you wince, delete it. Claude will sometimes slip into a slightly elevated register on the first pass; trust your ear and cut anything that does not sound like you.

Read it a second time for accuracy. Confirm every vendor mentioned exists in your file and is currently available for those dates. Confirm pricing tiers are realistic for the season. Confirm the intake details are correctly reflected.

Read it a third time for missing magic. The thing that makes your proposals win is usually one specific touch that no AI will surface on its own. The hotel owner who is also a sommelier and will host a private tasting if you ask. The guide who happens to be a fourth-generation potter. Add the magic. This is your contribution and the reason your client hired you instead of a website.

Total time: 15 to 25 minutes for a designer who knows their material.

## Three workflows that go beyond the first draft

The single-prompt workflow above gets you a draft in 20 minutes. Three other workflows compound the savings if you write proposals at volume.

### Workflow A: The brand voice sample expander

If you spend hours on the closing paragraphs of proposals (where the voice has to land hardest), build a sub-prompt that just generates closings.

Open a separate Claude Project, attach your brand voice document, and prompt:

```
Write five different closing paragraphs for a custom trip proposal. Each
should be 60 to 90 words. Each should match the voice in my brand voice
document exactly. Each should land on a different emotional note: one
warm and personal, one quietly confident, one anticipatory, one
playful, one almost reverent. Do not use the words "embark," "journey,"
"unforgettable," "experience" (as a verb), or "look forward." Do not use
em dashes.
```

Save the best of the five. Use them across proposals, swapping the specific client detail. After five iterations you have a closing-paragraph library that always sounds like you.

### Workflow B: The vendor matcher

When the client intake lands and you need to think through who could fit, you can use Claude as a matching engine before you draft.

```
I have a new client intake (attached). Based on my vendor knowledge file
(also attached), recommend the three best hotels in [DESTINATION] for this
client and explain why each one fits, in two sentences each. Then recommend
two backup options in case the first three are unavailable for the dates.
For each recommendation, name the contact person from my vendor file and
note the last time I worked with them.
```

This is a 60-second exercise that often surfaces a vendor you would have forgotten under time pressure. It also pre-stages the calls or emails you need to make to confirm availability before the proposal is sent.

### Workflow C: The proposal-to-website pipeline

If your proposals live as Canva or Google Docs but your booked trips become content for your website (case studies, "trips we love" pages, blog posts), Claude can convert one to the other.

```
Take the attached proposal for [CLIENT, ANONYMIZED]. Rewrite it as a 600-word
case study for my website, with names changed and dates removed. Match the
voice in my brand voice document. Keep the day-by-day structure but
compress each day to two or three sentences. End with a short paragraph
about who this trip would be right for.
```

You now have website content from work you already did. The marginal cost is one prompt and a five-minute edit. Twenty proposals a year becomes twenty case studies, which is your SEO and your social proof.

## What breaks the first time you try this

Three things to know.

**The first draft will be generic if your brand voice document is thin.** This is the failure mode I see most often. People give Claude one paragraph of voice sample and expect a fully personalized proposal. The voice document needs at least 800 to 1,500 words of your real writing, varied across formats. Spend the afternoon on it. Everything downstream improves by 30 to 50 percent.

**Claude will occasionally invent a hotel.** Not often, but it happens, especially in destinations where its training data is thin. The fix is in the prompt above ("use only vendors from this file") and in your edit pass. Always verify every vendor mentioned actually exists in your file and is currently bookable.

**The first prompt will produce a proposal that is too long.** Default Claude behavior is to be thorough. Most custom proposals win by being focused, not exhaustive. Ask for a target word count in the prompt ("the proposal should be 1,200 to 1,800 words total") and lower it as you find your sweet spot. My designer in Mexico City sends proposals around 1,400 words. They convert better than her old 3,000-word versions.

## What this saves and what it does not save

Realistic numbers from my designer in Mexico City after four months of using this workflow:

- **Time per proposal:** 4 to 5 hours, down to 20 to 30 minutes
- **Proposals sent per week:** 3 to 4, up to 8 to 10
- **Win rate:** unchanged at around 35 percent (this is good news, not flat)
- **Proposal quality, by client feedback:** equal or slightly better, because she has time to add the magic touches she used to skip when exhausted

What it does not save: the discovery call, the client relationship, the destination expertise, the taste. It saves the synthesis. It does not save the judgment.

That distinction matters. AI proposals work because the designer is still the designer. Claude is the assistant who lays out the materials so the designer can do the hard part faster. If you bring weak vendor knowledge or a thin client intake, AI will produce a weak proposal faster, which is a worse problem than producing a weak proposal slowly.

## What this means for the client

The custom trip designer's product is two things: the trip itself and the proposal that earns the trust to book it. The proposal is the only artifact the client has before they commit five figures to a stranger.

When you are spending five hours on a proposal, two of those hours are on the parts that make the proposal feel like you, and three of them are on the parts the client does not actually care about. The structure. The formatting. The "what's included." Those parts are necessary, but they are not the reason the client says yes.

AI lets you redirect those three hours. Some of that time becomes an extra hour of sleep. Some of it becomes one more proposal sent this week. The best of it becomes the part that was always supposed to be the product: more time on the discovery call, more thought about the magic touches, more attention to whether this trip is right for this client at all.

The proposal stops being a thing you survive. It becomes a thing you craft.

## What to do next

Start tomorrow. Build the brand voice document first, because it is the bottleneck. Pull three to five paragraphs from past proposals you are proud of, paste them into a Google Doc, write four or five sentences describing your voice. Twenty minutes of work. Then upload it to Claude with one of your real client intakes and try the prompt above on a real upcoming proposal.

If you want help building the vendor knowledge file or want a template for the brand voice document, [book a discovery call](https://www.afuerai.com/#contact). I can walk you through both in 30 minutes. Or build it yourself. The point is to get the system running this week, not next quarter.

The post-proposal workflow described here is one of [twelve tour operator workflows worth automating with AI](/blog/tour-operator-workflows-to-automate-with-ai/). For trip designers specifically, the proposal workflow and the [client memory and itinerary system](/blog/ai-knowledge-base-client-history-trip-designers/) compound, because the same vendor file feeds both.

## Sources and further reading

- [USTOA's 2025 member survey](https://ustoa.com/) on AI adoption in tour operations.
- [Arival's research](https://arival.travel/research/) on the experience industry's tech adoption curve.
- Anthropic's [documentation on Claude Projects](https://docs.claude.com/) for building reusable knowledge files.
- Skift's coverage of [AI tools for travel advisors and DMCs](https://skift.com/).
- The [Travefy](https://travefy.com/), [Tern](https://www.tern.com/), and [Axus](https://axustravelapp.com/) platforms if you are evaluating built-in AI proposal tools.
