import { useEffect, useState } from "react";
import type { Meta } from "../types";

export function PitchDeck({ meta }: { meta: Meta }) {
  const [idx, setIdx] = useState(0);
  const SLIDES = buildSlides(meta);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => Math.min(SLIDES.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [SLIDES.length]);

  return (
    <section id="view-pitch" className="view" role="tabpanel" aria-labelledby="tab-pitch">
      <div className="deck">
        <div className="slide" aria-live="polite">
          {SLIDES[idx]}
          <span className="num">
            {idx + 1} / {SLIDES.length}
          </span>
        </div>
        <div className="deck-nav">
          <button className="btn" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            Previous
          </button>
          <div className="dots">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                aria-label={`Slide ${i + 1}`}
                aria-current={i === idx}
                onClick={() => setIdx(i)}
              />
            ))}
          </div>
          <button className="btn primary" disabled={idx === SLIDES.length - 1} onClick={() => setIdx(idx + 1)}>
            Next
          </button>
        </div>
        <p className="foot-note">Use the arrow keys to move between slides.</p>
      </div>
    </section>
  );
}

function buildSlides(meta: Meta): JSX.Element[] {
  return [
    <div key="title">
      <div className="eyebrow">NASA Space Apps Challenge 2026 · Astronaut health</div>
      <div className="big">SPECC</div>
      <h2 style={{ fontSize: "clamp(18px,2.2vw,26px)", color: "var(--muted)" }}>
        Spatial Predictive Environmental Computing Companion
      </h2>
      <p className="lead">
        Your space buddy on board. A companion robot, station sensors and a predictive brain that warn astronauts
        before health problems start.
      </p>
      <div style={{ marginTop: "auto", display: "flex", gap: 12, flexWrap: "wrap" }}>
        {["Space radiation", "Altered gravity", "Immune changes"].map((t) => (
          <span key={t} className="tag nasa" style={{ fontSize: 12, padding: "4px 10px" }}>
            {t}
          </span>
        ))}
      </div>
    </div>,

    <div key="problem">
      <div className="eyebrow">The problem</div>
      <h2>Space damages health slowly and silently.</h2>
      <div className="cols">
        <div className="card">
          <h3>Radiation</h3>
          <p>Raises lifetime cancer risk and can harm the eyes, heart and nervous system. NASA caps a career at 600 mSv.</p>
        </div>
        <div className="card">
          <h3>Altered gravity</h3>
          <p>Bone thins by 1 to 1.5% a month without countermeasures. Fitness and muscle fall too.</p>
        </div>
        <div className="card">
          <h3>Immune changes</h3>
          <p>61% of ISS astronauts shed at least one dormant herpesvirus during flight.</p>
        </div>
      </div>
      <p className="lead">
        Astronauts usually notice only once symptoms appear. On a Mars mission, Earth is too far away to step in
        quickly.
      </p>
    </div>,

    <div key="who">
      <div className="eyebrow">Who it's for and what they need</div>
      <h2>Astronauts who must check their own health.</h2>
      <div className="cols">
        <div className="card">
          <h3>Astronauts</h3>
          <p>On long missions to the Moon or Mars, carrying responsibility for spotting changes in themselves.</p>
        </div>
        <div className="card">
          <h3>Flight surgeons</h3>
          <p>Supporting the crew from the ground with communication delays.</p>
        </div>
      </div>
      <ul className="plain">
        <li>See their personal risk <b>before</b> symptoms start.</li>
        <li>Understand what it means in plain words.</li>
        <li>Know exactly what to do to prevent it.</li>
      </ul>
    </div>,

    <div key="idea">
      <div className="eyebrow">The idea</div>
      <h2>A stall horn for astronaut health.</h2>
      <p className="lead">
        A plane's stall horn warns the pilot before the wing stalls, while there's still time to recover. SPECC
        projects each indicator forward and sounds before a NASA limit is crossed.
      </p>
      <div className="stages">
        <div className="stage ok">
          <b>Green</b>
          <p>Projection stays inside NASA limits to landing. Keep going.</p>
        </div>
        <div className="stage watch">
          <b>Yellow: horn</b>
          <p>Projection crosses a limit before landing. Here's the prevention plan.</p>
        </div>
        <div className="stage act">
          <b>Red</b>
          <p>Limit crossed or symptoms present. Health advice and who to tell.</p>
        </div>
      </div>
    </div>,

    <div key="how">
      <div className="eyebrow">How it works</div>
      <h2>Sensors watch the station. SPECC looks after the person.</h2>
      <div className="arch">
        <div className="card">
          <h3>Station sensors</h3>
          <p>Always on: module radiation and storm alerts, CO2, sleep station, exercise log.</p>
        </div>
        <div className="card">
          <h3>SPECC robot</h3>
          <p>Comes to you: personal dosimeter, vitals, saliva swab, guided ultrasound, voice check-ins.</p>
        </div>
        <div className="card">
          <h3>SPECC brain</h3>
          <p>On the station computer. Combines exposure and response, projects to landing, writes the plan.</p>
        </div>
        <div className="card">
          <h3>Dashboard</h3>
          <p>Any screen. Colour-coded status, future-you chart and the plan.</p>
        </div>
      </div>
      <p className="lead">The brain lives on the station, so nothing is lost if the robot is charging.</p>
    </div>,

    <div key="robot">
      <div className="eyebrow">What the robot does</div>
      <h2>Things a wall sensor can't.</h2>
      <div className="cols">
        <div className="card">
          <h3>Close-up checks</h3>
          <p>Blood pressure, temperature, saliva swab, guided ultrasound. It holds, positions and coaches.</p>
        </div>
        <div className="card">
          <h3>Radiation shadow</h3>
          <p>Carries a dosimeter that follows the astronaut, giving a personal dose.</p>
        </div>
        <div className="card">
          <h3>Countermeasure coach</h3>
          <p>Finds you, prompts exercise, counts reps, guides you to the shelter in a storm.</p>
        </div>
        <div className="card">
          <h3>Companion</h3>
          <p>Daily voice check-in for mood and sleep. Isolation is one of NASA's five hazards.</p>
        </div>
      </div>
    </div>,

    <div key="personal">
      <div className="eyebrow">Personalised like a BAC level</div>
      <h2>Same exposure, different you.</h2>
      <p className="lead">
        Two drinks give two people different blood alcohol. SPECC starts from NASA's average rate, adjusts for your
        body, then learns your own response after 14 days.
      </p>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Factor</th>
              <th>Maya</th>
              <th>Sam</th>
              <th>Why it matters</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vitamin D</td>
              <td>31 ng/ml</td>
              <td>48 ng/ml</td>
              <td>Below NASA's 35 range raises bone and immune risk</td>
            </tr>
            <tr>
              <td>Pre-flight VO2max</td>
              <td>35</td>
              <td>40</td>
              <td>Margin above NASA's 32.9 spacewalk floor</td>
            </tr>
            <tr>
              <td>Fainting after landing</td>
              <td>80%</td>
              <td>20%</td>
              <td>NASA tilt-test rates by sex (small sample)</td>
            </tr>
            <tr>
              <td>Dormant viruses carried</td>
              <td>EBV, VZV</td>
              <td>EBV</td>
              <td>A virus you don't carry can't reactivate</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="lead">In the demo, the same solar storm sounds Maya's immune horn but not Sam's.</p>
    </div>,

    <div key="sources">
      <div className="eyebrow">Grounded in NASA sources</div>
      <h2>Every threshold says where it came from.</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Red line</th>
              <th>Label</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Career radiation dose</td>
              <td>600 mSv</td>
              <td><span className="tag nasa">NASA</span></td>
              <td>OCHMO-TB-020, V1 4030</td>
            </tr>
            <tr>
              <td>Blood-forming organ dose, 30 days</td>
              <td>250 mGy-Eq</td>
              <td><span className="tag nasa">NASA</span></td>
              <td>NASA HRP radiation brief</td>
            </tr>
            <tr>
              <td>Hip and spine bone density</td>
              <td>95% of pre-flight</td>
              <td><span className="tag nasa">NASA</span></td>
              <td>OCHMO-MTB-013, V1 4027</td>
            </tr>
            <tr>
              <td>VO2max</td>
              <td>80% and 32.9 ml/kg/min for spacewalks</td>
              <td><span className="tag nasa">NASA</span></td>
              <td>OCHMO-TB-031, V1 4003</td>
            </tr>
            <tr>
              <td>Muscle strength</td>
              <td>80% of pre-flight</td>
              <td><span className="tag nasa">NASA</span></td>
              <td>OCHMO-TB-031, V1 4024</td>
            </tr>
            <tr>
              <td>Cabin CO2</td>
              <td>3 mmHg (1 h), 2.5 (7 days)</td>
              <td><span className="tag nasa">NASA</span></td>
              <td>OCHMO-TB-004, V2 6004</td>
            </tr>
            <tr>
              <td>Sleep</td>
              <td>7 to 9 h recommended</td>
              <td><span className="tag nasa">NASA</span></td>
              <td>Sleep Accommodations brief</td>
            </tr>
            <tr>
              <td>Immune risk factors</td>
              <td>2 or more at once</td>
              <td><span className="tag">TEAM</span></td>
              <td>Built on Makedonas 2019, Rooney 2019</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>,

    <div key="features">
      <div className="eyebrow">Features</div>
      <h2>What the astronaut sees.</h2>
      <div className="cols">
        <div className="card">
          <h3>Colour-coded dashboard</h3>
          <p>OK, Watch and Act now, by hazard, with the NASA or team label on every line.</p>
        </div>
        <div className="card">
          <h3>Future you</h3>
          <p>Chart of each indicator projected to landing, with and without the plan.</p>
        </div>
        <div className="card">
          <h3>Prevention plans</h3>
          <p>Plain-language steps and who to involve: you, a crewmate or the flight surgeon.</p>
        </div>
        <div className="card">
          <h3>Robot check-ups</h3>
          <p>Scheduled or triggered visits, chosen by what the brain predicts.</p>
        </div>
        <div className="card">
          <h3>Body status map</h3>
          <p>A full-body view that marks each area with its status, warning and health summary.</p>
        </div>
        <div className="card">
          <h3>Mission scenarios</h3>
          <p>Solar storms, CO2 spikes, vision changes, rashes, isolation, spacewalk and landing prep.</p>
        </div>
      </div>
    </div>,

    <div key="demo">
      <div className="eyebrow">Demo and success</div>
      <h2>Watch the horn fire before the limit.</h2>
      <ul className="plain">
        <li>Run a scenario: a solar storm, skipped workouts, or poor sleep with high CO2.</li>
        <li>Station sensors and the robot send readings to the brain.</li>
        <li>The dashboard turns yellow and shows the prevention plan, before any NASA limit is crossed.</li>
        <li>Follow the plan and the projection returns to green.</li>
      </ul>
      <p className="lead">
        <b style={{ color: "var(--fg)" }}>Success:</b> every warning fires early, and every warning traces back to a
        NASA source.
      </p>
    </div>,

    <div key="refs">
      <div className="eyebrow">Sources</div>
      <h2>NASA references</h2>
      <div className="tablewrap">
        <table>
          <tbody>
            {Object.entries(meta.sources).map(([k, v]) => (
              <tr key={k}>
                <td className="mono" style={{ whiteSpace: "nowrap" }}>{k}</td>
                <td>
                  <a href={v[1]} target="_blank" rel="noopener">
                    {v[0]}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lead" style={{ fontSize: 13 }}>
        All crew data in the demo is simulated. Bands marked TEAM are our own rules built on the cited NASA findings.
      </p>
    </div>,
  ];
}