import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Alert & Status colors
                app: {
                    danger: '#EF4444',      // Red incidents
                    warning: '#F97316',     // Orange warnings
                    info: '#3B82F6',        // Blue info
                    success: '#22C55E',     // Green success
                    gold: '#EAB308',        // Yellow/gold
                },
                // Primary brand — mirrors --brand-* CSS tokens in globals.css
                brand: {
                    DEFAULT: '#2563EB',
                    dark: '#1D4ED8',
                    surface: '#EFF6FF',
                },
            },
            spacing: {
                // Standard responsive padding scale
                'safe-mobile': '1rem',    // 16px
                'safe-tablet': '1.5rem',  // 24px
                'safe-desktop': '2rem',   // 32px
            },
            height: {
                // Fixed heights for navigation
                'nav-mobile': '4rem',      // 64px (h-16)
                'nav-desktop': '5rem',     // 80px (h-20)
                'bottom-nav': '72px',      // Safe area + nav
            },
        },
    },
    plugins: [],
};

export default config;
