/** @type {import('tailwindcss').Config} */
import projectConfig from './project.config.js'

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  important: `.${projectConfig.wrapperClass}`,
  corePlugins: {
    preflight: false,
  },
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
