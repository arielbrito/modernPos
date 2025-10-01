import { SVGAttributes } from 'react';

// Logo completo con texto
export function AppLogoFull(props: Omit<SVGAttributes<SVGElement>, 'viewBox'>) {
    return (
        <svg {...props} viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="logo-box-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#3AB795', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#2E9B7E', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="logo-text-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: 'currentColor', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#3AB795', stopOpacity: 1 }} />
                </linearGradient>
            </defs>

            {/* Icono Box */}
            <g transform="translate(5, 10)">
                <rect x="2" y="2" width="36" height="36" rx="8" fill="url(#logo-box-gradient)" opacity="0.1" />
                <rect x="4" y="4" width="32" height="32" rx="6" fill="none" stroke="url(#logo-box-gradient)" strokeWidth="2.5" />

                <line x1="12" y1="13" x2="28" y2="13" stroke="url(#logo-box-gradient)" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="20" x2="28" y2="20" stroke="url(#logo-box-gradient)" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="27" x2="22" y2="27" stroke="url(#logo-box-gradient)" strokeWidth="2" strokeLinecap="round" />

                <circle cx="34" cy="8" r="2.5" fill="#3AB795">
                    <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
                </circle>
            </g>

            {/* Texto */}
            <text
                x="50"
                y="35"
                fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
                fontSize="24"
                fontWeight="900"
                fill="url(#logo-text-gradient)"
                letterSpacing="-0.5"
            >
                StoneRetail
            </text>

            <text
                x="52"
                y="48"
                fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
                fontSize="8"
                fontWeight="600"
                fill="currentColor"
                opacity="0.6"
                letterSpacing="0.5"
            >
                PUNTO DE VENTA
            </text>
        </svg>
    );
}

// Solo el icono (para sidebar, favicon, etc.)
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#4CC4A5', stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: '#3AB795', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#2E9B7E', stopOpacity: 1 }} />
                </linearGradient>
            </defs>

            <rect x="4" y="4" width="32" height="32" rx="6" fill="url(#icon-gradient)" opacity="0.15" />
            <rect x="6" y="6" width="28" height="28" rx="5" fill="none" stroke="url(#icon-gradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            <line x1="12" y1="14" x2="28" y2="14" stroke="url(#icon-gradient)" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="20" x2="28" y2="20" stroke="url(#icon-gradient)" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="26" x2="22" y2="26" stroke="url(#icon-gradient)" strokeWidth="2" strokeLinecap="round" />

            <circle cx="32" cy="10" r="2.5" fill="#3AB795">
                <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
            </circle>
        </svg>
    );
}