/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#006575',
          50: '#E6F3F5',
          100: '#CCE7EB',
          200: '#99CFD7',
          300: '#66B7C3',
          400: '#339FAF',
          500: '#006575',
          600: '#005C6A',
          700: '#004A55',
          800: '#003840',
          900: '#00262B',
        },
        danger: {
          DEFAULT: '#E4052E',
          50: '#FCE4E9',
          100: '#F9C9D3',
          200: '#F393A7',
          300: '#ED5D7B',
          400: '#E7274F',
          500: '#E4052E',
          600: '#CC0429',
          700: '#A10321',
          800: '#760218',
          900: '#4B0110',
        },
        success: {
          DEFAULT: '#99CC01',
          50: '#F5F9E6',
          100: '#EBF3CC',
          200: '#D7E799',
          300: '#C3DB66',
          400: '#AFCF33',
          500: '#99CC01',
          600: '#8AB801',
          700: '#6E9301',
          800: '#526E01',
          900: '#364900',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}