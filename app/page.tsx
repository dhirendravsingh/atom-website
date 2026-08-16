"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import SplashCursor from "./components/SplashCursor";

const APK_PATH = "/atom.v3.apk";
const APK_SHA = "947db631b06dddbf69f3c67ab0134b0cc7671483668a37f6d1e6701fa0a19e25";

type ParseKind = "task" | "date" | "time" | "recurrence";

type MatchRange = {
  kind: Exclude<ParseKind, "task">;
  start: number;
  end: number;
  value: string;
};

type SentenceToken = {
  text: string;
  start: number;
  end: number;
  kind?: ParseKind;
};

type ParseResult = {
  task: string;
  date: string | null;
  time: string | null;
  recurrence: string | null;
  question: string | null;
  tokens: SentenceToken[];
};

const seeds = [
  "Remind me to send the product brief to Aisha at 6:30 PM tomorrow.",
  "Every Sunday at 7 PM remind me to call Mum.",
  "Remind me to refill my prescription tomorrow.",
  "In 20 minutes remind me to switch off the oven.",
];

const experienceSteps = [
  {
    index: "01",
    label: "CAPTURE",
    title: "Say it naturally.",
    body: "Speak or type the thought as it arrives. No form, no date picker, no ceremony.",
  },
  {
    index: "02",
    label: "UNDERSTAND",
    title: "Atom separates intent from timing.",
    body: "Task, date, time and recurrence are extracted on-device. If a critical detail is missing, Atom asks.",
  },
  {
    index: "03",
    label: "DELIVER",
    title: "The reminder actually rings.",
    body: "Native Android alarms wake through Doze and give you snooze, complete and remind-again actions.",
  },
];

const productExperienceSteps = [
  {
    index: "01",
    label: "TODAY",
    title: "A calm home for what matters.",
    body: "Atom greets you by name, shows what is scheduled and keeps quick capture within immediate reach.",
  },
  {
    index: "02",
    label: "CAPTURE",
    title: "Say it the way you think it.",
    body: "Press the microphone and speak naturally. Your words stay editable while Atom finds the task and timing.",
  },
  {
    index: "03",
    label: "REMINDERS",
    title: "Everything on your radar.",
    body: "Search and filter scheduled, repeating or incomplete reminders from one focused view.",
  },
];

const faqItems = [
  {
    question: "What can I say to Atom?",
    answer: "Create, reschedule, cancel, snooze, complete and repeat reminders in natural language. If a date, time or AM/PM detail is unclear, Atom asks instead of guessing.",
  },
  {
    question: "Does Atom send reminders to a server?",
    answer: "No. Reminder records are stored on your Android device. The website playground also parses in your browser without a network request.",
  },
  {
    question: "Why does Atom request exact-alarm access?",
    answer: "Android 12 and later require special access for exact alarms. Atom uses it so a 6:30 PM reminder can target 6:30 PM, including while the phone is idle.",
  },
  {
    question: "Which devices are supported?",
    answer: "The current Android APK supports Android 8.0 and later. iOS is planned, but there is no iOS download yet.",
  },
];

function titleCase(value: string) {
  return value
    .trim()
    .replace(/^(at|on)\s+/i, "")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(raw: string) {
  const clean = raw.replace(/^at\s+/i, "").trim();
  if (/^noon$/i.test(clean)) return { value: "12:00 PM", ambiguous: false };
  if (/^midnight$/i.test(clean)) return { value: "12:00 AM", ambiguous: false };
  if (/^in\s+/i.test(clean)) return { value: titleCase(clean), ambiguous: false };

  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return { value: titleCase(clean), ambiguous: false };
  const hour = match[1];
  const minute = match[2] ?? "00";
  const meridiem = match[3]?.toUpperCase();
  return {
    value: `${hour}:${minute}${meridiem ? ` ${meridiem}` : ""}`,
    ambiguous: !meridiem,
  };
}

function parseReminder(input: string): ParseResult {
  const text = input.trim();
  const ranges: MatchRange[] = [];

  const recurrenceMatch = /\b(?:every\s+(?:\d+\s+)?(?:day|days|weekday|weekdays|week|weeks|month|months|monday|tuesday|wednesday|thursday|friday|saturday|sunday|hour|hours)|daily|weekly|monthly)\b/i.exec(text);
  if (recurrenceMatch) {
    ranges.push({
      kind: "recurrence",
      start: recurrenceMatch.index,
      end: recurrenceMatch.index + recurrenceMatch[0].length,
      value: titleCase(recurrenceMatch[0]),
    });
  }

  const dateMatch = /\b(?:(?:on|next)\s+)?(?:today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+week|this\s+weekend)\b/i.exec(text);
  if (dateMatch && !ranges.some((range) => dateMatch.index >= range.start && dateMatch.index < range.end)) {
    ranges.push({
      kind: "date",
      start: dateMatch.index,
      end: dateMatch.index + dateMatch[0].length,
      value: titleCase(dateMatch[0]),
    });
  }

  const relativeTime = /\bin\s+\d+\s+(?:minute|minutes|hour|hours)\b/i.exec(text);
  const clockTime = /\b(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)\b/i.exec(text);
  const timeMatch = relativeTime ?? clockTime;
  let ambiguousTime = false;
  if (timeMatch) {
    const formatted = formatTime(timeMatch[0]);
    ambiguousTime = formatted.ambiguous;
    ranges.push({
      kind: "time",
      start: timeMatch.index,
      end: timeMatch.index + timeMatch[0].length,
      value: formatted.value,
    });
  }

  const prefixMatch = /^\s*(?:(?:hey\s+)?atom[,\s]*)?(?:remind\s+me(?:\s+to|\s+about)?|remember\s+to|schedule|create\s+(?:a\s+)?reminder(?:\s+to)?|don['’]t\s+let\s+me\s+forget\s+to)\s*/i.exec(text);
  const prefixEnd = prefixMatch?.[0].length ?? 0;
  const taskCharacters = Array.from(text);
  for (let index = 0; index < prefixEnd; index += 1) taskCharacters[index] = " ";
  ranges.forEach((range) => {
    for (let index = range.start; index < range.end; index += 1) taskCharacters[index] = " ";
  });
  const task = taskCharacters
    .join("")
    .replace(/\b(?:at|on)\s*[,.]?\s*$/i, "")
    .replace(/\s+/g, " ")
    .replace(/^[,.;\s]+|[,.;\s]+$/g, "") || "Untitled reminder";

  const rawTokens: SentenceToken[] = [];
  const matcher = /\s+|[^\s]+/g;
  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = matcher.exec(text))) {
    const start = tokenMatch.index;
    const end = start + tokenMatch[0].length;
    const range = ranges.find((candidate) => start < candidate.end && end > candidate.start);
    const isTask = start >= prefixEnd && !range && /\S/.test(tokenMatch[0]);
    rawTokens.push({ text: tokenMatch[0], start, end, kind: range?.kind ?? (isTask ? "task" : undefined) });
  }

  const date = ranges.find((range) => range.kind === "date")?.value ?? null;
  const time = ranges.find((range) => range.kind === "time")?.value ?? null;
  const recurrence = ranges.find((range) => range.kind === "recurrence")?.value ?? null;
  let question: string | null = null;
  if (!time) question = `What time should I remind you to ${task.replace(/[?.!]$/, "")}?`;
  else if (ambiguousTime) question = `Is ${time} in the morning or evening?`;
  else if (!date && !recurrence && !relativeTime) question = "Which day should this reminder run?";

  return { task, date, time, recurrence, question, tokens: rawTokens };
}

function AtomMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup ${compact ? "compact" : ""}`}>
      <span className="brand-icon"><Image src="/atom-icon.svg" alt="" width={64} height={64} priority /></span>
      <span className="brand-word">atom</span>
    </span>
  );
}

function MicGlyph() {
  return <span className="mic-glyph" aria-hidden="true"><i /></span>;
}

function ProductPhonePanels() {
  return (
    <>
      <section className="phone-panel native-home-panel">
        <div className="native-greeting-card">
          <div className="native-greeting">
            <small>SUNDAY, AUGUST 16</small>
            <h3>Good afternoon,<br /><em>Dhiren Sir.</em></h3>
            <p>You have 3 reminders ready.</p>
          </div>
          <div className="native-doodle" aria-hidden="true">
            <div className="doodle-head"><i /><i /><b /></div>
            <div className="doodle-body" />
            <div className="doodle-arm left" />
            <div className="doodle-arm right" />
            <div className="doodle-spark coral" />
            <div className="doodle-spark mint" />
          </div>
        </div>

        <div className="native-quick-card">
          <div className="native-card-orbits" aria-hidden="true"><i /><i /><b /></div>
          <small><i /> QUICK CAPTURE</small>
          <strong>What should I remind you?</strong>
          <div className="native-quick-entry"><span>Tell Atom what to remember…</span><b><MicGlyph /></b></div>
          <p>Try “in 20 minutes” or “every weekday at 9 AM”</p>
        </div>

        <div className="native-next-head"><div><small>COMING UP</small><strong>Your next reminder</strong></div><span>See all ›</span></div>
        <div className="native-reminder-card"><b>◷</b><div><strong>Send product brief</strong><span>Today · 6:30 PM</span></div><i>•••</i></div>
        <div className="native-home-stats"><div><strong>03</strong><span>Scheduled</span></div><div><strong>01</strong><span>Needs a detail</span></div></div>
      </section>

      <section className="phone-panel native-capture-panel">
        <div className="native-capture-head"><b>←</b><div><strong>New reminder</strong><span>Say it the way you think it</span></div><i>×</i></div>
        <h3>Say it naturally.<br />I’ll find the when.</h3>
        <p className="native-capture-hint">“Atom” is optional after you press the microphone.</p>
        <div className="native-voice-orb" aria-label="Listening"><i /><i /><b><MicGlyph /></b></div>
        <small className="native-listening"><i /> Listening on your device…</small>
        <div className="native-words-card">
          <div><small>YOUR WORDS</small><span>Listening…</span></div>
          <p>Send the product brief to Aisha tomorrow at 6:30 PM</p>
        </div>
        <div className="native-suggestion-row"><span>In 20 minutes</span><span>Tomorrow</span><span>Every weekday</span></div>
        <button className="native-understand-button" type="button" tabIndex={-1}><span>✦</span> Understand reminder</button>
      </section>

      <section className="phone-panel native-reminders-panel">
        <div className="native-reminders-head"><div><small>REMINDERS</small><h3>Everything on<br />your radar</h3></div><b aria-hidden="true">⌕</b></div>
        <div className="native-filter-row"><strong>All</strong><span>Scheduled</span><span>Needs details</span><span>Repeats</span></div>
        <div className="native-reminder-list">
          <article><i className="mint" /><div><strong>Send product brief to Aisha</strong><p>▣ Tomorrow&nbsp;&nbsp; ◷ 6:30 PM</p><small>Voice</small></div><b>✎</b></article>
          <article><i className="coral" /><div><strong>Call Mum</strong><p>▣ Sunday&nbsp;&nbsp; ◷ 7:00 PM</p><small>Text</small></div><b>✎</b></article>
          <article><i className="lime" /><div><strong>Review my priorities</strong><p>▣ Every weekday&nbsp;&nbsp; ◷ 9:00 AM</p><small>Voice · Repeats</small></div><b>✎</b></article>
        </div>
      </section>
    </>
  );
}

function PhoneMockup({ screen, productUI = false }: { screen: number; productUI?: boolean }) {
  return (
    <div className={`phone phone-state-${screen} ${productUI ? "product-phone" : ""}`} aria-label="Atom product interface preview">
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-status"><span>9:41</span><span>••• ◐ ▰</span></div>
        <div className="phone-screen">
          <header className="app-header"><AtomMark compact />{productUI ? <div className="native-head-actions" aria-hidden="true"><i className="native-moon">◒</i><i className="native-bell">♢<b /></i><span>D</span></div> : <span>D</span>}</header>
          <div className="phone-panels">
            {productUI ? <ProductPhonePanels /> : <>
              <section className="phone-panel capture-panel">
                <small>QUICK CAPTURE</small>
                <h3>What should I remember?</h3>
                <div className="capture-input"><span>Tell Atom what to remember…</span><b><MicGlyph /></b></div>
                <div className="voice-wave" aria-hidden="true">
                  {Array.from({ length: 20 }).map((_, index) => <i key={index} style={{ "--wave": `${0.25 + (index * 13 % 65) / 100}` } as CSSProperties} />)}
                </div>
                <p>“Send the product brief to Aisha at 6:30 tomorrow.”</p>
              </section>
              <section className="phone-panel understand-panel">
                <small>ATOM UNDERSTOOD</small>
                <h3>Send product brief to Aisha</h3>
                <div className="phone-slots"><span>TOMORROW</span><span>6:30 PM</span><span>ONE TIME</span></div>
                <div className="local-status"><i /> Parsed on this device</div>
              </section>
              <section className="phone-panel delivery-panel">
                <div className="alarm-pulse"><i /><i /><b>6:30</b></div>
                <small>PM · TOMORROW</small>
                <h3>Send product brief<br />to Aisha</h3>
                <div className="alarm-actions"><span>Snooze</span><strong>Complete</strong><span>Again</span></div>
              </section>
            </>}
          </div>
          <nav className="phone-nav"><span className={productUI && screen === 0 ? "active" : ""}><i>⌂</i>Today</span><span className={productUI && screen === 2 ? "active" : ""}><i>☷</i>Reminders</span><b>+</b><span><i>⚙</i>Settings</span></nav>
        </div>
      </div>
    </div>
  );
}

function StatePreview({ screen, productUI = false }: { screen: number; productUI?: boolean }) {
  const content = (productUI ? [
    ["TODAY", "Good afternoon, Dhiren Sir."],
    ["VOICE CAPTURE", "Say it naturally. I’ll find the when."],
    ["REMINDERS", "Everything on your radar"],
  ] : [
    ["VOICE CAPTURE", "“Remind me to call Mum Sunday at 7.”"],
    ["TASK · DATE · TIME", "Call Mum · Sunday · 7:00 PM"],
    ["ANDROID ALARM", "Scheduled and ready to ring"],
  ])[screen];
  return <div className={`mobile-state state-${screen}`}><small>{content[0]}</small><strong>{content[1]}</strong></div>;
}

function DownloadButton({ large = false }: { large?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const move = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${(event.clientX - bounds.left - bounds.width / 2) * 0.14}px`);
    event.currentTarget.style.setProperty("--my", `${(event.clientY - bounds.top - bounds.height / 2) * 0.18}px`);
  };
  const reset = () => {
    ref.current?.style.setProperty("--mx", "0px");
    ref.current?.style.setProperty("--my", "0px");
  };
  return (
    <a ref={ref} className={`download-button ${large ? "large" : ""}`} href={APK_PATH} download onPointerMove={move} onPointerLeave={reset}>
      <span>Download Android APK</span><b aria-hidden="true">↓</b>
    </a>
  );
}

function ParserPlayground() {
  const [input, setInput] = useState(seeds[0]);
  const [result, setResult] = useState<ParseResult>(() => parseReminder(seeds[0]));
  const [parseRun, setParseRun] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [parseMs, setParseMs] = useState("0.0");
  const sentenceRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const executeParse = useCallback((value: string) => {
    if (!value.trim()) return;
    setProcessing(true);
    const start = performance.now();
    const next = parseReminder(value);
    setResult(next);
    setParseRun((run) => run + 1);
    setParseMs((performance.now() - start).toFixed(1));
    queueMicrotask(() => setProcessing(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => executeParse(input), 360);
    return () => window.clearTimeout(timer);
  }, [input, executeParse]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const flying: HTMLElement[] = [];
    const timers: number[] = [];
    const frame = window.requestAnimationFrame(() => {
      const source = sentenceRef.current;
      const resultCard = resultRef.current;
      if (!source || !resultCard) return;
      source.classList.remove("is-parsing");
      resultCard.classList.remove("is-complete");
      void source.offsetWidth;
      source.classList.add("is-parsing");

      const nodes = Array.from(source.querySelectorAll<HTMLElement>("[data-token-kind]"));
      nodes.forEach((node, index) => {
        const kind = node.dataset.tokenKind;
        const destination = resultCard.querySelector<HTMLElement>(`[data-slot="${kind}"]`);
        if (!destination || !node.textContent?.trim()) return;
        const from = node.getBoundingClientRect();
        const to = destination.getBoundingClientRect();
        const clone = document.createElement("span");
        clone.className = "flying-token";
        clone.textContent = node.textContent;
        Object.assign(clone.style, {
          left: `${from.left}px`,
          top: `${from.top}px`,
          width: `${from.width}px`,
          height: `${from.height}px`,
        });
        document.body.appendChild(clone);
        flying.push(clone);
        const dx = to.left + Math.min(to.width * 0.18, 24) - from.left;
        const dy = to.top + to.height / 2 - from.top - from.height / 2;
        const animation = clone.animate(
          [
            { opacity: 0, transform: "translate3d(0,0,0) scale(1)" },
            { opacity: 0.9, offset: 0.18 },
            { opacity: 0, transform: `translate3d(${dx}px,${dy}px,0) scale(.72)` },
          ],
          { duration: 420, delay: Math.min(index * 34, 330), easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" },
        );
        void animation.finished.finally(() => clone.remove());
      });
      timers.push(window.setTimeout(() => resultCard.classList.add("is-complete"), Math.min(nodes.length * 34 + 330, 720)));
      timers.push(window.setTimeout(() => source.classList.remove("is-parsing"), 860));
    });

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
      flying.forEach((element) => element.remove());
    };
  }, [parseRun]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    executeParse(input);
  };

  return (
    <div className="playground-shell">
      <form className="playground-input" onSubmit={submit}>
        <label htmlFor="reminder-input">Type a reminder in your own words</label>
        <textarea id="reminder-input" value={input} onChange={(event) => setInput(event.target.value)} rows={3} spellCheck="true" />
        <div className="playground-controls">
          <span><i /> {processing ? "PARSING" : `PARSED LOCALLY · ${parseMs}MS`}</span>
          <button type="submit">Parse reminder <b>↗</b></button>
        </div>
        <div className="seed-list" aria-label="Example reminder phrases">
          {seeds.map((seed, index) => <button type="button" key={seed} onClick={() => { setInput(seed); executeParse(seed); }}>0{index + 1}</button>)}
        </div>
      </form>

      <div className="sentence-stage">
        <div className="stage-label"><span>INPUT SENTENCE</span><span>CLIENT-SIDE RULE PARSER</span></div>
        <div ref={sentenceRef} className="token-sentence" aria-label={input}>
          {result.tokens.map((token, index) => (
            <span key={`${token.start}-${index}`} className={token.kind ? `token token-${token.kind}` : "token"} data-token-kind={token.kind} aria-hidden="true">{token.text}</span>
          ))}
        </div>
      </div>

      <div ref={resultRef} className="parse-result" key={parseRun}>
        <div className="result-head"><span>ATOM UNDERSTOOD</span><span>{result.question ? "NEEDS A DETAIL" : "READY TO SCHEDULE"}</span></div>
        <div className="result-slots">
          <div className="result-slot task-slot" data-slot="task"><small>TASK</small><strong>{result.task}</strong></div>
          <div className="result-slot" data-slot="date"><small>DATE</small><strong>{result.date ?? (result.recurrence ? "From recurrence" : result.time?.startsWith("In ") ? "From now" : "Needed")}</strong></div>
          <div className="result-slot" data-slot="time"><small>TIME</small><strong>{result.time ?? "Needed"}</strong></div>
          <div className="result-slot" data-slot="recurrence"><small>REPEATS</small><strong>{result.recurrence ?? "One time"}</strong></div>
        </div>
        {result.question ? <div className="atom-question"><small>ATOM WOULD ASK</small><p>{result.question}</p></div> : <div className="parse-confirmation"><i /> Task, timing and recurrence are clear.</div>}
      </div>
    </div>
  );
}

function FaqItem({ index, question, answer }: { index: number; question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "open" : ""}`}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <small>0{index + 1}</small><span>{question}</span><b aria-hidden="true">+</b>
      </button>
      <div className="faq-answer"><div><p>{answer}</p></div></div>
    </div>
  );
}

export function MarketingSite({ prototypeTwo = false }: { prototypeTwo?: boolean }) {
  const [ready, setReady] = useState(false);
  const [showPreloader, setShowPreloader] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [phoneScreen, setPhoneScreen] = useState(0);
  const [copied, setCopied] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  const visibleExperienceSteps = prototypeTwo ? productExperienceSteps : experienceSteps;

  useEffect(() => {
    const seen = window.sessionStorage.getItem("atom-intro-v2") === "seen";
    if (seen) {
      const frame = window.requestAnimationFrame(() => {
        setReady(true);
        setShowPreloader(false);
      });
      return () => window.cancelAnimationFrame(frame);
    }
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.sessionStorage.setItem("atom-intro-v2", "seen");
      setReady(true);
      setShowPreloader(false);
    };
    const cap = window.setTimeout(finish, 560);
    void document.fonts.ready.then(finish);
    return () => window.clearTimeout(cap);
  }, []);

  useEffect(() => {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.2 });
    document.querySelectorAll("[data-reveal]").forEach((element) => revealObserver.observe(element));

    const steps = Array.from(document.querySelectorAll<HTMLElement>("[data-step]"));
    let scrollFrame = 0;
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        pageRef.current?.style.setProperty("--progress", `${max > 0 ? window.scrollY / max : 0}`);

        const anchor = window.innerHeight * .48;
        const experience = document.getElementById("experience")?.getBoundingClientRect();
        if (!experience || experience.top > anchor) {
          setPhoneScreen(0);
          return;
        }
        let activeIndex = 0;
        let nearest = Number.POSITIVE_INFINITY;
        steps.forEach((step, index) => {
          const bounds = step.getBoundingClientRect();
          const distance = Math.abs(bounds.top + bounds.height * .42 - anchor);
          if (distance < nearest) {
            nearest = distance;
            activeIndex = index;
          }
        });
        setPhoneScreen(activeIndex);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      revealObserver.disconnect();
      window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const copyChecksum = async () => {
    await navigator.clipboard.writeText(APK_SHA);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main ref={pageRef} className={`site ${ready ? "is-ready" : ""} ${prototypeTwo ? "prototype-two" : ""}`}>
      <a className="skip-link" href="#content">Skip to content</a>
      <div className="scroll-progress" aria-hidden="true" />
      {prototypeTwo && (
        <SplashCursor
          SIM_RESOLUTION={96}
          DYE_RESOLUTION={768}
          DENSITY_DISSIPATION={2.8}
          VELOCITY_DISSIPATION={1.8}
          PRESSURE_ITERATIONS={14}
          CURL={4}
          SPLAT_RADIUS={0.14}
          SPLAT_FORCE={4200}
          COLOR_UPDATE_SPEED={5}
          RAINBOW_MODE={false}
          COLOR="#65c29e"
        />
      )}
      {showPreloader && <div className="preloader"><AtomMark /><span><i /> INITIALISING LOCAL MEMORY</span><b /></div>}

      <header className="site-header">
        <a href="#top" aria-label="Atom home"><AtomMark /></a>
        <nav aria-label="Primary navigation">
          <a href="#experience">Experience</a><a href="#playground">Playground</a><a href="#reliability">Reliability</a>
        </nav>
        <div className="header-actions"><a href={APK_PATH} download>Android APK ↓</a><button type="button" onClick={() => setMenuOpen(true)}>Menu</button></div>
      </header>

      <div className={`menu-overlay ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <div className="menu-head"><AtomMark /><button type="button" onClick={() => setMenuOpen(false)}>Close ×</button></div>
        <nav aria-label="Mobile navigation">
          {["Experience", "Playground", "Why Atom", "Reliability", "Install", "FAQ"].map((label) => {
            const target = label.toLowerCase().replace(" ", "-");
            return <a key={label} href={`#${target}`} onClick={() => setMenuOpen(false)}><span>{label}</span><b>↘</b></a>;
          })}
        </nav>
      </div>

      <div className="phone-narrative">
        <aside className="phone-column" aria-label="Atom interface demonstration">
          <div className="phone-sticky">
            <div className="ambient-wave" aria-hidden="true">{Array.from({ length: 28 }).map((_, index) => <i key={index} style={{ "--bar": `${0.2 + (index * 17 % 75) / 100}` } as CSSProperties} />)}</div>
            <PhoneMockup screen={phoneScreen} productUI={prototypeTwo} />
            <div className="media-status"><i /> {prototypeTwo ? "BASED ON THE ANDROID BUILD" : "PRODUCT UI PROTOTYPE"} <span>{prototypeTwo ? "LIVE UI STUDY" : "REAL CAPTURE ASSET PENDING"}</span></div>
          </div>
        </aside>

        <div className="narrative-column" id="content">
          <section id="top" className="hero">
            <div className="eyebrow"><i /> VOICE-FIRST · OFFLINE-FIRST</div>
            <h1 className="text-motion-particle" aria-label="Nothing important slips through.">
              <span className="line-mask"><b>Nothing</b></span>
              <span className="line-mask"><b>important</b></span>
              <span className="line-mask accent"><b>slips through.</b></span>
              <span className="headline-particle-sparks" aria-hidden="true">
                {Array.from({ length: 28 }).map((_, index) => <i key={index} style={{
                  "--spark-x": `${4 + (index * 37) % 92}%`,
                  "--spark-y": `${6 + (index * 23) % 88}%`,
                  "--spark-dx": `${-52 + (index * 29) % 104}px`,
                  "--spark-dy": `${-38 + (index * 31) % 76}px`,
                  "--spark-delay": `${(index % 9) * 55}ms`,
                  "--spark-size": `${2 + index % 5}px`,
                } as CSSProperties} />)}
              </span>
            </h1>
            <p>Say the reminder as it comes to you. Atom understands the detail, stores it on your phone and uses Android alarms to bring it back on time.</p>
            <div className="hero-actions"><DownloadButton /><span><i /> iOS coming soon</span></div>
            <small className="apk-meta">Android APK · v0.3.0 · Version code 3 · Android 8+ · 18.3 MB</small>
          </section>

          <section id="experience" className="experience">
            <header className="section-heading" data-reveal>
              <span>THE EXPERIENCE</span><h2>One thought.<br />Three clear states.</h2>
            </header>
            {visibleExperienceSteps.map((step, index) => (
              <article key={step.index} className={`experience-step ${phoneScreen === index ? "active" : ""}`} data-step={index}>
                <div className="step-index"><span>{step.index}</span><i /></div>
                <small>{step.label}</small><h3>{step.title}</h3><p>{step.body}</p><StatePreview screen={index} productUI={prototypeTwo} />
              </article>
            ))}
          </section>
        </div>
      </div>

      <section id="playground" className="playground-section">
        <header className="section-heading light" data-reveal>
          <span>LIVE PLAYGROUND</span><h2>Write it once.<br />Watch Atom take it apart.</h2><p>This prototype parser runs entirely in your browser. Try a sentence with—or without—a time.</p>
        </header>
        <ParserPlayground />
      </section>

      <section id="why-atom" className="why-section">
        <header className="section-heading" data-reveal><span>WHY ATOM</span><h2>Quietly capable.<br />Deliberately local.</h2></header>
        <div className="why-grid">
          <article data-reveal><small>DELIVERY</small><h3>An alarm, not another feed item.</h3><p>Native Android scheduling is the product—not an afterthought.</p><b>ALARM MANAGER · EXACT WHEN ALLOWED</b></article>
          <article data-reveal><small>ACTIONS</small><h3>Change the plan in one sentence.</h3><p>Reschedule, cancel, snooze, complete or remind again.</p><div className="action-chips"><span>Reschedule</span><span>Snooze</span><span>Complete</span></div></article>
          <article data-reveal><small>PRIVACY</small><h3>The reminder stays on this device.</h3><p>No account. No reminder sync. No server-side reminder database.</p><b>LOCAL STORAGE · BACKUP DISABLED</b></article>
          <article data-reveal><small>LANGUAGE</small><h3>Plain words in. Structured intent out.</h3><p>A fast rule-based flow handles everyday reminder language without network latency.</p><b>TASK · DATE · TIME · RECURRENCE</b></article>
        </div>
      </section>

      <section id="reliability" className="reliability-section">
        <header className="reliability-head" data-reveal><span>RELIABILITY NOTES</span><h2>Why the alarm<br />actually fires.</h2><p>This is the factual part. Android gives reminder apps several ways to fail; Atom checks the important ones explicitly.</p></header>
        <div className="reliability-table" data-reveal>
          <div className="table-row"><code>SCHEDULE_EXACT_ALARM</code><strong>Precise timing</strong><p>On Android 12+, Atom asks for exact-alarm access. If it is unavailable, Atom falls back to an idle-safe but inexact alarm.</p></div>
          <div className="table-row"><code>DOZE MODE</code><strong>Idle-safe scheduling</strong><p>Atom uses <em>setExactAndAllowWhileIdle</em> when exact access is granted, so the system may wake for the reminder while idle.</p></div>
          <div className="table-row"><code>BOOT + TIME CHANGES</code><strong>Schedule reconciliation</strong><p>After reboot, app update, clock, timezone or locale changes, Atom rebuilds the alarm schedule from local reminders.</p></div>
          <div className="table-row"><code>FULL-SCREEN ALARM</code><strong>Visible when urgent</strong><p>Alarm mode can request full-screen access where Android requires it. Normal reminders still use standard notifications.</p></div>
        </div>

        <div className="reliability-split">
          <div className="oem-block" data-reveal><span>OEM BATTERY SETTINGS</span><h3>One setting worth checking.</h3><p>On Xiaomi/MIUI, Realme, Oppo, Vivo and some Samsung phones:</p><ol><li>Open Settings → Apps → Atom.</li><li>Open Battery or Battery usage.</li><li>Choose Unrestricted / Allow background activity.</li></ol><small>Menu labels vary by Android version and manufacturer.</small></div>
          <div className="permission-block" data-reveal><span>PERMISSION DISCLOSURE</span><div><strong>Microphone</strong><p>Used only when you choose voice capture.</p></div><div><strong>Notifications + alarms</strong><p>Used to deliver reminders at the scheduled time.</p></div><div><strong>Wake + boot events</strong><p>Used to fire and restore local schedules.</p></div><div className="not-requested"><strong>Not requested</strong><p>Location, contacts, photos, files or a cloud login.</p></div></div>
        </div>
      </section>

      <section id="install" className="install-section">
        <header className="section-heading" data-reveal><span>INSTALL ATOM</span><h2>Know what you’re<br />putting on your phone.</h2><p>The Android APK is small, versioned and fingerprinted so you can verify the file before installing it.</p></header>
        <div className="install-grid">
          <div className="apk-card" data-reveal><AtomMark /><div className="apk-title"><small>OFFICIAL ANDROID APK</small><strong>Atom v0.3.0</strong></div><dl><div><dt>FILE</dt><dd>atom.v3.apk</dd></div><div><dt>SIZE</dt><dd>18.3 MB</dd></div><div><dt>MINIMUM</dt><dd>Android 8.0 · API 26</dd></div><div><dt>PACKAGE</dt><dd>com.dhiren.atom</dd></div></dl><div className="checksum"><span>SHA-256</span><code>{APK_SHA}</code><button type="button" onClick={copyChecksum}>{copied ? "Copied" : "Copy"}</button></div><DownloadButton large /><a className="source-link" href="https://github.com/dhirendravsingh/atom-website" target="_blank" rel="noreferrer">View website source on GitHub ↗</a></div>
          <div className="install-steps" data-reveal><span>THREE STEPS</span><ol><li><b>01</b><div><strong>Download the Android APK</strong><p>Use the button on this page. Android may ask you to confirm the download.</p></div></li><li><b>02</b><div><strong>Allow this installation</strong><p>If prompted, permit your browser to install this one APK. You can turn the permission off again afterwards.</p></div></li><li><b>03</b><div><strong>Open Atom and review access</strong><p>Atom explains microphone, notification and exact-alarm access before it needs them.</p></div></li></ol><div className="ios-note"><i /> iOS is planned. No iOS download is offered yet.</div></div>
        </div>
      </section>

      <section id="faq" className="faq-section">
        <header data-reveal><span>FAQ</span><h2>Before you<br />install.</h2></header>
        <div className="faq-list">{faqItems.map((item, index) => <FaqItem key={item.question} index={index} {...item} />)}</div>
      </section>

      <footer><a href="#top"><AtomMark /></a><p>Voice-first reminders that stay on your Android phone.</p><a href="#top">Back to top ↑</a><small>© 2026 ATOM · ANDROID APK v0.3.0 · VERSION CODE 3</small></footer>
      {prototypeTwo && <a className="mobile-download-dock" href={APK_PATH} download><span><small>GET ATOM</small>Download Android APK</span><b>↓</b></a>}
    </main>
  );
}

export default function Home() {
  return <MarketingSite prototypeTwo />;
}
