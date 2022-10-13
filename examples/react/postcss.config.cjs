module.exports = {
  plugins: [
    require('tailwindcss/nesting'),
    require('tailwindcss')('./tailwind.config.cjs'),
    require('autoprefixer'),
  ],
}
