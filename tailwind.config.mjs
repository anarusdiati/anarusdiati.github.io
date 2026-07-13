/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Accent — soft "periwinkle" (#96A1F6). Used for links, buttons,
        // active tags, and hover/gradient states in both light & dark mode.
        primary: {
          50: '#eff1fe',
          100: '#e1e4fd',
          200: '#c8cefb',
          300: '#aeb6f9',
          400: '#96a1f6',
          500: '#7c86ef',
          600: '#6470e2',
          700: '#505bc4',
          800: '#424a9c',
          900: '#3a417c',
        },
        // Neutral — soft cool "slate" with a faint lavender undertone, to pair
        // with the periwinkle accent. Dark mode reads as a cool charcoal.
        gray: {
          50: '#f7f8fa',
          100: '#eef0f4',
          200: '#e2e5ec',
          300: '#cdd1db',
          400: '#9ea3b2',
          500: '#767b8b',
          600: '#5e6273',
          700: '#464a58',
          800: '#2a2c36',
          900: '#1b1c24',
          950: '#131319',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100%',
          },
        },
      },
    },
  },
  plugins: [],
};
