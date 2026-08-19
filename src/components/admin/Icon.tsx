export type IconKey =
  | "home" | "users" | "book" | "calendar" | "check" | "spark" | "shield"
  | "sun" | "moon" | "logout" | "menu" | "close" | "back";

const P: Record<IconKey, string> = {
  home: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5",
  users: "M16 20v-1.6a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 10.4a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4M22 20v-1.6a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.3",
  book: "M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5zM4 19.5A1.5 1.5 0 0 1 5.5 21H19",
  calendar: "M8 2.8v3.4M16 2.8v3.4M3.5 9.8h17M4.8 4.5h14.4a1.3 1.3 0 0 1 1.3 1.3v13.4a1.3 1.3 0 0 1-1.3 1.3H4.8a1.3 1.3 0 0 1-1.3-1.3V5.8a1.3 1.3 0 0 1 1.3-1.3",
  check: "M20.5 6.5 9.5 17.5 3.8 11.8",
  spark: "M12 2.6v5M12 16.4v5M2.6 12h5M16.4 12h5M5.4 5.4l3.5 3.5M15.1 15.1l3.5 3.5M18.6 5.4l-3.5 3.5M8.9 15.1l-3.5 3.5",
  shield: "M12 21s7.5-3.4 7.5-9.4V5.5L12 2.8 4.5 5.5v6.1C4.5 17.6 12 21 12 21",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 1.6v2.2M12 20.2v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M1.6 12h2.2M20.2 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6",
  moon: "M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.6 8.6 0 1 0 10.8 10.8",
  logout: "M9 21H5.4A1.4 1.4 0 0 1 4 19.6V4.4A1.4 1.4 0 0 1 5.4 3H9M16 17l5-5-5-5M21 12H9",
  menu: "M3.5 6.5h17M3.5 12h17M3.5 17.5h17",
  close: "M18.5 5.5l-13 13M5.5 5.5l13 13",
  back: "M15.5 19.5 8 12l7.5-7.5",
};

export default function Icon({ name, size = 16 }: { name: IconKey; size?: number }) {
  return (
    <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[name]} />
    </svg>
  );
}
