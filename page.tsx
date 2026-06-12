export default function Home() {
  const steps = Array.from({ length: 16 }, (_, i) => [0, 3, 6, 10, 13].includes(i));

  return (
    <main className="app-shell">
      <header className="header">
        <div>
          <div className="tagline">Riff sketchpad for modern metal guitarists</div>
          <div className="logo">CHUG<br />GRID</div>
        </div>
        <button>PRESETS</button>
      </header>

      <section className="grid">
        <div className="panel orbit">
          <div className="ring">
            <div className="hand pulse" />
            <div className="hand riff" />
            <div className="center">
              <div>
                <b>BAR 1/9</b>
                <span>riff 18/16 · realigns after 9 bars</span>
              </div>
            </div>
          </div>
        </div>

        <aside className="panel controls">
          <div>
            <div className="card-title">Transport</div>
            <div className="row">
              <button>PLAY</button>
              <button>STEP</button>
              <button>STOP</button>
              <button>TAP</button>
            </div>
          </div>

          <div>
            <div className="card-title">Target Realign</div>
            <div className="row">
              <button>6 BARS</button>
              <button>GENERATE RIFF</button>
            </div>
          </div>

          <div>
            <div className="card-title">Dice Riff</div>
            <div className="row">
              <button>🎲 ROLL</button>
              <button>APPLY</button>
            </div>
          </div>
        </aside>
      </section>

      <section className="panel" style={{ marginTop: 22 }}>
        <div className="card-title">16th Grid</div>
        <div className="gridline">
          {steps.map((on, i) => <div key={i} className={`step ${on ? "on" : ""}`} />)}
        </div>
      </section>
    </main>
  );
}
