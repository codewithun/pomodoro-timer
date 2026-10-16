
import { useEffect, useRef, useState } from "react";
import "./App.css";

const DEFAULTS = { work: 25, short: 5, long: 15 };
const LABELS = {
  work: "Focus Time",
  short: "Short Break",
  long: "Long Break",
};

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("pomo-settings")) };
  } catch {
    return DEFAULTS;
  }
}

function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [session, setSession] = useState("work");
  const [seconds, setSeconds] = useState(settings.work * 60);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(() => {
    return Number(localStorage.getItem("pomo-completed") || 0);
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(settings);
  const endAt = useRef(null);

  useEffect(() => {
    localStorage.setItem("pomo-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("pomo-completed", String(completed));
  }, [completed]);

  useEffect(() => {
    if (!running) return;

    endAt.current = Date.now() + seconds * 1000;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((endAt.current - Date.now()) / 1000)
      );

      setSeconds(remaining);

      if (remaining === 0) {
        setRunning(false);
        playNotification();

        if (session === "work") {
          setCompleted((count) => count + 1);
          setSession((current) => {
            const next = (completed + 1) % 4 === 0 ? "long" : "short";
            return next;
          });
          setSeconds(
            ((completed + 1) % 4 === 0 ? settings.long : settings.short) * 60
          );
        } else {
          setSession("work");
          setSeconds(settings.work * 60);
        }
      }
    };

    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [running, session, settings, completed]);

  function playNotification() {
    try {
      const audio = new AudioContext();
      [660, 880, 660].forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.15, audio.currentTime + index * 0.22);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audio.currentTime + index * 0.22 + 0.18
        );
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(audio.currentTime + index * 0.22);
        oscillator.stop(audio.currentTime + index * 0.22 + 0.2);
      });
      setTimeout(() => audio.close(), 1200);
    } catch {
      console.info("Audio notification is unavailable.");
    }
  }

  function chooseSession(type) {
    setRunning(false);
    setSession(type);
    setSeconds(settings[type] * 60);
  }

  function resetTimer() {
    setRunning(false);
    setSeconds(settings[session] * 60);
  }

  function saveSettings() {
    const next = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [
        key,
        Math.min(180, Math.max(1, Number(value) || DEFAULTS[key])),
      ])
    );
    setRunning(false);
    setSettings(next);
    setSeconds(next[session] * 60);
    setSettingsOpen(false);
  }

  const total = settings[session] * 60;
  const progress = total ? (total - seconds) / total : 0;
  const minutesText = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secondsText = String(seconds % 60).padStart(2, "0");

  return (
    <main className={`app theme-${session}`}>
      <header className="topbar">
        <a className="brand" href="#" aria-label="Focusly home">
          <span className="brand-icon">◷</span> focusly
        </a>
        <button
          className="icon-button"
          onClick={() => {
            setDraft(settings);
            setSettingsOpen(true);
          }}
          aria-label="Open timer settings"
          title="Settings"
        >
          ⚙
        </button>
      </header>

      <section className="workspace">
        <div className="eyebrow"><span /> YOUR SPACE TO FOCUS</div>
        <h1>Make time for <em>what matters.</em></h1>
        <p className="subtitle">
          One thing at a time. You’ve got this.
        </p>

        <section className="timer-card" aria-label="Pomodoro timer">
          <div className="session-tabs" role="group" aria-label="Select session">
            {Object.entries(LABELS).map(([key, label]) => (
              <button
                key={key}
                className={session === key ? "session-tab active" : "session-tab"}
                onClick={() => chooseSession(key)}
                aria-pressed={session === key}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="timer-ring" style={{ "--progress": `${progress * 100}%` }}>
            <div className="timer-inner">
              <span className="timer-label">{LABELS[session]}</span>
              <div className="time" role="timer" aria-live="off">
                {minutesText}:{secondsText}
              </div>
              <span className="timer-hint">
                {running ? "Stay in the flow" : "Ready when you are"}
              </span>
            </div>
          </div>

          <div className="timer-actions">
            <button
              className="primary-button"
              onClick={() => setRunning((value) => !value)}
            >
              {running ? "Ⅱ  Pause" : seconds < total ? "▶  Resume" : "▶  Start focus"}
            </button>
            <button className="reset-button" onClick={resetTimer} aria-label="Reset timer">
              ↺
            </button>
          </div>

          <div className="session-note">
            <span>✦</span> {session === "work"
              ? "Small steps lead to big things."
              : "Rest is part of the process."}
          </div>
        </section>

        <section className="stats" aria-label="Session progress">
          <article className="stat-card">
            <div className="stat-icon">✓</div>
            <div><strong>{completed}</strong><span>Sessions completed</span></div>
          </article>
          <article className="stat-card">
            <div className="stat-icon">◎</div>
            <div><strong>{completed % 4}/4</strong><span>Until long break</span></div>
          </article>
          <article className="stat-card">
            <div className="stat-icon">◷</div>
            <div><strong>{Math.floor(completed * settings.work / 60)}h {completed * settings.work % 60}m</strong><span>Focus time</span></div>
          </article>
        </section>
      </section>

      <footer>Made for a calmer, more focused day <span>✳</span></footer>

      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <section
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2 id="settings-title">Timer settings</h2>
                <p>Make your focus routine your own.</p>
              </div>
              <button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button>
            </div>
            {Object.entries(LABELS).map(([key, label]) => (
              <label className="setting-row" key={key}>
                <span>{label}</span>
                <span className="number-input">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={draft[key]}
                    onChange={(event) => setDraft({
                      ...draft,
                      [key]: event.target.value,
                    })}
                    aria-label={`${label} duration in minutes`}
                  />
                  <span>min</span>
                </span>
              </label>
            ))}
            <p className="settings-tip">Long break follows every 4 completed work sessions.</p>
            <button className="primary-button save-button" onClick={saveSettings}>Save changes</button>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
