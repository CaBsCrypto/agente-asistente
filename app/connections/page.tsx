"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { connections, type ConnectionStage } from "./data";

const stages: ConnectionStage[] = [
  "Connected",
  "Read-only connected",
  "Ready to test",
  "Credentials needed",
  "Partner outreach",
  "Research",
];
const priorities = ["P0", "P1", "P2"] as const;
const categories = Array.from(
  new Set(connections.map((connection) => connection.category)),
).sort();

type StageFilter = "All" | ConnectionStage;
type PriorityFilter = "All" | (typeof priorities)[number];

const slug = (value: string) => value.toLowerCase().replaceAll(" ", "-");

export default function Connections() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [stage, setStage] = useState<StageFilter>("All");
  const [priority, setPriority] = useState<PriorityFilter>("All");

  const counts = Object.fromEntries(
    stages.map((item) => [
      item,
      connections.filter((connection) => connection.stage === item).length,
    ]),
  );

  const visibleConnections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return connections.filter((connection) => {
      const searchable = [
        connection.name,
        connection.category,
        connection.stage,
        connection.route,
        connection.proof,
        connection.nextAction,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (category === "All" || connection.category === category) &&
        (stage === "All" || connection.stage === stage) &&
        (priority === "All" || connection.priority === priority)
      );
    });
  }, [query, category, stage, priority]);

  const hasFilters =
    query.trim() !== "" ||
    category !== "All" ||
    stage !== "All" ||
    priority !== "All";

  const clearFilters = () => {
    setQuery("");
    setCategory("All");
    setStage("All");
    setPriority("All");
  };

  return (
    <main className="lab shell">
      <nav className="lab-nav">
        <Link className="brand" href="/">
          <b>AA</b>agent-assistant
        </Link>
        <a href="/developers">Developer docs</a>
      </nav>

      <header className="lab-hero">
        <div>
          <p className="eyebrow">INTEGRATION LAB</p>
          <h1>Every connection. One honest status.</h1>
          <p>
            Track protocols, partners, tests, blockers and the next concrete
            action across {connections.length} integration targets. A target is
            only marked connected when evidence exists.
          </p>
        </div>
        <a className="lab-add" href="#submit-target">
          + Add a target
        </a>
      </header>

      <section className="lab-stats" aria-label="Integration stage totals">
        {stages.map((item) => (
          <button
            type="button"
            key={item}
            className={stage === item ? "active" : ""}
            aria-pressed={stage === item}
            onClick={() => setStage(stage === item ? "All" : item)}
          >
            <strong>{counts[item]}</strong>
            <span>{item}</span>
          </button>
        ))}
      </section>

      <section className="lab-controls" aria-label="Connection filters">
        <div className="filter-topline">
          <label className="filter-group filter-search">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Shopify, payments, travel..."
            />
          </label>

          <label className="filter-group filter-select">
            <span>Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="All">All categories</option>
              {categories.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

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
        </div>

        <div className="filter-bottomline">
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
          <button
            type="button"
            className="clear-filters"
            onClick={clearFilters}
            disabled={!hasFilters}
          >
            Clear filters
          </button>
        </div>
      </section>

      <div className="tracker-summary" aria-live="polite">
        <strong>{visibleConnections.length}</strong> of {connections.length} targets
        <small>{hasFilters ? "Filtered view" : "Default view: all connections"}</small>
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
              {connection.focus && (
                <span className="target-focus">{connection.focus}</span>
              )}
              <small>{connection.category}</small>
              <h2>{connection.name}</h2>
              <time>{connection.updated}</time>
            </div>
            <div className="mobile-label" aria-hidden="true">
              Status
            </div>
            <div>
              <span className={`stage ${slug(connection.stage)}`}>
                {connection.stage}
              </span>
            </div>
            <div className="mobile-label" aria-hidden="true">
              Priority
            </div>
            <div>
              <b className={`priority ${connection.priority.toLowerCase()}`}>
                {connection.priority}
              </b>
            </div>
            <div className="mobile-label" aria-hidden="true">
              Route
            </div>
            <p>{connection.route}</p>
            <div className="mobile-label" aria-hidden="true">
              Next action
            </div>
            <p>{connection.nextAction}</p>
            <div className="mobile-label" aria-hidden="true">
              Evidence
            </div>
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
            <strong>No matching targets.</strong>
            <span>Try another search, category, stage or priority.</span>
            <button type="button" onClick={clearFilters}>
              Show all connections
            </button>
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