import { Config } from "tailwindcss";

export default <Partial<Config>>{
  darkMode: "class",
  content: [
    "./src/**/*.{ts,js,html}",
    "./node_modules/@ayu-sh-kr/dota-ui/dist/**/*.{mjs,js}",
    "../../ui/dota-ui/src/**/*.{html,ts}",
    "./node_modules/@ayu-sh-kr/dota-md/dist/**/*.{mjs,js}",
    "../../ui/dota-md/src/**/*.ts",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background-color)',
        foreground: 'var(--foreground-color)',
        muted: 'var(--muted-color)',
        surface: 'var(--surface-color)',
        raised: 'var(--surface-raised-color)',
        default: 'var(--border-color)',
        strong: 'var(--border-strong-color)',
        primary: 'var(--primary-color)',
        'primary-hover': 'var(--primary-color-hover)',
        'primary-subtle': 'var(--primary-color-subtle)',
        'primary-border': 'var(--primary-color-border)',
        'primary-fill': 'var(--primary-color-fill)',
        'on-primary': 'var(--primary-color-on)',
        focus: 'var(--focus-color)',
        success: 'var(--success-color)',
        warning: 'var(--warning-color)',
        danger: 'var(--danger-color)',
        'code-background': 'var(--code-background-color)',
        'code-foreground': 'var(--code-foreground-color)',
        'code-muted': 'var(--code-muted-color)',
        'code-border': 'var(--code-border-color)',
        'code-toolbar': 'var(--code-toolbar-color)',
        'code-accent': 'var(--code-accent-color)',
        'code-success': 'var(--code-success-color)',
        'code-warning': 'var(--code-warning-color)',
        'code-danger': 'var(--code-danger-color)',
      },
      borderRadius: {
        control: 'var(--layout-radius-control)',
        code: 'var(--layout-radius-code)',
        card: 'var(--layout-radius-card)',
      },
      boxShadow: {
        lift: 'var(--shadow-lift)',
        pop: 'var(--shadow-pop)',
      },
      backgroundImage: {
        "gradient-moving":
          "linear-gradient(to right, #800080, #E1CD86, #BBCB92, #71C2EF, #3BFFFF, #DD7DDF, #E1CD86, #BBCB92, #71C2EF, #3BFFFF)",
      },
      backgroundSize: {
        "200": "200% 100%",
      },

      fontFamily: {
        helvetica: ["Helvetica", "Arial", "sans-serif"],
        montserrat:"Montserrat",
        dm: ['var(--font-body)'],
        akstic: ["Akstic", "serif"],
        sans: ['var(--font-body)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-code)'],
        system: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
        ],
        roboto: ["Roboto", "sans-serif"],
      },
      animation: {
        tilt: "tilt 10s infinite linear",
        "border-spin": "border-spin 7s linear infinite",
        "gradient-x": "gradientX 1s linear infinite",
      },
      keyframes: {
        tilt: {
          "0%, 50%, 100%": {
            transform: "rotate(0deg)",
          },
          "25%": {
            transform: "rotate(0.6deg)",
          },
          "75%": {
            transform: "rotate(-0.6deg)",
          },
        },
        gradientX: {
          "0%": { backgroundPositionX: "0%" },
          "50%": { backgroundPositionX: "-50%" },
          "100%": { backgroundPositionX: "-100%" },
          
        },
        "border-spin": {
          "100%": {
            transform: "rotate(-360deg)",
          },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    ({ matchUtilities }: { matchUtilities: Function }) => {
      matchUtilities(
        {
          wobble: (value: string) => ({
            animation: `wobble-press ${value} ease-out both`,
            willChange: 'transform',
          }),
        },
        {
          values: {
            '200': '200ms',
            '300': '300ms',
            '400': '400ms',
            '500': '500ms',
            '600': '600ms',
          },
        }
      );
    },
  ],
};
