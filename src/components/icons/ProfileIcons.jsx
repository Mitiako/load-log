// ProfileIcons.jsx
// Лінійні іконки для тайлів Profile.
// Колір іконки успадковується від currentColor — керується ззовні через
// style={{ color: "var(--text-muted)" }} або через className,
// щоб іконки автоматично підлаштовувались під тему (dark/light) і стан тайла.

function IconBase({ children, size = 24, ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

// Driver — ім'я / email / телефон, а також фото профілю
export function DriverIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M18 21a6 6 0 0 0-12 0" />
      <circle cx="12" cy="10" r="4" />
    </IconBase>
  );
}

// Home Address
export function HomeAddressIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </IconBase>
  );
}

// Company
export function CompanyIcon(props) {
  return (
    <IconBase {...props}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h2" />
      <path d="M14 6h2" />
      <path d="M8 10h2" />
      <path d="M14 10h2" />
      <path d="M8 14h2" />
      <path d="M14 14h2" />
    </IconBase>
  );
}

// Truck (Unit # / Plate)
export function TruckIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M14 18H3V6h11v12z" />
      <path d="M14 9h4l3 3v6h-7V9z" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </IconBase>
  );
}

// Trailer (Unit # / Plate)
export function TrailerIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 6h15v12H3z" />
      <path d="M18 15h3" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="14" cy="18" r="2" />
    </IconBase>
  );
}

// Pay Settings
export function PaySettingsIcon(props) {
  return (
    <IconBase {...props}>
      <line x1="12" x2="12" y1="1" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </IconBase>
  );
}

// Goal
export function GoalIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1" />
    </IconBase>
  );
}

// CDL License Photo
export function CdlIcon(props) {
  return (
    <IconBase {...props}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <circle cx="7" cy="11" r="2" />
      <path d="M4 16a3 3 0 0 1 6 0" />
      <line x1="14" x2="18" y1="10" y2="10" />
      <line x1="14" x2="18" y1="14" y2="14" />
    </IconBase>
  );
}

// Medical Card Photo
export function MedicalCardIcon(props) {
  return (
    <IconBase {...props}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d="M12 9v6" />
      <path d="M9 12h6" />
    </IconBase>
  );
}

// License Plate (Truck Plate / Trailer Plate)
export function LicensePlateIcon(props) {
  return (
    <IconBase {...props}>
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <line x1="6" x2="10" y1="12" y2="12" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
      <line x1="14" x2="18" y1="12" y2="12" />
    </IconBase>
  );
}

// Close / Remove
export function CloseIcon(props) {
  return (
    <IconBase {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </IconBase>
  );
}
