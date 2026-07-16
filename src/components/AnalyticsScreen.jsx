// AnalyticsScreen.jsx
import { useState, useMemo, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  ReferenceLine,
  ResponsiveContainer,
  PieChart,
  Pie,
} from "recharts";
import Header from "./Header";
import { fetchProfile } from "../data/firestore";
import { getAnalytics, getWeekBreakdown, pctChange } from "../data/analytics";
import { fmtMoney } from "../data/calc";

const SPLIT_COLORS = {
  net: "#FF8A3D",
  broker: "#8C7A6B",
  fuel: "#5B8C87",
  other: "#8B6F8E",
};

function formatWeekRange(start, end) {
  const opts = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString(
    "en-US",
    opts,
  )}`;
}

export default function AnalyticsScreen({
  user,
  trips,
  theme,
  onToggleTheme,
  onGoToLoad,
}) {
  const data = useMemo(() => getAnalytics(trips), [trips]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const chartCardRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (chartCardRef.current && !chartCardRef.current.contains(e.target)) {
        setSelectedDay(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (user?.uid) fetchProfile(user.uid).then(setProfile);
  }, [user]);

  const week = useMemo(
    () => getWeekBreakdown(trips, weekOffset),
    [trips, weekOffset],
  );

  let goalDailyTarget = null;
  if (profile?.goalType === "rpm" && profile.goalVal) {
    goalDailyTarget = (Number(profile.goalVal) * week.summary.miles) / 7;
  } else if (profile?.goalType === "weekly" && profile.goalVal) {
    goalDailyTarget = Number(profile.goalVal) / 7;
  }

  function handleBarClick(e) {
    if (e && e.activeTooltipIndex !== undefined) {
      setSelectedDay((prev) =>
        prev === e.activeTooltipIndex ? null : e.activeTooltipIndex,
      );
    }
  }

  function toggle(section) {
    setExpanded((prev) => (prev === section ? null : section));
  }

  const s = week.summary;
  const splitTotal = s.brokerCut + s.fuel + s.otherExp + s.net;
  const netPct = splitTotal > 0 ? Math.round((s.net / splitTotal) * 100) : 0;
  const brokerPct =
    splitTotal > 0 ? Math.round((s.brokerCut / splitTotal) * 100) : 0;
  const fuelPct = splitTotal > 0 ? Math.round((s.fuel / splitTotal) * 100) : 0;
  const otherPct =
    splitTotal > 0 ? Math.round((s.otherExp / splitTotal) * 100) : 0;

  return (
    <div style={{ minHeight: "100dvh", paddingBottom: 32 }}>
      <Header
        title="Analytics"
        right={
          <button
            onClick={onToggleTheme}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: "4px",
              color: "var(--text-muted)",
            }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        }
      />

      {!data.hasData ? (
        <div
          style={{
            paddingTop: 120,
            textAlign: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          No data yet.
          <br />
          <span style={{ color: "var(--text-secondary)" }}>
            Add a few loads to see your analytics.
          </span>
        </div>
      ) : (
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* ── Week Navigator ── */}
          <div
            ref={chartCardRef}
            className="glass"
            style={{ padding: "16px 16px 8px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <button
                onClick={() => {
                  setWeekOffset((w) => w - 1);
                  setSelectedDay(null);
                }}
                style={navArrowStyle}
              >
                ←
              </button>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  letterSpacing: "0.02em",
                }}
              >
                {formatWeekRange(week.weekStart, week.weekEnd)}
              </span>
              <button
                onClick={() => {
                  setWeekOffset((w) => w + 1);
                  setSelectedDay(null);
                }}
                disabled={weekOffset >= 0}
                style={{
                  ...navArrowStyle,
                  opacity: weekOffset >= 0 ? 0.3 : 1,
                  cursor: weekOffset >= 0 ? "default" : "pointer",
                }}
              >
                →
              </button>
            </div>

            <div
              style={{
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 30,
                letterSpacing: "-0.02em",
                color: s.net >= 0 ? "var(--accent)" : "#f87171",
                marginBottom: 16,
              }}
            >
              {fmtMoney(s.net)}
            </div>

            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={week.days} onClick={handleBarClick}>
                {goalDailyTarget > 0 && (
                  <ReferenceLine
                    y={goalDailyTarget}
                    stroke="var(--accent)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{
                      value: `Goal ${fmtMoney(goalDailyTarget)}/day`,
                      position: "insideTopLeft",
                      fill: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                    }}
                  />
                )}
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fill: "var(--text-muted)",
                  }}
                />
                <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                  {week.days.map((entry, i) => {
                    const dimmed = selectedDay !== null && selectedDay !== i;
                    const color = entry.net >= 0 ? "var(--accent)" : "#f87171";
                    return (
                      <Cell
                        key={i}
                        fill={color}
                        fillOpacity={dimmed ? 0.25 : 1}
                        cursor="pointer"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {selectedDay !== null && (
              <div style={{ paddingBottom: 8 }}>
                {week.days[selectedDay].loads.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--text-muted)",
                      padding: "8px 0 12px",
                    }}
                  >
                    No loads on {week.days[selectedDay].label}{" "}
                    {week.days[selectedDay].dateLabel}
                  </div>
                ) : (
                  week.days[selectedDay].loads.map((l, i) => (
                    <div
                      key={i}
                      onClick={() => onGoToLoad(l.tripIdx, l.loadIdx)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 4px",
                        borderTop: "1px solid var(--border)",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {l.from} → {l.to}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 13,
                            fontWeight: 700,
                            color: l.net >= 0 ? "var(--accent)" : "#f87171",
                          }}
                        >
                          {fmtMoney(l.net)}
                        </span>
                        <span
                          style={{ color: "var(--text-muted)", fontSize: 12 }}
                        >
                          →
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ── Stats ── */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <StatBlock label="Loads" value={s.loadCount} />
            <StatBlock label="Miles" value={s.miles.toLocaleString()} />
          </div>

          {/* ── Breakdown ── */}
          <div className="glass" style={{ padding: "16px 16px 8px" }}>
            <div className="label" style={{ marginBottom: 8, paddingLeft: 4 }}>
              Breakdown
            </div>

            <BreakdownRow
              label="Gross Rate"
              value={fmtMoney(s.gross)}
              expanded={expanded === "gross"}
              onToggle={() => toggle("gross")}
            >
              <SubRow label="Your Share" value={fmtMoney(s.yourShare)} />
              <SubRow label="Broker Cut" value={`-${fmtMoney(s.brokerCut)}`} />
            </BreakdownRow>

            <BreakdownRow
              label="Expenses"
              value={`-${fmtMoney(s.expenses)}`}
              expanded={expanded === "expenses"}
              onToggle={() => toggle("expenses")}
            >
              <SubRow label="Fuel" value={`-${fmtMoney(s.fuel)}`} />
              <SubRow label="Other" value={`-${fmtMoney(s.otherExp)}`} />
            </BreakdownRow>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 4px",
                borderTop: "1px solid var(--border)",
                marginTop: 4,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--text-primary)",
                }}
              >
                Net Profit
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 16,
                  color: s.net >= 0 ? "var(--accent)" : "#f87171",
                }}
              >
                {fmtMoney(s.net)}
              </span>
            </div>
          </div>

          {/* ── Where the Gross Rate goes ── */}
          {splitTotal > 0 && (
            <div
              className="glass"
              style={{ padding: 16, cursor: "pointer" }}
              onClick={() => setShowBreakdownModal(true)}
            >
              <div
                className="label"
                style={{ marginBottom: 12, paddingLeft: 4 }}
              >
                Where the Gross Rate Goes
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Net", value: s.net },
                          { name: "Broker", value: s.brokerCut },
                          { name: "Fuel", value: s.fuel },
                          { name: "Other", value: s.otherExp },
                        ]}
                        dataKey="value"
                        innerRadius={30}
                        outerRadius={48}
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        <Cell fill={SPLIT_COLORS.net} />
                        <Cell fill={SPLIT_COLORS.broker} />
                        <Cell fill={SPLIT_COLORS.fuel} />
                        <Cell fill={SPLIT_COLORS.other} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <LegendRow
                    color={SPLIT_COLORS.net}
                    label="Net"
                    pct={netPct}
                  />
                  <LegendRow
                    color={SPLIT_COLORS.broker}
                    label="Broker"
                    pct={brokerPct}
                  />
                  <LegendRow
                    color={SPLIT_COLORS.fuel}
                    label="Fuel"
                    pct={fuelPct}
                  />
                  <LegendRow
                    color={SPLIT_COLORS.other}
                    label="Other"
                    pct={otherPct}
                  />
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 10,
                }}
              >
                Tap for full breakdown
              </div>
            </div>
          )}

          {showBreakdownModal && (
            <BreakdownModal
              summary={s}
              netPct={netPct}
              brokerPct={brokerPct}
              fuelPct={fuelPct}
              otherPct={otherPct}
              otherExpenseItems={week.otherExpenseItems}
              onClose={() => setShowBreakdownModal(false)}
            />
          )}

          {/* ── Порівняння This Week vs Last Week ── */}
          <PeriodSection
            title="This Week"
            current={data.thisWeek}
            previous={data.lastWeek}
          />

          {/* ── 8-тижневий тренд ── */}
          <div className="glass" style={{ padding: "20px 16px 12px" }}>
            <div className="label" style={{ marginBottom: 12, paddingLeft: 4 }}>
              Net Profit · Last 8 Weeks
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={data.weeklyChart}>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fill: "var(--text-muted)",
                  }}
                />
                <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                  {data.weeklyChart.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.net >= 0 ? "var(--accent)" : "#f87171"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Порівняння This Month vs Last Month ── */}
          <PeriodSection
            title="This Month"
            current={data.thisMonth}
            previous={data.lastMonth}
          />
        </div>
      )}
    </div>
  );
}

const navArrowStyle = {
  background: "none",
  border: "none",
  fontSize: 18,
  color: "var(--text-secondary)",
  cursor: "pointer",
  padding: "4px 8px",
};

function StatBlock({ label, value }) {
  return (
    <div className="glass" style={{ padding: 16, textAlign: "center" }}>
      <div className="label" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 18,
          color: "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, expanded, onToggle, children }) {
  return (
    <div>
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 4px",
          borderBottom: "1px solid var(--border)",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          {label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              color: "var(--text-primary)",
            }}
          >
            {value}
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform var(--transition)",
            }}
          >
            ▾
          </span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "4px 4px 8px 16px" }}>{children}</div>
      )}
    </div>
  );
}

function SubRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function LegendRow({ color, label, pct }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 99,
          background: color,
          display: "inline-block",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 14,
          color: "var(--text-primary)",
        }}
      >
        {pct}%
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function BreakdownModal({
  summary,
  netPct,
  brokerPct,
  fuelPct,
  otherPct,
  otherExpenseItems,
  onClose,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "85dvh",
          overflowY: "auto",
          background: "var(--bg-elevated)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderRadius: "20px 20px 0 0",
          border: "1px solid var(--border)",
          padding: "24px 20px 40px",
          boxShadow: "var(--glass-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 17,
            color: "var(--text-primary)",
            marginBottom: 20,
          }}
        >
          Gross Rate Breakdown
        </div>

        <BreakdownLine
          color={SPLIT_COLORS.net}
          label="Net Profit"
          value={fmtMoney(summary.net)}
          pct={netPct}
        />
        <BreakdownLine
          color={SPLIT_COLORS.broker}
          label="Broker Cut"
          value={`-${fmtMoney(summary.brokerCut)}`}
          pct={brokerPct}
        />
        <BreakdownLine
          color={SPLIT_COLORS.fuel}
          label="Fuel"
          value={`-${fmtMoney(summary.fuel)}`}
          pct={fuelPct}
        />
        <BreakdownLine
          color={SPLIT_COLORS.other}
          label="Other Expenses"
          value={`-${fmtMoney(summary.otherExp)}`}
          pct={otherPct}
        />

        {otherExpenseItems.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="label" style={{ marginBottom: 8, paddingLeft: 4 }}>
              Other Expenses — Details
            </div>
            {otherExpenseItems.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 4px",
                  borderBottom:
                    i < otherExpenseItems.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  {item.name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--text-primary)",
                  }}
                >
                  {fmtMoney(item.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 4px 0",
            marginTop: 12,
            borderTop: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 14,
              color: "var(--text-primary)",
            }}
          >
            Gross Rate
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--text-primary)",
            }}
          >
            {fmtMoney(summary.gross)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BreakdownLine({ color, label, value, pct }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 4px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 99,
            background: color,
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-primary)",
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            color: "var(--text-primary)",
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          {pct}%
        </div>
      </div>
    </div>
  );
}

/* ─── Секція порівняння періоду ─── */
function PeriodSection({ title, current, previous }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="glass" style={{ padding: 20, textAlign: "center" }}>
        <div className="label" style={{ marginBottom: 6 }}>
          {title} · Net
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: "-0.02em",
            color: current.net >= 0 ? "var(--accent)" : "#f87171",
          }}
        >
          {fmtMoney(current.net)}
        </div>
        <DeltaBadge value={pctChange(current.net, previous.net)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatTile
          label="Gross"
          value={fmtMoney(current.gross)}
          delta={pctChange(current.gross, previous.gross)}
        />
        <StatTile
          label="Expenses"
          value={fmtMoney(current.expenses)}
          delta={pctChange(current.expenses, previous.expenses)}
          invertDelta
        />
        <StatTile
          label="RPM"
          value={`$${current.rpm.toFixed(2)}`}
          delta={pctChange(current.rpm, previous.rpm)}
        />
        <StatTile
          label="Profit Margin"
          value={`${current.margin.toFixed(0)}%`}
          delta={pctChange(current.margin, previous.margin)}
        />
      </div>
    </div>
  );
}

function StatTile({ label, value, delta, invertDelta = false }) {
  return (
    <div className="glass" style={{ padding: 16, textAlign: "center" }}>
      <div className="label" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 16,
          color: "var(--text-primary)",
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <DeltaBadge value={delta} invert={invertDelta} small />
    </div>
  );
}

function DeltaBadge({ value, invert = false, small = false }) {
  if (value === null) {
    return (
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: small ? 10 : 11,
          color: "var(--text-muted)",
        }}
      >
        no prior data
      </div>
    );
  }
  const isGood = invert ? value <= 0 : value >= 0;
  const sign = value > 0 ? "+" : "";
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: small ? 10 : 11,
        color: isGood ? "var(--accent)" : "#f87171",
      }}
    >
      {sign}
      {value.toFixed(0)}% vs prior
    </div>
  );
}
