import shopify from 'vite-plugin-shopify'
import tailwindcss from '@tailwindcss/vite'

export default {
  // Files in public/ are copied verbatim into assets/ on build
  // (static theme images referenced via `asset_url`)
  publicDir: 'public',
  plugins: [
    shopify({ themeRoot: '.' }),
    tailwindcss(),
  ],
}
