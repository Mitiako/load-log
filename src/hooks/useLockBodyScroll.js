// useLockBodyScroll.js
// Блокує скрол body, поки відкрита модалка — інакше бекдроп під
// модалкою продовжує скролитись, і на мобільних це ще й спричиняє
// стрибок висоти viewport (100dvh перераховується), через що
// модалка на мить "підстрибує" при відкритті.
import { useEffect } from "react";

export function useLockBodyScroll() {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);
}
