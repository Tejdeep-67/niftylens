const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

export const IconMarket = (p) => (<svg {...base} {...p}><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></svg>);
export const IconStar = ({ filled, ...p }) => (<svg {...base} {...p} fill={filled ? "currentColor" : "none"}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>);
export const IconWallet = (p) => (<svg {...base} {...p}><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M16 13h2M3 10h18M7 6V4h10v2" /></svg>);
export const IconNews = (p) => (<svg {...base} {...p}><path d="M4 5h13v14H6a2 2 0 0 1-2-2z" /><path d="M17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5M8 16h3" /></svg>);
export const IconBell = (p) => (<svg {...base} {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>);
export const IconInsight = (p) => (<svg {...base} {...p}><circle cx="7" cy="16" r="2" /><circle cx="12" cy="10" r="2" /><circle cx="17" cy="13" r="2" /><circle cx="19" cy="6" r="1.5" /><path d="M3 21h18" /></svg>);
export const IconBrain = (p) => (<svg {...base} {...p}><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1" /></svg>);
export const IconSearch = (p) => (<svg {...base} width={16} height={16} {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>);
export const IconX = (p) => (<svg {...base} width={16} height={16} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>);
export const IconTrash = (p) => (<svg {...base} width={16} height={16} {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>);
export const IconRefresh = (p) => (<svg {...base} width={16} height={16} {...p}><path d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3M4 4v4h4M20 20v-4h-4" /></svg>);

export function Logo(props) {
  return (
    <svg viewBox="0 0 64 64" {...props} aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#0e131b" />
      <rect x=".75" y=".75" width="62.5" height="62.5" rx="14.25" fill="none" stroke="#7aa2ff" strokeOpacity=".35" strokeWidth="1.5" />
      <circle cx="28" cy="28" r="15" fill="none" stroke="#7aa2ff" strokeWidth="5" />
      <path d="M39.5 39.5L51 51" stroke="#7aa2ff" strokeWidth="6" strokeLinecap="round" />
      <path d="M19.5 33.5l5.5-5.5 4 3.5 8-9" fill="none" stroke="#2fd08c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
