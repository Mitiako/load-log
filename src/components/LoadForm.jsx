// LoadForm.jsx

import { authFetch } from "../utils/authFetch";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { calcLoad, fmtMoney } from "../data/calc";
import { getSettings, saveSettings } from "../data/store";
import { fetchProfile } from "../data/firestore";
import CityStateInput from "./CityStateInput";
import LocationInput from "./LocationInput";
import Header from "./Header";
import RouteConnector from "./RouteConnector";
import ScanRateConMenu from "./ScanRateConMenu";
import { pdfToImagesBase64 } from "../utils/pdfToImage";
import { lookupZip } from "../utils/zipLookup";

const ORDINALS = ["", "first", "second", "third", "fourth", "fifth", "sixth"];
function ordinal(n) {
  return ORDINALS[n] || `${n}th`;
}

function ordinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function LoadForm({ load, onSave, onBack, user }) {
  const settings = getSettings();

  const [from, setFrom] = useState(load?.from || "");
  const [to, setTo] = useState(load?.to || "");
  const [miles, setMiles] = useState(load?.miles || "");
  const [date, setDate] = useState(
    load?.date || new Date().toISOString().split("T")[0],
  );
  const [dh, setDh] = useState(load?.dh || "");
  const [showDh, setShowDh] = useState(load?.dh > 0 || false);
  const [gross, setGross] = useState(load?.gross || "");
  const [payMode, setPayMode] = useState(
    load?.payMode || settings.payMode || "pct",
  );
  const [payVal, setPayVal] = useState(load?.payVal || settings.payVal || "");

  // Для нового лоуда поля Pay Mode/Val підставляються з Profile.
  // Показуємо це драйверу явно — щоб не заповнював лоуд застарілими
  // даними мовчки, якщо забув оновити Profile.
  const [payAutofilled] = useState(!load);

  useEffect(() => {
    if (!load && user?.uid) {
      fetchProfile(user.uid).then((profile) => {
        if (profile?.payMode) setPayMode(profile.payMode);
        if (profile?.payVal) setPayVal(String(profile.payVal));
      });
    }
  }, [load, user]);
  const [weight, setWeight] = useState(load?.weight || "");

  // Нові поля Route-секції — Address/Zip/Shipper/Receiver окремо для
  // From і To, на додачу до існуючого City+State (from/to).
  const [fromAddress, setFromAddress] = useState(load?.fromAddress || "");
  const [fromZip, setFromZip] = useState(load?.fromZip || "");
  const [fromShipperName, setFromShipperName] = useState(
    load?.fromShipperName || "",
  );
  const [fromShipperContact, setFromShipperContact] = useState(
    load?.fromShipperContact || "",
  );
  const [toAddress, setToAddress] = useState(load?.toAddress || "");
  const [toZip, setToZip] = useState(load?.toZip || "");
  const [toReceiverName, setToReceiverName] = useState(
    load?.toReceiverName || "",
  );

  // Додаткові зупинки понад основний Pickup/Delivery — для мульти-стоп
  // лоудів (кілька адрес забору чи доставки на одному RateCon).
  // Структура кожного елемента: { city, address, zip, contactName, contactPhone }.
  const [extraPickups, setExtraPickups] = useState(
    load?.extraPickups?.length ? load.extraPickups : [],
  );
  const [extraDeliveries, setExtraDeliveries] = useState(
    load?.extraDeliveries?.length ? load.extraDeliveries : [],
  );
  const [showMorePickups, setShowMorePickups] = useState(false);
  const [showMoreDeliveries, setShowMoreDeliveries] = useState(false);

  function addExtraPickup() {
    setExtraPickups([
      ...extraPickups,
      { city: "", address: "", zip: "", contactName: "", contactPhone: "" },
    ]);
    setShowMorePickups(true);
  }
  function updateExtraPickup(i, field, val) {
    const u = [...extraPickups];
    u[i] = { ...u[i], [field]: val };
    setExtraPickups(u);
  }
  function removeExtraPickup(i) {
    setExtraPickups(extraPickups.filter((_, idx) => idx !== i));
  }

  function addExtraDelivery() {
    setExtraDeliveries([
      ...extraDeliveries,
      { city: "", address: "", zip: "", contactName: "", contactPhone: "" },
    ]);
    setShowMoreDeliveries(true);
  }
  function updateExtraDelivery(i, field, val) {
    const u = [...extraDeliveries];
    u[i] = { ...u[i], [field]: val };
    setExtraDeliveries(u);
  }
  function removeExtraDelivery(i) {
    setExtraDeliveries(extraDeliveries.filter((_, idx) => idx !== i));
  }

  // Позиція лінії-конектора між зеленою і помаранчевою крапками —
  // вимірюється реальними координатами DOM (не приблизною CSS-математикою),
  // бо висота FROM-картки змінюється залежно від довжини введеного тексту.
  const routeWrapRef = useRef(null);
  const fromAnchorRef = useRef(null); // вся картка FROM
  const toAnchorRef = useRef(null); // вся картка TO
  const [dotsY, setDotsY] = useState({ from: 18, to: 18 });

  useLayoutEffect(() => {
    function measure() {
      if (
        !routeWrapRef.current ||
        !fromAnchorRef.current ||
        !toAnchorRef.current
      )
        return;
      const wrapRect = routeWrapRef.current.getBoundingClientRect();
      const fromRect = fromAnchorRef.current.getBoundingClientRect();
      const toRect = toAnchorRef.current.getBoundingClientRect();
      // Центр по всій висоті картки (не заголовка) — крапка тепер
      // сидить по центру блоку FROM/TO, а не прив'язана до заголовка.
      setDotsY({
        from: fromRect.top - wrapRect.top + fromRect.height / 2,
        to: toRect.top - wrapRect.top + toRect.height / 2,
      });
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (routeWrapRef.current) ro.observe(routeWrapRef.current);
    return () => ro.disconnect();
  }, []);
  const [toReceiverContact, setToReceiverContact] = useState(
    load?.toReceiverContact || "",
  );
  const [locationError, setLocationError] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scanReceiptRef = useRef(null);
  const scanExpenseRef = useRef(null);
  const [scanningExpense, setScanningExpense] = useState(false);
  const [scanningRateCon, setScanningRateCon] = useState(false);

  const [toast, setToast] = useState(null);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }

  const [diesel, setDiesel] = useState(load?.diesel?.length ? load.diesel : []);
  const [expenses, setExpenses] = useState(
    load?.expenses?.length ? load.expenses : [],
  );

  const currentLoad = {
    miles: Number(miles) || 0,
    dh: showDh ? Number(dh) || 0 : 0,
    gross: Number(gross) || 0,
    payMode,
    payVal: Number(payVal) || 0,
    diesel: diesel.map((d) => ({
      location: d.location || "",
      date: d.date || "",
      gallons: Number(d.gallons) || 0,
      amount: Number(d.amount) || 0,
      discount: Number(d.discount) || 0,
    })),
    expenses: expenses.map((e) => ({
      name: e.name,
      amount: Number(e.amount) || 0,
    })),
  };

  const c = currentLoad.gross ? calcLoad(currentLoad) : null;

  function handlePayMode(mode) {
    setPayMode(mode);
    saveSettings({ ...getSettings(), payMode: mode });
  }
  function handlePayVal(val) {
    setPayVal(val);
    saveSettings({ ...getSettings(), payVal: val });
  }
  function addDiesel() {
    setDiesel([
      ...diesel,
      { location: "", date: "", gallons: "", amount: "", discount: "" },
    ]);
  }
  function updateDiesel(i, field, val) {
    const u = [...diesel];
    u[i] = { ...u[i], [field]: val };
    setDiesel(u);
  }
  function removeDiesel(i) {
    setDiesel(diesel.filter((_, idx) => idx !== i));
  }
  async function handleScanReceipt(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const res = await authFetch("/api/scan-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: ev.target.result }),
        });
        const data = await res.json();
        if (data.error) {
          showToast(
            "Couldn't read the receipt — please enter details manually.",
          );
        } else if (data.notFuelReceipt) {
          showToast(
            "This doesn't look like a fuel receipt — try Scan Receipt in Other Expenses instead.",
          );
        } else {
          setDiesel((prev) => [
            ...prev,
            {
              location: data.location || "",
              date: data.date || "",
              gallons: data.gallons ?? "",
              amount: data.amount ?? "",
              discount: data.discount ?? "",
            },
          ]);
        }
      } catch (err) {
        console.error("Scan failed:", err);
        showToast("Couldn't read the receipt — please enter details manually.");
      } finally {
        setScanning(false);
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleScanExpense(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningExpense(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const res = await authFetch("/api/scan-expense", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: ev.target.result }),
        });
        const data = await res.json();
        if (data.error) {
          showToast(
            "Couldn't read the receipt — please enter details manually.",
          );
        } else if (data.isFuelReceipt) {
          showToast(
            "This looks like a fuel receipt — try Scan Receipt in the Diesel section instead.",
          );
        } else if (data.notAReceipt) {
          showToast(
            "Couldn't recognize this as a receipt — please enter details manually.",
          );
        } else {
          setExpenses((prev) => [
            ...prev,
            {
              name: data.name || "",
              amount: data.amount ?? "",
            },
          ]);
        }
      } catch (err) {
        console.error("Scan failed:", err);
        showToast("Couldn't read the receipt — please enter details manually.");
      } finally {
        setScanningExpense(false);
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  }

  async function fetchRouteMiles(stops) {
    try {
      const res = await authFetch("/api/route-miles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops }),
      });
      const data = await res.json();
      if (data.miles) {
        setMiles(String(data.miles));
      }
    } catch (err) {
      console.error("Route miles fetch failed:", err);
      // Тихо ігноруємо — водій довводить милі вручну, як і зараз.
    }
  }

  // Збирає впорядкований список усіх стопів маршруту для розрахунку миль:
  // перший pickup → додаткові pickup → додаткові delivery → останній delivery.
  // City/State тут беремо з полів форми, не з даних скану — так само
  // рахує і коли водій заповнює/редагує вручну, без AI взагалі.
  function buildRouteStops() {
    const parseCity = (combined) => {
      const parts = (combined || "").split(",");
      if (parts.length < 2) return null;
      return {
        city: parts.slice(0, -1).join(",").trim(),
        state: parts[parts.length - 1].trim(),
      };
    };

    const stops = [];
    const fromStop = parseCity(from);
    if (fromStop) stops.push(fromStop);

    for (const p of extraPickups) {
      const s = parseCity(p.city);
      if (s) stops.push(s);
    }
    for (const d of extraDeliveries) {
      const s = parseCity(d.city);
      if (s) stops.push(s);
    }

    const toStop = parseCity(to);
    if (toStop) stops.push(toStop);

    return stops;
  }

  async function handleScanRateCon(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningRateCon(true);
    try {
      // PDF конвертуємо в масив JPEG-картинок (усі сторінки) локально
      // в браузері — OpenAI vision API приймає лише зображення, не PDF,
      // і нам треба ВСІ сторінки, бо адреси/суми часто на другій-третій.
      let imageDataUrls;
      if (file.type === "application/pdf") {
        const base64Pages = await pdfToImagesBase64(file);
        imageDataUrls = base64Pages.map(
          (b64) => `data:image/jpeg;base64,${b64}`,
        );
      } else {
        const singleImage = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        imageDataUrls = [singleImage];
      }

      const res = await authFetch("/api/scan-ratecon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imageDataUrls }),
      });
      const data = await res.json();

      if (data.error) {
        showToast(
          "Couldn't read the document — please enter details manually.",
        );
      } else if (data.notARateCon) {
        showToast(
          "This doesn't look like a Rate Confirmation — please enter details manually.",
        );
      } else {
        // Заповнюємо тільки те, що AI реально знайшов — решта полів
        // лишається як є, водій сам довводить чого бракує.
        if (data.originCity && data.originState) {
          setFrom(`${data.originCity}, ${data.originState}`);
        }
        if (data.originAddress) setFromAddress(data.originAddress);
        if (data.originZip) setFromZip(data.originZip);
        if (data.shipperName) setFromShipperName(data.shipperName);
        if (data.shipperContact) setFromShipperContact(data.shipperContact);
        if (data.destinationCity && data.destinationState) {
          setTo(`${data.destinationCity}, ${data.destinationState}`);
        }
        if (data.destinationAddress) setToAddress(data.destinationAddress);
        if (data.destinationZip) setToZip(data.destinationZip);
        if (data.receiverName) setToReceiverName(data.receiverName);
        if (data.receiverContact) setToReceiverContact(data.receiverContact);

        // Мульти-стоп: якщо AI знайшов додаткові зупинки — заповнюємо
        // extraPickups/extraDeliveries і одразу розгортаємо секцію,
        // щоб водій одразу побачив що документ має більше однієї адреси.
        if (data.additionalPickups?.length) {
          setExtraPickups(
            data.additionalPickups.map((p) => ({
              city: p.city || "",
              address: p.address || "",
              zip: p.zip || "",
              contactName: p.contactName || "",
              contactPhone: p.contactPhone || "",
            })),
          );
          setShowMorePickups(true);
        }
        if (data.additionalDeliveries?.length) {
          setExtraDeliveries(
            data.additionalDeliveries.map((d) => ({
              city: d.city || "",
              address: d.address || "",
              zip: d.zip || "",
              contactName: d.contactName || "",
              contactPhone: d.contactPhone || "",
            })),
          );
          setShowMoreDeliveries(true);
        }

        if (data.rate) setGross(String(data.rate));
        if (data.weight) setWeight(String(data.weight));

        // Милі рахуємо ПРЯМО з даних скану (data), а не з React-стейту —
        // стейт (from/extraPickups тощо) ще не встиг оновитись у момент
        // виконання цієї функції (класична React "stale closure" пастка),
        // тоді як data вже містить усе потрібне синхронно, без затримки.
        const routeStops = [];
        if (data.originCity && data.originState) {
          routeStops.push({ city: data.originCity, state: data.originState });
        }
        for (const p of data.additionalPickups || []) {
          const parts = (p.city || "").split(",");
          if (parts.length >= 2) {
            routeStops.push({
              city: parts.slice(0, -1).join(",").trim(),
              state: parts[parts.length - 1].trim(),
            });
          }
        }
        for (const d of data.additionalDeliveries || []) {
          const parts = (d.city || "").split(",");
          if (parts.length >= 2) {
            routeStops.push({
              city: parts.slice(0, -1).join(",").trim(),
              state: parts[parts.length - 1].trim(),
            });
          }
        }
        if (data.destinationCity && data.destinationState) {
          routeStops.push({
            city: data.destinationCity,
            state: data.destinationState,
          });
        }
        if (routeStops.length >= 2) {
          fetchRouteMiles(routeStops);
        }
        showToast("Route filled from RateCon — double-check before saving.");
      }
    } catch (err) {
      console.error("Scan RateCon failed:", err);
      showToast("Couldn't read the document — please enter details manually.");
    } finally {
      setScanningRateCon(false);
      e.target.value = "";
    }
  }

  function addExpense() {
    setExpenses([...expenses, { name: "", amount: "" }]);
  }
  function updateExpense(i, field, val) {
    const u = [...expenses];
    u[i] = { ...u[i], [field]: val };
    setExpenses(u);
  }
  function removeExpense(i) {
    setExpenses(expenses.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    if (!gross) return;
    if (!fromAddress || !fromZip || !toAddress || !toZip) {
      setLocationError(true);
      return;
    }
    setLocationError(false);
    onSave({
      from: from || "Unknown",
      to: to || "Unknown",
      fromAddress,
      fromZip,
      fromShipperName,
      fromShipperContact,
      toAddress,
      toZip,
      toReceiverName,
      toReceiverContact,
      // Фільтруємо порожні картки (водій натиснув "+ Add" але нічого
      // не заповнив і не видалив) — не засмічуємо Firestore-документ.
      extraPickups: extraPickups.filter((p) => p.city || p.address),
      extraDeliveries: extraDeliveries.filter((d) => d.city || d.address),
      miles: Number(miles) || 0,
      dh: showDh ? Number(dh) || 0 : 0,
      gross: Number(gross),
      payMode,
      payVal: Number(payVal),
      weight: Number(weight) || 0,
      date,
      diesel: diesel.filter((d) => d.amount),
      expenses: expenses.filter((e) => e.amount),
    });
  }

  return (
    <div
      style={{
        height: "100svh",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Header
        title={load ? "Edit Load" : "New Load"}
        right={
          <button
            onClick={onBack}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            BACK →
          </button>
        }
      />

      {/* Form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 32px" }}>
        {/* Route */}
        <FormSection
          label="ROUTE"
          right={
            <ScanRateConMenu
              onScan={handleScanRateCon}
              scanning={scanningRateCon}
            />
          }
        />
        <div
          ref={routeWrapRef}
          style={{
            margin: "0 16px 12px",
            display: "flex",
            gap: 12,
            position: "relative",
          }}
        >
          <RouteConnector
            top={dotsY.from}
            height={Math.max(0, dotsY.to - dotsY.from)}
          />
          <div style={{ width: 10, flexShrink: 0 }} />

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minWidth: 0,
            }}
          >
            {/* FROM */}
            <div ref={fromAnchorRef} className="glass" style={{ padding: 16 }}>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.02em",
                  color: "var(--text-primary)",
                  marginBottom: 12,
                }}
              >
                From · 1st Pickup
              </div>
              <div style={{ marginBottom: 10 }}>
                <Field
                  label="Address"
                  value={fromAddress}
                  onChange={setFromAddress}
                  placeholder="1600 Pennsylvania Ave NW"
                  required
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <CityStateInput
                  label="City / State / ZIP"
                  value={from}
                  onChange={setFrom}
                  placeholder="Washington"
                  zip={fromZip}
                  onZipChange={setFromZip}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Field
                  label="Shipper name"
                  value={fromShipperName}
                  onChange={setFromShipperName}
                  placeholder="The White House"
                />
                <Field
                  label="Shipper contact"
                  value={fromShipperContact}
                  onChange={setFromShipperContact}
                  placeholder="+12024567041"
                />
              </div>
            </div>
            {/* More pickups */}
            <button
              onClick={() => setShowMorePickups((s) => !s)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
                width: "100%",
              }}
            >
              <div
                style={{ flex: 1, height: 1, background: "var(--border)" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {extraPickups.length > 0
                  ? `MORE STOPS (${extraPickups.length})`
                  : `+ ADD ${ordinalSuffix(2).toUpperCase()} PICKUP STOP`}
              </span>
              <div
                style={{ flex: 1, height: 1, background: "var(--border)" }}
              />
            </button>
            {showMorePickups && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {extraPickups.map((p, i) => (
                  <ExtraStopCard
                    key={i}
                    label={`Pickup #${i + 2}`}
                    stop={p}
                    onChange={(field, val) => updateExtraPickup(i, field, val)}
                    onRemove={() => removeExtraPickup(i)}
                  />
                ))}
                <button
                  onClick={addExtraPickup}
                  style={{
                    padding: "10px",
                    border: "1px dashed var(--border)",
                    borderRadius: "var(--radius-btn)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  + Add {ordinal(extraPickups.length + 2)} pickup stop
                </button>
              </div>
            )}
            {/* More deliveries — рендеряться ПЕРЕД основною карткою To, бо
                хронологічно проміжні зупинки відбуваються РАНІШЕ за
                фінальну точку доставки (яка завжди в основній картці). */}
            <button
              onClick={() => setShowMoreDeliveries((s) => !s)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
                width: "100%",
              }}
            >
              <div
                style={{ flex: 1, height: 1, background: "var(--border)" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {extraDeliveries.length > 0
                  ? `MORE STOPS (${extraDeliveries.length})`
                  : `+ ADD ${ordinalSuffix(1).toUpperCase()} DELIVERY STOP`}
              </span>
              <div
                style={{ flex: 1, height: 1, background: "var(--border)" }}
              />
            </button>
            {showMoreDeliveries && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {extraDeliveries.map((d, i) => (
                  <ExtraStopCard
                    key={i}
                    label={`${ordinal(i + 1)[0].toUpperCase()}${ordinal(i + 1).slice(1)} delivery stop`}
                    stop={d}
                    onChange={(field, val) =>
                      updateExtraDelivery(i, field, val)
                    }
                    onRemove={() => removeExtraDelivery(i)}
                  />
                ))}
                <button
                  onClick={addExtraDelivery}
                  style={{
                    padding: "10px",
                    border: "1px dashed var(--border)",
                    borderRadius: "var(--radius-btn)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  + Add {ordinal(extraDeliveries.length + 1)} delivery stop
                </button>
              </div>
            )}

            {/* TO — фінальна точка доставки, завжди в кінці маршруту */}
            <div ref={toAnchorRef} className="glass" style={{ padding: 16 }}>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.02em",
                  color: "var(--text-primary)",
                  marginBottom: 12,
                }}
              >
                To · Last Delivery
              </div>
              <div style={{ marginBottom: 10 }}>
                <Field
                  label="Address"
                  value={toAddress}
                  onChange={setToAddress}
                  placeholder="10600 N Tantau Ave"
                  required
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <CityStateInput
                  label="City / State / ZIP"
                  value={to}
                  onChange={setTo}
                  placeholder="Cupertino"
                  zip={toZip}
                  onZipChange={setToZip}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Field
                  label="Receiver name"
                  value={toReceiverName}
                  onChange={setToReceiverName}
                  placeholder="Apple Park Visitor Center"
                />
                <Field
                  label="Receiver contact"
                  value={toReceiverContact}
                  onChange={setToReceiverContact}
                  placeholder="+14089611560"
                />
              </div>
            </div>
          </div>
        </div>

        {locationError && (
          <div
            style={{
              margin: "0 16px 12px",
              padding: "10px 12px",
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: "var(--radius-btn)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "#f87171",
              lineHeight: 1.4,
            }}
          >
            Please enter Address and ZIP for both From and To — this keeps your
            route accurate.
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: "0 16px 12px",
          }}
        >
          <Field
            label="Loaded miles"
            value={miles}
            onChange={setMiles}
            type="number"
            placeholder="1100"
          />
          <Field label="Date" value={date} onChange={setDate} type="date" />
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px 16px",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-secondary)",
          }}
        >
          <input
            type="checkbox"
            checked={showDh}
            onChange={(e) => setShowDh(e.target.checked)}
            style={{ accentColor: "var(--accent)", width: 16, height: 16 }}
          />
          Add deadhead miles
        </label>
        {showDh && (
          <div style={{ padding: "0 16px 12px" }}>
            <Field
              label="Deadhead miles"
              value={dh}
              onChange={setDh}
              type="number"
              placeholder="50"
            />
          </div>
        )}

        {/* Pay */}
        <div
          style={{ height: 1, background: "var(--border)", margin: "4px 0" }}
        />
        <FormSection label="PAY" />

        {payAutofilled && (
          <div
            style={{
              background: "rgba(255,138,61,0.1)",
              border: "1px solid rgba(255,138,61,0.25)",
              borderRadius: "var(--radius-btn)",
              padding: "10px 12px",
              margin: "0 16px 12px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--accent)",
              lineHeight: 1.4,
            }}
          >
            Auto-filled from your Profile — double-check it's still correct for
            this load.
          </div>
        )}

        {/* Toggle */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            margin: "0 16px 12px",
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-btn)",
            overflow: "hidden",
          }}
        >
          {["pct", "cpm"].map((mode) => (
            <button
              key={mode}
              onClick={() => handlePayMode(mode)}
              style={{
                padding: "10px",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 500,
                background: payMode === mode ? "var(--accent)" : "transparent",
                color: payMode === mode ? "#100F0C" : "var(--text-muted)",
                transition: "all var(--transition)",
              }}
            >
              {mode === "pct" ? "% of gross" : "Cents per mile"}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: "0 16px 4px",
          }}
        >
          <Field
            label="Gross rate $"
            value={gross}
            onChange={setGross}
            type="number"
            placeholder="2800"
          />
          <Field
            label={payMode === "pct" ? "Your share %" : "Cents per mile"}
            value={payVal}
            onChange={handlePayVal}
            type="number"
            placeholder={payMode === "pct" ? "87" : "90"}
          />
        </div>
        <p
          style={{
            padding: "4px 16px 12px",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-muted)",
            lineHeight: 1.5,
          }}
        >
          {payMode === "pct"
            ? "Owner-operator: ~85–87%. Hired driver: ~28–32%."
            : "Enter cents per mile as a whole number (e.g. 90 = $0.90/mile)."}
        </p>
        <div style={{ padding: "0 16px 12px" }}>
          <Field
            label="Weight (lbs)"
            value={weight}
            onChange={setWeight}
            type="number"
            placeholder="15000"
          />
        </div>

        {/* Diesel */}
        <div
          style={{ height: 1, background: "var(--border)", margin: "4px 0" }}
        />
        <FormSection label="DIESEL" />
        {diesel.map((d, i) => (
          <div
            key={i}
            style={{
              padding: "0 16px 16px",
              borderBottom: "1px solid var(--border)",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <LocationInput
                label="Location"
                value={d.location || ""}
                onChange={(v) => updateDiesel(i, "location", v)}
                placeholder="Oklahoma City, OK"
              />
              <Field
                label="Date"
                value={d.date}
                onChange={(v) => updateDiesel(i, "date", v)}
                type="date"
                placeholder=""
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr auto",
                gap: 8,
                alignItems: "flex-end",
              }}
            >
              <Field
                label="Gallons"
                value={d.gallons}
                onChange={(v) => updateDiesel(i, "gallons", v)}
                placeholder="219"
              />
              <Field
                label="Amount $"
                value={d.amount}
                onChange={(v) => updateDiesel(i, "amount", v)}
                placeholder="840"
              />
              <Field
                label="Discount $"
                value={d.discount}
                onChange={(v) => updateDiesel(i, "discount", v)}
                placeholder="226"
              />
              <button
                onClick={() => removeDiesel(i)}
                style={{
                  height: 42,
                  width: 36,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-input)",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-muted)")
                }
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            margin: "0 16px 12px",
          }}
        >
          <button
            onClick={addDiesel}
            style={{
              padding: "10px",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-btn)",
              background: "transparent",
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              cursor: "pointer",
              transition:
                "border-color var(--transition), color var(--transition)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            + Add fuel stop
          </button>
          <button
            onClick={() => scanReceiptRef.current?.click()}
            disabled={scanning}
            style={{
              padding: "10px",
              border: "1px dashed var(--accent)",
              borderRadius: "var(--radius-btn)",
              background: "rgba(255,138,61,0.08)",
              color: "var(--accent)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              cursor: scanning ? "default" : "pointer",
              opacity: scanning ? 0.6 : 1,
            }}
          >
            {scanning ? "Scanning..." : "📷 Scan Receipt"}
          </button>
          <input
            ref={scanReceiptRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleScanReceipt}
          />
        </div>

        {/* Other expenses */}
        <div
          style={{ height: 1, background: "var(--border)", margin: "4px 0" }}
        />
        <FormSection label="OTHER EXPENSES" />
        {expenses.map((e, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 8,
              padding: "0 16px 8px",
              alignItems: "flex-end",
            }}
          >
            <Field
              label="Description"
              value={e.name}
              onChange={(v) => updateExpense(i, "name", v)}
              placeholder="Lumper, tolls..."
              type="text"
            />
            <Field
              label="Amount $"
              value={e.amount}
              onChange={(v) => updateExpense(i, "amount", v)}
              placeholder="0"
            />
            <button
              onClick={() => removeExpense(i)}
              style={{
                height: 42,
                width: 36,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-input)",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              ×
            </button>
          </div>
        ))}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            margin: "0 16px 12px",
          }}
        >
          <button
            onClick={addExpense}
            style={{
              padding: "10px",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-btn)",
              background: "transparent",
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              cursor: "pointer",
              transition:
                "border-color var(--transition), color var(--transition)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            + Add expense
          </button>
          <button
            onClick={() => scanExpenseRef.current?.click()}
            disabled={scanningExpense}
            style={{
              padding: "10px",
              border: "1px dashed var(--accent)",
              borderRadius: "var(--radius-btn)",
              background: "rgba(255,138,61,0.08)",
              color: "var(--accent)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              cursor: scanningExpense ? "default" : "pointer",
              opacity: scanningExpense ? 0.6 : 1,
            }}
          >
            {scanningExpense ? "Scanning..." : "📷 Scan Receipt"}
          </button>
          <input
            ref={scanExpenseRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleScanExpense}
          />
        </div>

        {/* Live result */}
        {c && (
          <>
            <div
              style={{
                height: 1,
                background: "var(--border)",
                margin: "4px 0",
              }}
            />
            <FormSection label="RESULT" />
            <div
              className="glass"
              style={{
                margin: "0 16px 16px",
                padding: "16px 20px",
              }}
            >
              <ResultRow label="Gross" value={fmtMoney(currentLoad.gross)} />
              <ResultRow label="Company share" value={`−${fmtMoney(c.cut)}`} />
              <ResultRow label="Your gross" value={fmtMoney(c.myGross)} />
              {c.fuelActual > 0 && (
                <ResultRow
                  label="Fuel (actual)"
                  value={`−${fmtMoney(c.fuelActual)}`}
                />
              )}
              {c.otherExp > 0 && (
                <ResultRow
                  label="Other expenses"
                  value={`−${fmtMoney(c.otherExp)}`}
                />
              )}
              <div
                style={{
                  height: 1,
                  background: "var(--border)",
                  margin: "12px 0",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    fontSize: 15,
                    color: "var(--text-primary)",
                  }}
                >
                  Net profit
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 18,
                    color: c.net >= 0 ? "var(--accent)" : "#f87171",
                  }}
                >
                  {fmtMoney(c.net)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Save */}
        <div style={{ padding: "0 16px" }}>
          <button
            onClick={handleSave}
            className="btn-primary"
            style={{ width: "100%", fontSize: 15, opacity: !gross ? 0.4 : 1 }}
          >
            {load ? "Save Changes" : "Save Load"}
          </button>
        </div>
      </div>
      {toast && <Toast message={toast} />}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.6875rem",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-primary)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ position: "relative" }}>
        {required && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -4,
              color: "#f87171",
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1,
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            *
          </span>
        )}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="input"
          style={{ fontSize: 14, padding: "10px 12px" }}
        />
      </div>
    </div>
  );
}

function ResultRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5px 0",
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
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function FormSection({ label, right }) {
  return (
    <div
      style={{
        padding: "16px 16px 8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: "0.2em",
          color: "var(--text-primary)",
        }}
      >
        {label}
      </div>
      {right}
    </div>
  );
}

function Toast({ message }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "calc(100% - 32px)",
        zIndex: 300,
        padding: "12px 18px",
        background: "var(--bg-elevated)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-btn)",
        boxShadow: "var(--glass-shadow)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--text-primary)",
        textAlign: "center",
        lineHeight: 1.4,
      }}
    >
      {message}
    </div>
  );
}

function ExtraStopCard({ label, stop, onChange, onRemove }) {
  const lastLookedUpZip = useRef(null);

  useEffect(() => {
    const zip = stop.zip;
    if (!zip || zip.length !== 5 || zip === lastLookedUpZip.current) return;
    lastLookedUpZip.current = zip;
    lookupZip(zip).then((result) => {
      if (result) {
        onChange("city", `${result.city}, ${result.state}`);
      }
    });
  }, [stop.zip]);

  return (
    <div className="glass" style={{ padding: 16, position: "relative" }}>
      <button
        onClick={onRemove}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-input)",
          background: "transparent",
          color: "var(--text-muted)",
          cursor: "pointer",
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "var(--text-muted)")
        }
      >
        ×
      </button>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: "0.02em",
          color: "var(--text-primary)",
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div style={{ marginBottom: 10 }}>
        <Field
          label="Address"
          value={stop.address}
          onChange={(v) => onChange("address", v)}
          placeholder="Street address"
          required
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <Field
          label="ZIP"
          value={stop.zip}
          onChange={(v) => onChange("zip", v)}
          placeholder="80202"
          required
        />
        <Field
          label="City, State"
          value={stop.city}
          onChange={(v) => onChange("city", v)}
          placeholder="Auto-filled from ZIP"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field
          label="Contact name"
          value={stop.contactName}
          onChange={(v) => onChange("contactName", v)}
          placeholder="Company name"
        />
        <Field
          label="Contact phone"
          value={stop.contactPhone}
          onChange={(v) => onChange("contactPhone", v)}
          placeholder="+1..."
        />
      </div>
    </div>
  );
}
