/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--foreground))' },
        ink: 'var(--ink)',
        sub: 'var(--sub)',
        line: 'var(--line)',
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        action: 'var(--action)',
        faint: 'var(--faint)',
        fill: 'var(--fill)',
        link: 'var(--link)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        rounded: ['var(--font-rounded)'],
        mono: ['var(--font-mono)'],
        hand: ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
};
