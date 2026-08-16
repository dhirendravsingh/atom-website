"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import AtomUniverse from "@/components/AtomUniverse";
import InteractiveAtom from "@/components/InteractiveAtom";

const APK_PATH = "/atom.v3.apk";

const commands = [
  {
    prompt: "Remind me to send the product brief to Aisha at 6:30 tonight.",
    title: "Send product brief to Aisha",
    when: "Today · 6:30 PM",
    meta: "One-time reminder",
  },
  {
    prompt: "Move my dentist reminder to Friday morning.",
    title: "Dentist appointment",
    when: "Friday · 9:00 AM",
    meta: "Rescheduled by voice",
  },
  {
    prompt: "Every Sunday at 7, remind me to call Mum.",
    title: "Call Mum",
    when: "Sundays · 7:00 PM",
    meta: "Repeats weekly",
  },
];

const story = [
  {
    index: "01",
    label: "Capture",
    title: "Say it the way you think it.",
    body: "No forms. No tiny date pickers. Tell Atom what matters in plain language and it pulls the task, date, time and recurrence into place.",
    foot: "Voice + natural language",
  },
  {
    index: "02",
    label: "Understand",
    title: "Details stay precise.",
    body: "If a date or time is missing, Atom asks. It never quietly invents the detail that decides when your reminder should ring.",
    foot: "Clear before it commits",
  },
  {
    index: "03",
    label: "Deliver",
    title: "When it matters, Atom shows up.",
    body: "Android alarms and notifications are designed for reliable delivery, with snooze, complete and remind-again actions ready when you need them.",
    foot: "Built around Android alarms",
  },
];

type CssVars = CSSProperties & Record<`--${string}`, string | number>;

function AtomMark({ word = true }: { word?: boolean }) {
  return (
    <span className="brand-lockup">
      <span className="brand-icon">
        <Image src="/atom-icon.svg" alt="" width={64} height={64} priority />
      </span>
      {word && <span className="brand-word">atom</span>}
    </span>
  );
}

function AtomField() {
  const particles = useMemo(() => {
    const dots: Array<{ x: number; y: number; size: number; delay: number; ring: number }> = [];

    for (let ring = 0; ring < 3; ring += 1) {
      for (let i = 0; i < 46; i += 1) {
        const angle = (i / 46) * Math.PI * 2;
        const rx = 31;
        const ry = 12;
        const baseX = Math.cos(angle) * rx;
        const baseY = Math.sin(angle) * ry;
        const rotation = ring * (Math.PI / 3);
        const x = baseX * Math.cos(rotation) - baseY * Math.sin(rotation);
        const y = baseX * Math.sin(rotation) + baseY * Math.cos(rotation);
        const pulse = Math.sin(i * 2.21 + ring) * 1.6;
        dots.push({
          x: x + pulse,
          y: y + Math.cos(i * 1.37) * 1.2,
          size: 1 + ((i * 7 + ring * 3) % 4) * 0.55,
          delay: -((i * 0.11 + ring * 0.7) % 4),
          ring,
        });
      }
    }

    return dots;
  }, []);

  return (
    <div className="atom-field" aria-hidden="true">
      <div className="field-aura" />
      <div className="field-core" />
      {particles.map((dot, index) => (
        <span
          className={`field-particle particle-${dot.ring}`}
          key={`${dot.ring}-${index}`}
          style={
            {
              "--x": `${dot.x.toFixed(4)}%`,
              "--y": `${dot.y.toFixed(4)}%`,
              "--size": `${dot.size.toFixed(2)}px`,
              "--delay": `${dot.delay.toFixed(2)}s`,
            } as CssVars
          }
        />
      ))}
    </div>
  );
}

function MicGlyph() {
  return (
    <span className="mic-glyph" aria-hidden="true">
      <i />
    </span>
  );
}

function PhoneMockup({ screen = 0, hero = false }: { screen?: number; hero?: boolean }) {
  const active = Math.max(0, Math.min(screen, 2));

  return (
    <div className={`phone-wrap ${hero ? "phone-hero" : ""}`} aria-hidden="true">
      <div className="phone-glow" />
      <div className="phone-shell">
        <div className="phone-notch" />
        <div className="phone-status">
          <span>9:41</span>
          <span className="status-icons">••• ◐ ▰</span>
        </div>
        <div className={`phone-screen screen-${active}`}>
          <header className="app-topbar">
            <AtomMark />
            <span className="avatar">D</span>
          </header>

          <div className="app-panels">
            <section className="app-panel home-panel">
              <div className="app-date">TUESDAY, 11 AUGUST</div>
              <h3>
                Good afternoon,<br />
                <em>Dhiren.</em>
              </h3>
              <p>You have 4 things worth remembering.</p>
              <div className="quick-card">
                <small>QUICK CAPTURE</small>
                <strong>What should I remember?</strong>
                <div className="quick-input">
                  <span>Tell Atom what to remember…</span>
                  <b><MicGlyph /></b>
                </div>
              </div>
              <div className="next-label"><span /> NEXT UP</div>
              <div className="reminder-card">
                <i />
                <div>
                  <small>◷ TODAY · JUL 28</small>
                  <strong>Send product brief to Aisha</strong>
                  <span>6:30 PM</span>
                </div>
                <b>›</b>
              </div>
            </section>

            <section className="app-panel listen-panel">
              <div className="listen-meta">LISTENING · ON DEVICE</div>
              <div className="voice-orb">
                <span /><span /><span /><MicGlyph />
              </div>
              <div className="heard-copy">“Move my dentist reminder<br />to Friday morning.”</div>
              <div className="understood-card">
                <small>ATOM UNDERSTOOD</small>
                <strong>Dentist appointment</strong>
                <div><span>FRIDAY</span><span>9:00 AM</span></div>
              </div>
              <div className="confirm-pill">Ready to reschedule</div>
            </section>

            <section className="app-panel alarm-panel">
              <div className="alarm-rings"><span /><span /><span /></div>
              <div className="alarm-time">6:30</div>
              <div className="alarm-meridiem">PM · TODAY</div>
              <h3>Send product brief<br />to Aisha</h3>
              <div className="alarm-actions">
                <span>Snooze</span>
                <strong>Complete</strong>
                <span>Again</span>
              </div>
              <div className="delivery-note">Delivered by Android alarm</div>
            </section>
          </div>

          <nav className="app-nav">
            <span className="active">⌂<small>Today</small></span>
            <span>☷<small>Reminders</small></span>
            <b>+</b>
            <span>⚙<small>Settings</small></span>
          </nav>
        </div>
      </div>
    </div>
  );
}

function DownloadButton({ className = "" }: { className?: string }) {
  const buttonRef = useRef<HTMLAnchorElement>(null);

  const move = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    const button = buttonRef.current;
    if (!button || window.matchMedia("(pointer: coarse)").matches) return;
    const bounds = button.getBoundingClientRect();
    button.style.setProperty("--mag-x", `${(event.clientX - bounds.left - bounds.width / 2) * 0.16}px`);
    button.style.setProperty("--mag-y", `${(event.clientY - bounds.top - bounds.height / 2) * 0.2}px`);
  };

  const reset = () => {
    buttonRef.current?.style.setProperty("--mag-x", "0px");
    buttonRef.current?.style.setProperty("--mag-y", "0px");
  };

  return (
    <a ref={buttonRef} className={`download-button ${className}`} href={APK_PATH} download onPointerMove={move} onPointerLeave={reset}>
      <span>Download Android APK</span>
      <b aria-hidden="true">↓</b>
    </a>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeStory, setActiveStory] = useState(0);
  const [commandIndex, setCommandIndex] = useState(0);
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => setLoaded(true), 1200);
    const root = pageRef.current;

    const onPointerMove = (event: PointerEvent) => {
      if (!root) return;
      root.style.setProperty("--tilt-x", `${(event.clientX / window.innerWidth - 0.5) * 10}deg`);
      root.style.setProperty("--tilt-y", `${(event.clientY / window.innerHeight - 0.5) * -7}deg`);
    };

    const onScroll = () => {
      if (!root) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      root.style.setProperty("--page-progress", `${max > 0 ? window.scrollY / max : 0}`);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveStory(Number((visible.target as HTMLElement).dataset.story || 0));
      },
      { rootMargin: "-25% 0px -25% 0px", threshold: [0.2, 0.5, 0.75] },
    );

    document.querySelectorAll<HTMLElement>("[data-story]").forEach((item) => observer.observe(item));

    return () => {
      window.clearTimeout(loadTimer);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const activeCommand = commands[commandIndex];

  const tiltCard = (event: ReactPointerEvent<HTMLElement>) => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    card.style.setProperty("--card-rx", `${y * -5}deg`);
    card.style.setProperty("--card-ry", `${x * 6}deg`);
  };

  const resetCard = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--card-rx", "0deg");
    event.currentTarget.style.setProperty("--card-ry", "0deg");
  };

  return (
    <main ref={pageRef} className={`site ${loaded ? "is-loaded" : "is-loading"}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="grain" aria-hidden="true" />
      <div className="progress-line" aria-hidden="true" />

      <div className="intro" aria-hidden={loaded}>
        <AtomMark />
        <div className="intro-status"><span /> Initialising local memory</div>
        <div className="intro-line"><i /></div>
        <div className="intro-coordinates"><span>MATTER / 0001</span><span>ATOM OS · LOCAL</span></div>
      </div>

      <header className="site-header">
        <a className="header-brand" href="#top" aria-label="Atom home"><AtomMark /></a>
        <div className="header-status"><i /> ANDROID · OFFLINE READY</div>
        <div className="header-actions">
          <a className="header-download" href={APK_PATH} download>Download Android APK <span>↓</span></a>
          <button className="menu-toggle" type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="site-menu">
            <span>Menu</span><i /><i />
          </button>
        </div>
      </header>

      <div id="site-menu" className={`menu-overlay ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="menu-head"><AtomMark /><button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">Close ×</button></div>
        <nav aria-label="Main navigation">
          {[
            ["01", "Experience", "#experience"],
            ["02", "How it works", "#how-it-works"],
            ["03", "Privacy", "#privacy"],
            ["04", "Get Atom", "#download"],
          ].map(([number, label, href]) => (
            <a href={href} key={href} onClick={() => setMenuOpen(false)}><small>{`//${number}`}</small><span>{label}</span><b>↘</b></a>
          ))}
        </nav>
        <div className="menu-foot"><span>Personal reminder intelligence</span><span>Android now · iOS coming soon</span></div>
      </div>

      <section id="top" className="hero" aria-labelledby="hero-title">
        <div className="hero-orbit orbit-one" aria-hidden="true" />
        <div className="hero-orbit orbit-two" aria-hidden="true" />
        <div className="hero-copy" id="main-content">
          <div className="eyebrow"><i /> PERSONAL REMINDER INTELLIGENCE</div>
          <h1 id="hero-title" aria-label="Nothing important slips through.">
            <span>Nothing</span><span>important</span><span className="accent-line">slips through.</span>
          </h1>
          <p>Speak naturally. Atom captures the detail, keeps it on your phone, and brings it back at exactly the right moment.</p>
          <div className="hero-cta-row"><DownloadButton /><span className="ios-status"><i /> iOS coming soon</span></div>
          <div className="apk-meta">Android APK · v0.3.0 · Android 8+ · 18.3 MB</div>
        </div>

        <div className="hero-visual">
          <AtomUniverse />
          <PhoneMockup hero />
          <div className="floating-note note-local"><i /> Stored locally<br /><span>Not in a cloud account</span></div>
          <div className="floating-note note-voice"><strong>“Remind me…”</strong><span>Natural language ready</span></div>
          <div className="webgl-label"><i /> LIVE MATTER FIELD <span>MOVE TO DISTURB</span></div>
        </div>

        <div className="hero-meta meta-left"><span>VOICE FIRST · PRIVATE BY DESIGN</span><b>ASIA / CALCUTTA · DETECTED</b></div>
        <div className="hero-meta meta-right"><span>SCROLL TO FOLLOW THE THOUGHT</span><b>01 / 05</b></div>
      </section>

      <section className="statement" aria-label="Atom promise">
        <div className="statement-top"><span>{"// THE PROMISE"}</span><span>CAPTURE → UNDERSTAND → DELIVER</span></div>
        <p><span>Say it once.</span> <em>Atom remembers.</em></p>
        <InteractiveAtom />
      </section>

      <section id="experience" className="experience-section">
        <header className="section-intro">
          <div><span>{"// 01"}</span><span>THE EXPERIENCE</span></div>
          <h2>From a passing thought<br />to a reliable reminder.</h2>
          <p>One calm flow, designed around how you already speak.</p>
        </header>

        <div className="story-layout">
          <div className="story-device"><AtomField /><PhoneMockup screen={activeStory} /><div className="story-index">0{activeStory + 1} / 03</div></div>
          <div className="story-copy">
            {story.map((item, index) => (
              <article className={`story-card ${activeStory === index ? "is-active" : ""}`} data-story={index} key={item.index}>
                <div className="story-rule"><span>{item.index}</span><i /></div>
                <div className="eyebrow"><i /> {item.label}</div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <small>{item.foot} <b>↘</b></small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="command-lab">
        <div className="lab-grid" aria-hidden="true" />
        <header>
          <div className="eyebrow"><i /> TRY THE THOUGHT ENGINE</div>
          <h2>Talk to Atom<br /><em>like a person.</em></h2>
          <p>Tap a phrase. Watch Atom separate intent from timing without sending your reminder away.</p>
        </header>

        <div className="lab-stage">
          <div className="command-list" role="group" aria-label="Example reminder commands">
            {commands.map((command, index) => (
              <button className={commandIndex === index ? "active" : ""} key={command.prompt} type="button" onClick={() => setCommandIndex(index)}>
                <small>0{index + 1}</small><span>{command.prompt}</span><b>↗</b>
              </button>
            ))}
          </div>

          <div className="parse-card motion-card" key={activeCommand.prompt} onPointerMove={tiltCard} onPointerLeave={resetCard}>
            <div className="parse-head"><span><i /> PROCESSING LOCALLY</span><b>ATOM / NLP</b></div>
            <div className="waveform" aria-hidden="true">{Array.from({ length: 34 }).map((_, index) => <i key={index} style={{ "--bar": `${18 + ((index * 17) % 60)}%` } as CssVars} />)}</div>
            <blockquote>“{activeCommand.prompt}”</blockquote>
            <div className="parse-result">
              <small>ATOM UNDERSTOOD</small>
              <h3>{activeCommand.title}</h3>
              <div><span>{activeCommand.when}</span><span>{activeCommand.meta}</span></div>
            </div>
            <div className="parse-foot"><span>Intent</span><i /><span>Time</span><i /><span>Ready</span><b>✓</b></div>
          </div>
        </div>
      </section>

      <section className="memory-tunnel" aria-label="How Atom carries a reminder from thought to alarm">
        <div className="tunnel-sticky">
          <div className="tunnel-copy">
            <div className="eyebrow"><i /> FROM THOUGHT TO SIGNAL</div>
            <h2>One sentence.<br /><em>Three precise states.</em></h2>
            <p>The experience changes shape as Atom understands, stores and delivers the moment.</p>
          </div>
          <div className="tunnel-scene" aria-hidden="true">
            <div className="tunnel-rings">{Array.from({ length: 8 }).map((_, index) => <i key={index} style={{ "--ring-index": index } as CssVars} />)}</div>
            <div className="tunnel-core"><span /><b /></div>
            <div className="memory-packet packet-one"><small>01</small><strong>VOICE</strong><span>Captured locally</span></div>
            <div className="memory-packet packet-two"><small>02</small><strong>INTENT</strong><span>Time understood</span></div>
            <div className="memory-packet packet-three"><small>03</small><strong>ALARM</strong><span>Android delivers</span></div>
          </div>
        </div>
      </section>

      <section className="reliability-section">
        <header className="section-intro compact-intro">
          <div><span>{"// 02"}</span><span>WHY ATOM</span></div>
          <h2>Quietly capable.<br />Seriously dependable.</h2>
        </header>

        <div className="bento-grid">
          <article className="bento-card bento-wide reliable-card motion-card" onPointerMove={tiltCard} onPointerLeave={resetCard}>
            <div className="card-number">01 / DELIVERY</div>
            <h3>Not just a notification.<br /><em>A reminder that rings.</em></h3>
            <p>Atom is built around Android alarms and notifications so important moments do not disappear into an endless feed.</p>
            <div className="delivery-viz" aria-hidden="true"><span>CAPTURE</span><i /><span>SCHEDULE</span><i /><span>RING</span><b>✓</b></div>
          </article>

          <article className="bento-card action-card motion-card" onPointerMove={tiltCard} onPointerLeave={resetCard}>
            <div className="card-number">02 / ACTIONS</div>
            <h3>Change the plan<br />without opening a form.</h3>
            <div className="action-stack"><span>Reschedule ↗</span><span>Snooze +10m</span><span>Remind again</span><span>Complete ✓</span></div>
          </article>

          <article id="privacy" className="bento-card privacy-card motion-card" onPointerMove={tiltCard} onPointerLeave={resetCard}>
            <div className="card-number">03 / PRIVACY</div>
            <div className="privacy-score"><strong>100</strong><span>%<br />LOCAL</span></div>
            <h3>Your reminders stay<br />on your phone.</h3>
            <p>Offline-first by design. Your personal reminder list does not need a cloud account to exist.</p>
            <div className="local-chip"><i /> LOCAL MEMORY ACTIVE</div>
          </article>

          <article className="bento-card bento-wide language-card motion-card" onPointerMove={tiltCard} onPointerLeave={resetCard}>
            <div className="card-number">04 / LANGUAGE</div>
            <div className="kinetic-copy" aria-label="Create. Reschedule. Cancel. Snooze. Complete.">
              <span>Create.</span><span>Reschedule.</span><span>Cancel.</span><span>Snooze.</span><span>Complete.</span>
            </div>
            <p>One natural-language layer across the whole reminder lifecycle.</p>
          </article>
        </div>
      </section>

      <section className="privacy-manifesto">
        <div className="manifesto-orb" aria-hidden="true"><AtomField /></div>
        <div className="manifesto-meta"><span>{"// 03 · OFFLINE FIRST"}</span><span>NO ACCOUNT REQUIRED</span></div>
        <h2>Your reminders.<br /><em>Your phone.</em></h2>
        <p>Atom’s job is to remember for you—not to turn your life into someone else’s dataset.</p>
        <div className="privacy-points"><span><i /> Stored locally</span><span><i /> Works offline</span><span><i /> No cloud account</span></div>
      </section>

      <section className="faq-section">
        <div className="faq-heading"><span>{"// 04 · THE DETAILS"}</span><h2>Before you<br />install.</h2></div>
        <div className="faq-list">
          <details><summary><span>01</span> What can I say to Atom?<b>+</b></summary><p>Create, reschedule, cancel, snooze, complete and repeat reminders in natural language. If a critical detail is missing, Atom asks instead of guessing.</p></details>
          <details><summary><span>02</span> Does Atom need the internet?<b>+</b></summary><p>Your reminders are stored locally and the experience is designed offline-first. Android handles the alarms and notifications used for delivery.</p></details>
          <details><summary><span>03</span> Which devices are supported?<b>+</b></summary><p>The current Android APK supports Android 8.0 and later. An iOS version is planned and will be offered when it is genuinely ready.</p></details>
          <details><summary><span>04</span> Is the Android APK the official download?<b>+</b></summary><p>Yes. Every download on this site points to Atom’s current official Android APK, version 0.3.0.</p></details>
        </div>
      </section>

      <section id="download" className="download-section">
        <div className="download-rings" aria-hidden="true"><i /><i /><i /><b /></div>
        <div className="download-meta"><span>{"// 05 · GET ATOM"}</span><span>ANDROID · VERSION 0.1.0</span></div>
        <h2>Make space<br />in your head.</h2>
        <p>Let Atom hold the detail until you need it.</p>
        <div className="download-actions"><DownloadButton className="large" /><span className="ios-card"><b>iOS</b><i /> Coming soon</span></div>
        <div className="apk-meta center">Android APK · v0.3.0 · Android 8+ · 18.3 MB</div>
      </section>

      <footer>
        <a href="#top" aria-label="Back to top"><AtomMark /></a>
        <div><span>Private reminder intelligence.</span><span>Voice-first. Offline-first. Android-first.</span></div>
        <a href="#top">Back to top ↑</a>
        <small>© 2026 ATOM · BUILT TO REMEMBER</small>
      </footer>
    </main>
  );
}
