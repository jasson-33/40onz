import shopify from 'vite-plugin-shopify'
import tailwindcss from '@tailwindcss/vite'

export default {
  plugins: [
    shopify({ themeRoot: '.' }),
    tailwindcss(),
  ],
}
