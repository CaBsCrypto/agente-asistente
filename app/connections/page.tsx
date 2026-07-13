"use client";

import { useMemo, useState } from "react";
import { connections, type ConnectionStage } from "./data";

const stages: ConnectionStage[] = [
  "Connected",
  "Testing prep",
  "MCP found",
  "Partner outreach",
  "Research",
];
const priorities = ["P0", "P1", "P2"] as const;
type StageFilter = "All" | ConnectionStage;
type PriorityFilter = "All" | (typeof priorities)[number];

const slug = (value: string) => value.toLowerCase().replaceAll(" ", "-");

export default function Connections() {
  const [stage, setStage] = useState<StageFilter>("All");
  const [priority, setPriority] = useState<PriorityFilter>("All");

  const counts = Object.fromEntries(
    stages.map((item) => [
      item,
      connections.filter((connection) => connection.stage === item).length,
    ]),
  );

  const visibleConnections = useMemo(
    () =>
      connections.filter(
        (connection) =>
          (stage === "All" || connection.stage === stage) &&
          (priority === "All" || connection.priority === priority),
      ),
    [stage, priority],
  );

  return (
    <main className="lab shell">
      <nav className="lab-nav">
        <a className="brand" href="/">
          <b>AA</b>agent-assistant
        </a>
        <a href="/developers">Developer docs</a>
      </nav>

      <header className="lab-hero">
        <div>
          <p className="eyebrow">INTEGRATION LAB</p>
          <h1>Every connection. One honest status.</h1>
          <p>
            Our internal control center for tracking protocols, partners, tests,
            blockers and the next concrete action. A target is only marked
            connected when evidence exists.
          </p>
        </div>
        <a className="lab-add" href="#submit-target">
          + Add a target
        </a>
      </header>

      <section className="lab-stats" aria-label="Integration stage totals">
        {stages.map((item) => (
          <div key={item}>
            <strong>{counts[item]}</strong>
            <span>{item}</span>
          </div>
        ))}
      </section>

      <section className="lab-controls" aria-label="Connection filters">
        <div className="filter-group">
          <span>Stage</span>
          <div className="filter-buttons">
            {(["All", ...stages] as StageFilter[]).map((item) => (
              <button
                type="button"
                key={item}
                className={stage === item ? "active" : ""}
                aria-pressed={stage === item}
                onClick={() => setStage(item)}
              >
                {item === "All" ? "All stages" : item}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group priority-filter">
          <span>Priority</span>
          <div className="filter-buttons">
            {(["All", ...priorities] as PriorityFilter[]).map((item) => (
              <button
                type="button"
                key={item}
                className={priority === item ? "active" : ""}
                aria-pressed={priority === item}
                onClick={() => setPriority(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="tracker-summary" aria-live="polite">
        <strong>{visibleConnections.length}</strong> of {connections.length} targets
        <small>Default view: all connections</small>
      </div>

      <section className="connection-list" aria-label="Integration targets">
        <div className="connection-list-head" aria-hidden="true">
          <span>Target</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Route</span>
          <span>Next action</span>
          <span>Evidence</span>
        </div>
        {visibleConnections.map((connection) => (
          <article className="connection-row" key={connection.name}>
            <div className="connection-name">
              <small>{connection.category}</small>
              <h2>{connection.name}</h2>
              <time>{connection.updated}</time>
            </div>
            <div className="mobile-label" aria-hidden="true">Status</div>
            <div>
              <span className={`stage ${slug(connection.stage)}`}>
                {connection.stage}
              </span>
            </div>
            <div className="mobile-label" aria-hidden="true">Priority</div>
            <div>
              <b className={`priority ${connection.priority.toLowerCase()}`}>
                {connection.priority}
              </b>
            </div>
            <div className="mobile-label" aria-hidden="true">Route</div>
            <p>{connection.route}</p>
            <div className="mobile-label" aria-hidden="true">Next action</div>
            <p>{connection.nextAction}</p>
            <div className="mobile-label" aria-hidden="true">Evidence</div>
            <div className="connection-proof">
              <span>{connection.proof}</span>
              <a
                href={connection.href}
                target={connection.href.startsWith("http") ? "_blank" : undefined}
                rel={connection.href.startsWith("http") ? "noreferrer" : undefined}
              >
                Open evidence
              </a>
            </div>
          </article>
        ))}
        {visibleConnections.length === 0 && (
          <div className="connection-empty">
            No targets match these filters. Try another stage or priority.
          </div>
        )}
      </section>

      <section className="lab-submit" id="submit-target">
        <div>
          <p className="eyebrow">NEXT TARGET</p>
          <h2>Send a project, API or MCP link.</h2>
          <p>
            We will verify the interface, choose the correct route, record
            evidence and define the smallest useful test.
          </p>
        </div>
        <div>
          <strong>After Neon + Privy</strong>
          <p>
            This tracker becomes editable, founder-only and backed by an
            integration event history.
          </p>
        </div>
      </section>
    </main>
  );
}