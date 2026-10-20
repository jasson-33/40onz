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
  const overlay = document.querySelector('[data-mega-menu-overlay]')

  const closeAll = () => {
    document.querySelectorAll('[data-mega-menu]').forEach((menuEl) => {
      menuEl.setAttribute('aria-hidden', 'true')
      menuEl.style.pointerEvents = 'none'
    })
    document.querySelectorAll('[data-mega-menu-trigger]').forEach((triggerEl) => {
      triggerEl.setAttribute('aria-expanded', 'false')
    })
    if (overlay) {
      overlay.setAttribute('aria-hidden', 'true')
    }
  }

  triggers.forEach((trigger) => {
    const menuId = trigger.getAttribute('data-mega-menu-trigger')
    const menu = document.querySelector(`[data-mega-menu="${menuId}"]`)
    if (!menu) return

    let closeTimer = null

    const open = () => {
      clearTimeout(closeTimer)
      closeAll()
      menu.setAttribute('aria-hidden', 'false')
      menu.style.pointerEvents = 'auto'
      trigger.setAttribute('aria-expanded', 'true')
      if (overlay) {
        overlay.setAttribute('aria-hidden', 'false')
      }
    }

    const close = () => {
      closeTimer = setTimeout(() => {
        menu.setAttribute('aria-hidden', 'true')
        menu.style.pointerEvents = 'none'
        trigger.setAttribute('aria-expanded', 'false')
        const hasOpenMenu = Array.from(document.querySelectorAll('[data-mega-menu]')).some(
          (menuEl) => menuEl.getAttribute('aria-hidden') === 'false',
        )
        if (overlay && !hasOpenMenu) {
          overlay.setAttribute('aria-hidden', 'true')
        }
      }, 320)
    }

    trigger.addEventListener('mouseenter', open)
    trigger.addEventListener('mouseleave', close)
    menu.addEventListener('mouseenter', () => clearTimeout(closeTimer))
    menu.addEventListener('mouseleave', close)

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const isOpen = trigger.getAttribute('aria-expanded') === 'true'
        isOpen ? close() : open()
      }
      if (e.key === 'Escape') close()
    })
  })

  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-mega-menu-trigger]') && !e.target.closest('[data-mega-menu]')) {
      closeAll()
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

// ── Header scroll shrink & logo swap ───────────────────────────────────
function initHeaderScroll() {
  const header = document.querySelector('[data-header]')
  if (!header) return

  const logoDefault = header.querySelector('[data-logo-default]')
  const logoScrolled = header.querySelector('[data-logo-scrolled]')
  const overlay = document.querySelector('[data-mega-menu-overlay]')

  const update = () => {
    const scrolled = window.scrollY > 50
    header.style.setProperty('--header-h', scrolled ? '100px' : '140px')
    if (overlay) {
      overlay.style.top = `calc(var(--header-h, 140px) - 8px)`
    }
    if (logoDefault && logoScrolled) {
      logoDefault.classList.toggle('opacity-0', scrolled)
      logoScrolled.classList.toggle('opacity-0', !scrolled)
    }
  }

  window.addEventListener('scroll', update, { passive: true })
  update()
}

// ── Manifesto word-by-word scroll reveal ──────────────────────────────
function initScrollReveal() {
  document.querySelectorAll('[data-scroll-reveal]').forEach((section) => {
    const words = section.querySelectorAll('[data-reveal-word]')
    const bg = section.querySelector('[data-reveal-bg]')
    if (words.length === 0) return

    const update = () => {
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      // progress 0 → 1 across the pinned scroll distance (section height - viewport)
      const progress = Math.min(1, Math.max(0, -rect.top / (rect.height - vh)))
      const lit = Math.floor(progress * words.length)
      words.forEach((w, i) => {
        w.style.opacity = i < lit ? '1' : '0.25'
      })
      if (bg) bg.style.transform = `translateY(${(progress - 0.5) * -12}%) scale(1.15)`
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
  })
}

// ── Media Strip ───────────────────────────────────────────────────────
function initMediaStrip() {
  document.querySelectorAll('[data-strip-track]').forEach((track) => {
    const wrap = track.closest('.group\\/strip') || track.parentElement
    const prevBtn = wrap.querySelector('[data-strip-prev]')
    const nextBtn = wrap.querySelector('[data-strip-next]')
    const step = () => {
      const first = track.querySelector('li')
      return first ? first.getBoundingClientRect().width : track.clientWidth * 0.5
    }
    prevBtn?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }))
    nextBtn?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }))
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
          if (show) {
            const track = p.querySelector('[data-products-track]')
            track?.scrollTo({ left: 0, behavior: 'smooth' })
          }
        })
      })
    })

    // Activate first tab
    tabs[0]?.click()
  })
}

// ── Featured Products Horizontal Row ───────────────────────────────────
function initProductRows() {
  document.querySelectorAll('[data-tab-group]').forEach((group) => {
    const prevBtn = group.querySelector('[data-products-prev]')
    const nextBtn = group.querySelector('[data-products-next]')
    if (!prevBtn || !nextBtn) return

    const activeTrack = () =>
      group.querySelector('[data-tab-panel][aria-hidden="false"] [data-products-track]')

    const scrollByCard = (dir) => {
      const track = activeTrack()
      if (!track) return
      const firstCard = track.querySelector('li')
      const step = firstCard ? firstCard.getBoundingClientRect().width + 24 : track.clientWidth * 0.8
      track.scrollBy({ left: dir * step, behavior: 'smooth' })
    }

    prevBtn.addEventListener('click', () => scrollByCard(-1))
    nextBtn.addEventListener('click', () => scrollByCard(1))
  })
}

// ── Category Material Filter ─────────────────────────────────────────────
function initCategoryFilter() {
  const filterToggle = document.querySelector('[data-filter-toggle]')
  const filterSidebar = document.querySelector('[data-filter-sidebar]')
  const filterClose = document.querySelector('[data-filter-close]')
  const filterPanel = filterSidebar?.querySelector('.filter-sidebar-panel')
  const checkboxes = document.querySelectorAll('[data-material-checkbox]')
  const grid = document.querySelector('[data-product-grid]')
  
  if (!filterToggle || !filterSidebar || !grid) return

  filterToggle.addEventListener('click', (e) => {
    e.preventDefault()
    filterSidebar.classList.add('opacity-100')
    filterSidebar.classList.remove('pointer-events-none')
    if (filterPanel) {
      filterPanel.classList.remove('translate-x-full')
      filterPanel.classList.add('translate-x-0')
    }
  })

  filterClose.addEventListener('click', () => {
    filterSidebar.classList.remove('opacity-100')
    filterSidebar.classList.add('pointer-events-none')
    if (filterPanel) {
      filterPanel.classList.add('translate-x-full')
      filterPanel.classList.remove('translate-x-0')
    }
  })

  filterSidebar.addEventListener('click', (e) => {
    if (e.target === filterSidebar) {
      filterSidebar.classList.remove('opacity-100')
      filterSidebar.classList.add('pointer-events-none')
      if (filterPanel) {
        filterPanel.classList.add('translate-x-full')
        filterPanel.classList.remove('translate-x-0')
      }
    }
  })

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const allCheckbox = document.querySelector('[data-material-checkbox="all"]')
      const checked = Array.from(checkboxes).filter(cb => cb.checked && cb !== allCheckbox).map(cb => cb.getAttribute('data-material-checkbox'))

      if (checkbox === allCheckbox && checkbox.checked) {
        checkboxes.forEach(cb => {
          if (cb !== allCheckbox) cb.checked = false
        })
      } else if (checkbox !== allCheckbox && checkbox.checked) {
        allCheckbox.checked = false
      }

      const items = grid.querySelectorAll('li')
      items.forEach((item) => {
        const itemMaterial = item.getAttribute('data-material') || 'all'
        const show = allCheckbox.checked || checked.length === 0 || checked.includes(itemMaterial)
        item.style.display = show ? '' : 'none'
      })
      
      const countEl = document.querySelector('[data-product-count]')
      if (countEl) {
        const visibleCount = Array.from(items).filter(li => li.style.display !== 'none').length
        countEl.textContent = visibleCount + ' PRODUCTS'
      }
    })
  })
}

// ── Category Load More ─────────────────────────────────────────────────
function initLoadMore() {
  const loadMoreBtn = document.querySelector('[data-load-more]')
  const grid = document.querySelector('[data-product-grid]')
  if (!loadMoreBtn || !grid) return

  const productsPerPage = 12
  let currentPage = 1

  loadMoreBtn.addEventListener('click', () => {
    const hiddenItems = grid.querySelectorAll('.load-more-hidden')
    if (hiddenItems.length === 0) {
      loadMoreBtn.style.display = 'none'
      return
    }

    const currentMaterial = document.querySelector('[data-material-filter][aria-selected="true"]')?.getAttribute('data-material-filter') || 'all'
    let shown = 0

    hiddenItems.forEach((item) => {
      if (shown >= productsPerPage) return
      const itemMaterial = item.getAttribute('data-material') || 'all'
      if (currentMaterial === 'all' || itemMaterial === currentMaterial) {
        item.style.display = ''
        item.classList.remove('load-more-hidden')
        shown++
      }
    })

    currentPage++
    const remaining = grid.querySelectorAll('.load-more-hidden').length
    if (remaining === 0) {
      loadMoreBtn.style.display = 'none'
    }
  })
}

// ── Product Page ──────────────────────────────────────────────────────
function initProductPage() {
  // Size chart drawer
  const sizeChartDrawer = document.querySelector('[data-size-chart-drawer]')
  const sizeChartOpenBtn = document.querySelector('[data-size-chart-open]')
  const sizeChartCloseBtn = document.querySelector('[data-size-chart-close]')
  const sizeChartPanel = sizeChartDrawer?.querySelector('.size-chart-panel')

  if (sizeChartDrawer && sizeChartOpenBtn && sizeChartCloseBtn && sizeChartPanel) {
    const openSizeChart = () => {
      sizeChartDrawer.classList.add('opacity-100')
      sizeChartDrawer.classList.remove('pointer-events-none')
      sizeChartPanel.classList.remove('translate-x-full')
      sizeChartPanel.classList.add('translate-x-0')
      document.body.style.overflow = 'hidden'
    }

    const closeSizeChart = () => {
      sizeChartDrawer.classList.remove('opacity-100')
      sizeChartDrawer.classList.add('pointer-events-none')
      sizeChartPanel.classList.add('translate-x-full')
      sizeChartPanel.classList.remove('translate-x-0')
      document.body.style.overflow = ''
    }

    sizeChartOpenBtn.addEventListener('click', openSizeChart)
    sizeChartCloseBtn.addEventListener('click', closeSizeChart)
    sizeChartDrawer.addEventListener('click', (e) => {
      if (e.target === sizeChartDrawer) closeSizeChart()
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sizeChartDrawer.classList.contains('opacity-100')) {
        closeSizeChart()
      }
    })
  }

  // Accordion toggles
  document.querySelectorAll('[data-accordion-toggle]').forEach((toggle) => {
    const content = toggle.nextElementSibling
    if (!content || !content.hasAttribute('data-accordion-content')) return

    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true'
      toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true')
      content.classList.toggle('hidden', isOpen)
    })
  })

  // Quantity selector
  const quantityInput = document.querySelector('input[name="quantity"]')
  const minusBtn = document.querySelector('[data-quantity-minus]')
  const plusBtn = document.querySelector('[data-quantity-plus]')

  if (quantityInput && minusBtn && plusBtn) {
    minusBtn.addEventListener('click', () => {
      const current = parseInt(quantityInput.value, 10)
      if (current > 1) quantityInput.value = current - 1
    })

    plusBtn.addEventListener('click', () => {
      const current = parseInt(quantityInput.value, 10)
      quantityInput.value = current + 1
    })
  }

  // Variant selection
  const variantButtons = document.querySelectorAll('[data-option-value]')
  const variantIdInput = document.querySelector('input[name="id"]')
  const skuDisplay = document.getElementById('product-sku')

  if (variantButtons.length > 0 && variantIdInput) {
    // Build variant map
    const productData = document.querySelector('[data-product-json]')
    let variants = []
    if (productData) {
      try {
        variants = JSON.parse(productData.textContent).variants
      } catch (e) {
        console.error('[product] Failed to parse product data', e)
      }
    }

    variantButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const optionIndex = parseInt(btn.getAttribute('data-option-index'), 10)
        const optionValue = btn.getAttribute('data-option-value')

        // Update button states
        const sameOptionButtons = document.querySelectorAll(`[data-option-index="${optionIndex}"]`)
        sameOptionButtons.forEach((b) => {
          const isSelected = b.getAttribute('data-option-value') === optionValue
          b.classList.toggle('bg-[#f5f5f5]', isSelected)
          b.classList.toggle('text-[#111]', isSelected)
          b.classList.toggle('text-[#6b6b6b]', !isSelected)
        })

        // Update selected value display
        const selectedDisplay = document.getElementById(`option-${optionIndex + 1}-selected`)
        if (selectedDisplay) {
          selectedDisplay.textContent = optionValue
        }

        // Find matching variant
        const selectedOptions = {}
        document.querySelectorAll('[data-option-index]').forEach((b) => {
          if (b.classList.contains('bg-[#f5f5f5]')) {
            const idx = parseInt(b.getAttribute('data-option-index'), 10)
            selectedOptions[idx] = b.getAttribute('data-option-value')
          }
        })

        const matchingVariant = variants.find((v) => {
          return v.options.every((opt, i) => opt === selectedOptions[i])
        })

        if (matchingVariant) {
          variantIdInput.value = matchingVariant.id
          if (skuDisplay) {
            skuDisplay.textContent = matchingVariant.sku || 'N/A'
          }

          // Update price
          const priceEl = document.querySelector('.text-lg')
          if (priceEl) {
            const priceSpan = priceEl.querySelector('span:first-child')
            if (priceSpan) {
              priceSpan.textContent = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(matchingVariant.price / 100)
            }
          }

          // Update button state
          const addToCartBtn = document.querySelector('[data-add-to-cart] button')
          if (addToCartBtn) {
            addToCartBtn.disabled = !matchingVariant.available
            addToCartBtn.textContent = matchingVariant.available ? 'Choose Options' : 'Sold Out'
          }
        }
      })
    })
  }
}

// ── Init ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initAnnouncementBar()
  initMegaMenu()
  initMobileNav()
  initCartDrawer()
  initImageSwap()
  initHeaderScroll()
  initScrollReveal()
  initMediaStrip()
  initTabFilter()
  initProductRows()
  initCategoryFilter()
  initLoadMore()
  initProductPage()
})
