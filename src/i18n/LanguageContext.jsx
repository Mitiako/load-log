// LanguageContext.jsx
// Глобальний контекст мови інтерфейсу. Мова зберігається в localStorage,
// так само як і тема (theme), і не залежить від Firebase-профілю.

import { useState, useEffect } from "react";
import { translations } from "./translations";
import { LanguageContext } from "./languageContextObject";

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("language") || "en",
  );

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  function t(key) {
    return translations[language]?.[key] ?? translations.en[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
