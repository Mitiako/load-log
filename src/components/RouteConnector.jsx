// RouteConnector.jsx
// Анімована лінія-конектор між зеленою (From) і помаранчевою (To)
// крапками — дашики переходять кольором від зеленого до accent,
// з приглушеною пульсацією "хвилею" вздовж лінії.
import { useMemo } from "react";

const GREEN = [53, 196, 106];
const ORANGE = [255, 138, 61];

function mixColor(t) {
  const r = Math.round(GREEN[0] + (ORANGE[0] - GREEN[0]) * t);
  const g = Math.round(GREEN[1] + (ORANGE[1] - GREEN[1]) * t);
  const b = Math.round(GREEN[2] + (ORANGE[2] - GREEN[2]) * t);
  return `rgb(${r},${g},${b})`;
}

export default function RouteConnector({ top, height }) {
  const dashes = useMemo(() => {
    const count = Math.max(4, Math.round(height / 22));
    return Array.from({ length: count }, (_, i) => {
      const t = count > 1 ? i / (count - 1) : 0;
      return {
        key: i,
        offset: t * height,
        color: mixColor(t),
        delay: +(t * 1.3).toFixed(2),
      };
    });
  }, [height]);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top,
        width: 10,
        height,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#35C46A",
          transform: "translate(-50%, -50%)",
          animation: "route-dot-green 3s ease-in-out infinite",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: height,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "var(--accent)",
          transform: "translate(-50%, -50%)",
          animation: "route-dot-orange 3s ease-in-out 1.5s infinite",
          zIndex: 2,
        }}
      />
      {dashes.map((d) => (
        <div
          key={d.key}
          style={{
            position: "absolute",
            left: "50%",
            top: d.offset,
            width: 3,
            height: 7,
            borderRadius: 2,
            transform: "translate(-50%, -50%)",
            background: d.color,
            color: d.color,
            animation: `route-dash-pulse 3s ease-in-out ${d.delay}s infinite`,
            zIndex: 1,
          }}
        />
      ))}
      <style>{`
        @keyframes route-dash-pulse {
          0% { opacity: 0.75; filter: drop-shadow(0 0 3px currentColor); }
          12% { opacity: 0.18; filter: drop-shadow(0 0 0 transparent); }
          100% { opacity: 0.18; filter: drop-shadow(0 0 0 transparent); }
        }
        @keyframes route-dot-green {
          0% { box-shadow: 0 0 0 0 rgba(53,196,106,0.3); }
          4% { box-shadow: 0 0 0 6px rgba(53,196,106,0); }
          100% { box-shadow: 0 0 0 6px rgba(53,196,106,0); }
        }
        @keyframes route-dot-orange {
          0% { box-shadow: 0 0 0 0 rgba(255,138,61,0.3); }
          4% { box-shadow: 0 0 0 6px rgba(255,138,61,0); }
          100% { box-shadow: 0 0 0 6px rgba(255,138,61,0); }
        }
      `}</style>
    </div>
  );
}
