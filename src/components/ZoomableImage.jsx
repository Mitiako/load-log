// ZoomableImage.jsx
// Повноекранний перегляд фото з жестами: pinch-to-zoom (двома пальцями)
// і double-tap для швидкого наближення/віддалення, плюс перетягування
// пальцем, коли наближено. Зум ізольований усередині цього компонента
// (CSS transform), тому НІКОЛИ не "втікає" на весь застосунок —
// на відміну від нативного зуму сторінки браузером.
import { useState, useRef } from "react";

export default function ZoomableImage({ src, alt }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const pinchState = useRef(null);
  const panState = useRef(null);
  const lastTap = useRef(0);

  function distance(touches) {
    const [a, b] = touches;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      pinchState.current = {
        startDist: distance(e.touches),
        startScale: scale,
      };
      panState.current = null;
      setIsInteracting(true);
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        if (scale > 1) {
          setScale(1);
          setTranslate({ x: 0, y: 0 });
        } else {
          setScale(2.5);
        }
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
      if (scale > 1) {
        panState.current = {
          startX: e.touches[0].clientX - translate.x,
          startY: e.touches[0].clientY - translate.y,
        };
        setIsInteracting(true);
      }
    }
  }

  function handleTouchMove(e) {
    if (e.touches.length === 2 && pinchState.current) {
      e.preventDefault();
      const ratio = distance(e.touches) / pinchState.current.startDist;
      setScale(Math.min(4, Math.max(1, pinchState.current.startScale * ratio)));
    } else if (e.touches.length === 1 && panState.current && scale > 1) {
      e.preventDefault();
      setTranslate({
        x: e.touches[0].clientX - panState.current.startX,
        y: e.touches[0].clientY - panState.current.startY,
      });
    }
  }

  function handleTouchEnd(e) {
    if (e.touches.length < 2) pinchState.current = null;
    if (e.touches.length < 1) {
      panState.current = null;
      setIsInteracting(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        touchAction: "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          maxWidth: "92%",
          maxHeight: "88dvh",
          objectFit: "contain",
          borderRadius: 12,
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: isInteracting ? "none" : "transform 0.15s ease-out",
          touchAction: "none",
        }}
      />
    </div>
  );
}
