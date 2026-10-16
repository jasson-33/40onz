/**
 * 40onz Theme — main JS entrypoint
 * Vanilla ES modules, no framework.
 */

// ── Announcement Bar ─────────────────────────────────────────────────
function initAnnouncementBar() {
  const bar = document.querySelector('[data-announcement-bar]')
  if (!bar) return

  const items = bar.querySelectorAll('[data-announcement-item]')
  if (items.length <= 1) return

  let current = 0
  items.forEach((item, i) => {
    item.style.transition = 'opacity 400ms ease, transform 400ms ease'
    item.style.opacity = i === 0 ? '1' : '0'
    item.style.position = i === 0 ? 'relative' : 'absolute'
    item.style.inset = '0'
  })

  setInterval(() => {
    items[current].style.opacity = '0'
    items[current].style.position = 'absolute'
    current = (current + 1) % items.length
    items[current].style.position = 'relative'
    items[current].style.opacity = '1'
  }, 4000)
}

// ── Mega Menu ─────────────────────────────────────────────────────────
function initMegaMenu() {
  const triggers = document.querySelectorAll('[data-mega-menu-trigger]')

  triggers.forEach((trigger) => {
    const menuId = trigger.getAttribute('data-mega-menu-trigger')
    const menu = document.querySelector(`[data-mega-menu="${menuId}"]`)
    if (!menu) return

    let closeTimer = null

    const open = () => {
      clearTimeout(closeTimer)
      menu.setAttribute('aria-hidden', 'false')
      menu.style.pointerEvents = 'auto'
      trigger.setAttribute('aria-expanded', 'true')
    }

    const close = () => {
      closeTimer = setTimeout(() => {
        menu.setAttribute('aria-hidden', 'true')
        menu.style.pointerEvents = 'none'
        trigger.setAttribute('aria-expanded', 'false')
      }, 150)
    }

    trigger.addEventListener('mouseenter', open)
    trigger.addEventListener('mouseleave', close)
    menu.addEventListener('mouseenter', () => clearTimeout(closeTimer))
    menu.addEventListener('mouseleave', close)

    // Keyboard: Enter/Space opens, Escape closes
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const isOpen = trigger.getAttribute('aria-expanded') === 'true'
        isOpen ? close() : open()
      }
      if (e.key === 'Escape') close()
    })
  })

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-mega-menu-trigger]') && !e.target.closest('[data-mega-menu]')) {
      document.querySelectorAll('[data-mega-menu]').forEach((m) => {
        m.setAttribute('aria-hidden', 'true')
        m.style.pointerEvents = 'none'
      })
      document.querySelectorAll('[data-mega-menu-trigger]').forEach((t) => {
        t.setAttribute('aria-expanded', 'false')
      })
    }
  })
}

// ── Mobile Nav ────────────────────────────────────────────────────────
function initMobileNav() {
  const toggle = document.querySelector('[data-mobile-nav-toggle]')
  const drawer = document.querySelector('[data-mobile-nav]')
  if (!toggle || !drawer) return

  toggle.addEventListener('click', () => {
    const isOpen = drawer.getAttribute('aria-hidden') === 'false'
    drawer.setAttribute('aria-hidden', isOpen ? 'true' : 'false')
    toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true')
    document.body.style.overflow = isOpen ? '' : 'hidden'
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.getAttribute('aria-hidden') === 'false') {
      drawer.setAttribute('aria-hidden', 'true')
      toggle.setAttribute('aria-expanded', 'false')
      document.body.style.overflow = ''
    }
  })
}

// ── Cart Drawer ───────────────────────────────────────────────────────
function initCartDrawer() {
  const drawer = document.querySelector('[data-cart-drawer]')
  const overlay = document.querySelector('[data-cart-overlay]')
  const openBtns = document.querySelectorAll('[data-cart-open]')
  const closeBtns = document.querySelectorAll('[data-cart-close]')
  if (!drawer) return

  const openCart = () => {
    drawer.setAttribute('aria-hidden', 'false')
    overlay?.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
    drawer.querySelector('[data-cart-close]')?.focus()
  }

  const closeCart = () => {
    drawer.setAttribute('aria-hidden', 'true')
    overlay?.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
  }

  openBtns.forEach((btn) => btn.addEventListener('click', openCart))
  closeBtns.forEach((btn) => btn.addEventListener('click', closeCart))
  overlay?.addEventListener('click', closeCart)

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart()
  })

  // AJAX add-to-cart
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-add-to-cart]')
    if (!form) return
    e.preventDefault()

    const btn = form.querySelector('[type="submit"]')
    btn?.setAttribute('disabled', 'true')

    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.querySelector('[name="id"]')?.value,
          quantity: form.querySelector('[name="quantity"]')?.value ?? 1,
        }),
      })
      if (!res.ok) throw new Error('add-to-cart failed')
      await refreshCart()
      openCart()
    } catch (err) {
      console.error('[cart]', err)
    } finally {
      btn?.removeAttribute('disabled')
    }
  })
}

async function refreshCart() {
  try {
    const res = await fetch('/cart?view=drawer', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
    const html = await res.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const incoming = doc.querySelector('[data-cart-drawer-inner]')
    const existing = document.querySelector('[data-cart-drawer-inner]')
    if (incoming && existing) existing.innerHTML = incoming.innerHTML

    // Update cart count badges
    const countEl = doc.querySelector('[data-cart-count]')
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = countEl?.textContent ?? '0'
    })
  } catch (err) {
    console.error('[cart refresh]', err)
  }
}

// ── Product Card Image Swap ───────────────────────────────────────────
function initImageSwap() {
  document.querySelectorAll('[data-product-card]').forEach((card) => {
    const primary = card.querySelector('[data-img-primary]')
    const hover = card.querySelector('[data-img-hover]')
    if (!primary || !hover) return

    hover.style.opacity = '0'
    hover.style.transition = 'opacity 300ms ease'
    primary.style.transition = 'opacity 300ms ease'

    card.addEventListener('mouseenter', () => {
      primary.style.opacity = '0'
      hover.style.opacity = '1'
    })
    card.addEventListener('mouseleave', () => {
      primary.style.opacity = '1'
      hover.style.opacity = '0'
    })
  })
}

// ── Editorial Carousel ────────────────────────────────────────────────
function initCarousel() {
  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('[data-carousel-track]')
    const prevBtn = carousel.querySelector('[data-carousel-prev]')
    const nextBtn = carousel.querySelector('[data-carousel-next]')
    if (!track) return

    let index = 0

    const slides = () => track.querySelectorAll('[data-carousel-slide]')
    const total = () => slides().length

    const goTo = (n) => {
      index = Math.max(0, Math.min(n, total() - 1))
      track.style.transform = `translateX(-${index * 100}%)`
      prevBtn?.toggleAttribute('disabled', index === 0)
      nextBtn?.toggleAttribute('disabled', index === total() - 1)
    }

    track.style.display = 'flex'
    track.style.transition = 'transform 500ms cubic-bezier(0.4,0,0.2,1)'
    slides().forEach((s) => { s.style.minWidth = '100%' })

    prevBtn?.addEventListener('click', () => goTo(index - 1))
    nextBtn?.addEventListener('click', () => goTo(index + 1))

    // Touch / swipe
    let startX = 0
    track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX }, { passive: true })
    track.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX
      if (Math.abs(dx) > 50) goTo(dx < 0 ? index + 1 : index - 1)
    })

    goTo(0)
  })
}

// ── Collection Tab Filter ─────────────────────────────────────────────
function initTabFilter() {
  document.querySelectorAll('[data-tab-group]').forEach((group) => {
    const tabs = group.querySelectorAll('[data-tab]')
    const panels = group.querySelectorAll('[data-tab-panel]')

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab')
        tabs.forEach((t) => t.setAttribute('aria-selected', t === tab ? 'true' : 'false'))
        panels.forEach((p) => {
          const show = p.getAttribute('data-tab-panel') === target
          p.setAttribute('aria-hidden', show ? 'false' : 'true')
          p.style.display = show ? '' : 'none'
        })
      })
    })

    // Activate first tab
    tabs[0]?.click()
  })
}

// ── Init ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initAnnouncementBar()
  initMegaMenu()
  initMobileNav()
  initCartDrawer()
  initImageSwap()
  initCarousel()
  initTabFilter()
})
