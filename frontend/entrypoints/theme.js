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
      trigger.setAttribute('aria-expanded', 'true')
      if (overlay) {
        overlay.setAttribute('aria-hidden', 'false')
      }
    }

    const close = () => {
      closeTimer = setTimeout(() => {
        menu.setAttribute('aria-hidden', 'true')
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

// ── Search Drawer ─────────────────────────────────────────────────────
function initSearchDrawer() {
  const drawer = document.querySelector('[data-search-drawer]')
  const overlay = document.querySelector('[data-search-overlay]')
  const openBtns = document.querySelectorAll('[data-search-open]')
  if (!drawer) return

  const input = drawer.querySelector('[data-search-input]')
  const list = drawer.querySelector('[data-search-results-list]')
  const empty = drawer.querySelector('[data-search-empty]')
  const viewAll = drawer.querySelector('[data-search-view-all]')

  const openSearch = () => {
    drawer.setAttribute('aria-hidden', 'false')
    overlay?.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
    setTimeout(() => input?.focus(), 350)
  }

  const closeSearch = () => {
    drawer.setAttribute('aria-hidden', 'true')
    overlay?.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
  }

  openBtns.forEach((btn) => btn.addEventListener('click', openSearch))
  drawer.querySelector('[data-search-close]')?.addEventListener('click', closeSearch)
  overlay?.addEventListener('click', closeSearch)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch()
  })

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

  const money = (value) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: window.Shopify?.currency?.active || 'USD',
    }).format(Number(value) || 0)

  const showState = (state) => {
    list.hidden = state !== 'results'
    empty.hidden = state !== 'empty'
    viewAll.hidden = state !== 'results'
  }

  let debounceTimer
  let controller
  const runSearch = async () => {
    const q = input.value.trim()
    if (q.length < 2) {
      showState('idle')
      list.innerHTML = ''
      return
    }
    controller?.abort()
    controller = new AbortController()
    try {
      const res = await fetch(
        `/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=6`,
        { signal: controller.signal },
      )
      if (!res.ok) throw new Error(`search failed: ${res.status}`)
      const data = await res.json()
      const products = data?.resources?.results?.products ?? []
      if (!products.length) {
        showState('empty')
        list.innerHTML = ''
        return
      }
      list.innerHTML = products
        .map((p) => {
          const imgUrl = typeof p.featured_image === 'string' ? p.featured_image : p.featured_image?.url
          const img = imgUrl
            ? `<img src="${imgUrl}&width=160" alt="" width="56" height="70" class="w-14 h-[70px] object-cover bg-[#eee]">`
            : '<span class="w-14 h-[70px] bg-[#eee] shrink-0"></span>'
          return `
            <li>
              <a href="${p.url}" class="flex items-center gap-4 group">
                ${img}
                <span class="flex flex-col gap-1 min-w-0">
                  <span class="text-[11px] tracking-[0.12em] uppercase truncate group-hover:text-[#c9a96e] transition-colors duration-200">${esc(p.title)}</span>
                  <span class="text-[10px] tracking-[0.08em] uppercase text-[#6b6b6b]">${money(p.price)}</span>
                </span>
              </a>
            </li>`
        })
        .join('')
      viewAll.href = `/search?q=${encodeURIComponent(q)}`
      showState('results')
    } catch (err) {
      if (err.name !== 'AbortError') console.error('[search]', err)
    }
  }

  input?.addEventListener('input', () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(runSearch, 250)
  })

  input?.addEventListener('keydown', (e) => {
    const q = input.value.trim()
    if (e.key === 'Enter' && q) {
      window.location.href = `/search?q=${encodeURIComponent(q)}`
    }
  })

  drawer.querySelector('[data-search-reset]')?.addEventListener('click', () => {
    input.value = ''
    list.innerHTML = ''
    showState('idle')
    input.focus()
  })
}

// ── YouTube ambient loop — seeks before the end so the related-videos ──
//    end-screen never renders. Requires data-yt-ambient + enablejsapi=1.
function initAmbientYoutube() {
  const iframes = document.querySelectorAll('iframe[data-yt-ambient]')
  if (!iframes.length) return

  const END_GUARD_S = 0.5
  const boot = () => {
    iframes.forEach((iframe) => {
      const reveal = () => iframe.classList.remove('opacity-0')
      setTimeout(reveal, 6000) // fallback if the API state never arrives
      new YT.Player(iframe, {
        events: {
          onStateChange: (e) => {
            // reveal only once playing is underway — hides the startup chrome flash
            if (e.data === YT.PlayerState.PLAYING) setTimeout(reveal, 1)
          },
          onReady: (e) => {
            const player = e.target
            setInterval(() => {
              // Resume if anything pauses it — a paused player shows the
              // control overlay we can't hide from outside the iframe
              if (player.getPlayerState?.() === YT.PlayerState.PAUSED) {
                player.playVideo()
              }
              const duration = player.getDuration?.()
              const current = player.getCurrentTime?.()
              if (duration > 0 && duration - current < END_GUARD_S) {
                player.seekTo(0, true)
              }
            }, 250)
          },
        },
      })
    })
  }

  if (window.YT?.Player) {
    boot()
  } else {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      boot()
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }
}

// ── Product Card Image Swap ───────────────────────────────────────────
function initImageSwap(root = document) {
  root.querySelectorAll('[data-product-card]').forEach((card) => {
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

  const update = () => {
    const scrolled = window.scrollY > 50
    header.style.setProperty('--header-h', scrolled ? '100px' : '140px')
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

// ── Featured Products Horizontal Row ───────────────────────────────────
function initProductRows() {
  document.querySelectorAll('[data-products-row]').forEach((row) => {
    const track = row.querySelector('[data-products-track]')
    const prevBtn = row.querySelector('[data-products-prev]')
    const nextBtn = row.querySelector('[data-products-next]')
    if (!track || !prevBtn || !nextBtn) return

    const scrollByCard = (dir) => {
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
  const category = document.querySelector('[data-category-url]')
  if (!category) return
  const filterToggle = document.querySelector('[data-filter-toggle]')
  const filterSidebar = document.querySelector('[data-filter-sidebar]')
  const filterClose = document.querySelector('[data-filter-close]')
  const filterPanel = filterSidebar?.querySelector('.filter-sidebar-panel')
  const checkboxes = document.querySelectorAll('[data-material-checkbox]')
  const grid = document.querySelector('[data-product-grid]')
  const loadMoreBtn = category.querySelector('[data-load-more]')
  const countEl = category.querySelector('[data-product-count]')
  if (!filterToggle || !filterSidebar || !grid || !loadMoreBtn || !countEl) return

  const pageSize = Number(category.dataset.pageSize) || 12
  let nextUrl = category.dataset.categoryUrl
  let pending = []
  let total = 0
  let loading = false
  const selectedMaterials = () => Array.from(checkboxes)
    .filter((cb) => cb.checked && cb.dataset.materialCheckbox !== 'all')
    .map((cb) => cb.dataset.materialCheckbox)

  const updateView = () => {
    const materials = selectedMaterials()
    grid.querySelectorAll('li[data-material]').forEach((item) => {
      item.hidden = materials.length > 0 &&
        !item.dataset.material.split(',').some((tag) => materials.includes(tag.trim().toLowerCase()))
    })
    const visible = grid.querySelectorAll('li[data-material]:not([hidden])').length
    countEl.textContent = `${materials.length ? visible : total} PRODUCTS`
    loadMoreBtn.hidden = loading || (!pending.length && !nextUrl)
  }

  const fetchPage = async () => {
    const response = await fetch(nextUrl)
    if (!response.ok) throw new Error(`Category request failed: ${response.status}`)
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
    const source = doc.querySelector('[data-collection-grid]')
    if (!source) throw new Error('Category products grid not found')
    total = Number(doc.querySelector('[data-collection-count]')?.dataset.collectionCount) || 0
    pending.push(...Array.from(source.querySelectorAll('li[data-material]')))
    const next = doc.querySelector('[data-collection-next]')
    nextUrl = next ? new URL(next.getAttribute('href'), window.location.origin).href : null
  }

  const loadMore = async () => {
    if (loading) return
    loading = true
    loadMoreBtn.hidden = true
    try {
      while (pending.length < pageSize && nextUrl) await fetchPage()
      const items = pending.splice(0, pageSize)
      if (items.length) grid.querySelector('li:not([data-material])')?.remove()
      items.forEach((item) => grid.appendChild(item))
      items.forEach((item) => initImageSwap(item))
      if (!items.length) grid.innerHTML = '<li class="col-span-full text-center text-[#6b6b6b] py-20">No products found in this category.</li>'
    } catch (error) {
      console.error('[category]', error)
      if (!grid.children.length) grid.innerHTML = '<li class="col-span-full text-center text-[#6b6b6b] py-20">Unable to load products. Please try again.</li>'
    } finally {
      loading = false
      updateView()
    }
  }
  loadMoreBtn.addEventListener('click', loadMore)
  loadMore()

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
      if (checkbox === allCheckbox && checkbox.checked) {
        checkboxes.forEach(cb => {
          if (cb !== allCheckbox) cb.checked = false
        })
      } else if (checkbox !== allCheckbox && checkbox.checked) {
        allCheckbox.checked = false
      }

      updateView()
    })
  })
}

// ── OOAK Archive — sold/available filter + renumber ───────────────────
function initOoakArchive() {
  document.querySelectorAll('[data-ooak-archive]').forEach((archive) => {
    const tabs = archive.querySelectorAll('[data-ooak-tab]')
    const items = archive.querySelectorAll('li[data-availability]')
    if (!tabs.length || !items.length) return

    let active = null

    const apply = () => {
      let visible = 0
      items.forEach((item) => {
        const show = !active || item.dataset.availability === active
        item.hidden = !show
        if (show) {
          visible += 1
          const num = item.querySelector('[data-ooak-num]')
          if (num) num.textContent = `${String(visible).padStart(2, '0')}.`
        }
      })
      tabs.forEach((tab) => {
        tab.setAttribute('aria-selected', tab.dataset.ooakTab === active ? 'true' : 'false')
      })
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        active = active === tab.dataset.ooakTab ? null : tab.dataset.ooakTab
        apply()
      })
    })
  })
}

// ── Collections page — infinite scroll per unit ───────────────────────
// Each [data-collections-unit] grid lazy-loads the next page of its
// collection from /collections/<handle>?view=grid&page=N when the
// sentinel scrolls into view, until the grid template drops data-grid-next.
function initCollectionsInfinite() {
  document.querySelectorAll('[data-collections-unit]').forEach((unit) => {
    const sentinel = unit.querySelector('[data-unit-sentinel]')
    const grid = unit.querySelector('[data-unit-grid]')
    const collectionUrl = unit.dataset.collectionUrl
    let nextPage = Number(unit.dataset.nextPage) || 2
    if (!sentinel || !grid || !collectionUrl) return

    let loading = false
    let observer = null

    const loadNext = async () => {
      if (loading) return
      loading = true
      try {
        const response = await fetch(`${collectionUrl}?view=grid&page=${nextPage}`)
        if (!response.ok) throw new Error(`Grid request failed: ${response.status}`)
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
        const items = doc.querySelectorAll('[data-collection-grid] > li')
        items.forEach((item) => {
          grid.appendChild(item)
          initImageSwap(item)
        })
        nextPage += 1
        if (!doc.querySelector('[data-grid-next]')) {
          observer?.disconnect()
          sentinel.remove()
        }
      } catch (error) {
        console.error('[collections]', error)
        observer?.disconnect()
        const retry = document.createElement('button')
        retry.type = 'button'
        retry.textContent = 'Load More'
        retry.className = 'block mx-auto mt-8 px-8 py-3 border border-[#2a2a2a] text-xs tracking-widest uppercase text-[#111] hover:bg-[#111] hover:text-white transition-colors duration-200'
        retry.addEventListener('click', () => {
          retry.remove()
          watch()
          loadNext()
        })
        sentinel.insertAdjacentElement('afterend', retry)
      } finally {
        loading = false
      }
    }

    const watch = () => {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) loadNext()
        },
        { rootMargin: '600px' },
      )
      observer.observe(sentinel)
    }
    watch()
  })
}

function initCollectionLoadMore() {
  const collection = document.querySelector('[data-collection-count]')
  const grid = collection?.querySelector('[data-collection-grid]')
  if (!grid) return

  collection.addEventListener('click', async (event) => {
    const next = event.target.closest('[data-collection-next]')
    if (!next) return
    event.preventDefault()
    if (next.dataset.loading) return
    next.dataset.loading = 'true'
    next.textContent = 'Loading...'

    try {
      const response = await fetch(next.href)
      if (!response.ok) throw new Error(`Collection request failed: ${response.status}`)
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
      const source = doc.querySelector('[data-collection-grid]')
      if (!source) throw new Error('Collection grid not found')
      source.querySelectorAll('li').forEach((item) => {
        grid.appendChild(item)
        initImageSwap(item)
      })
      const following = doc.querySelector('[data-collection-next]')
      if (following) {
        next.href = new URL(following.getAttribute('href'), window.location.origin).href
        next.textContent = 'Load More'
      } else {
        next.remove()
      }
    } catch (error) {
      console.error('[collection]', error)
      next.textContent = 'Retry Load More'
    } finally {
      delete next.dataset.loading
    }
  })

  // Infinite scroll — the next-page link doubles as the sentinel; it is
  // removed by the click handler when the last page is reached
  const sentinel = collection.querySelector('[data-collection-next]')
  if (sentinel) {
    new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) sentinel.click()
      },
      { rootMargin: '600px' },
    ).observe(sentinel)
  }
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
      sizeChartDrawer.setAttribute('aria-hidden', 'false')
      sizeChartOpenBtn.setAttribute('aria-expanded', 'true')
      document.body.style.overflow = 'hidden'
      sizeChartCloseBtn.focus()
    }

    const closeSizeChart = () => {
      sizeChartDrawer.classList.remove('opacity-100')
      sizeChartDrawer.classList.add('pointer-events-none')
      sizeChartPanel.classList.add('translate-x-full')
      sizeChartPanel.classList.remove('translate-x-0')
      sizeChartDrawer.setAttribute('aria-hidden', 'true')
      sizeChartOpenBtn.setAttribute('aria-expanded', 'false')
      document.body.style.overflow = ''
      sizeChartOpenBtn.focus()
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
  const optionSelects = document.querySelectorAll('[data-product-option]')
  const variantIdInput = document.querySelector('input[name="id"]')
  const skuDisplay = document.getElementById('product-sku')

  if (optionSelects.length > 0 && variantIdInput) {
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

    optionSelects.forEach((select) => {
      select.addEventListener('change', () => {
        const selectedOptions = Array.from(optionSelects, (option) => option.value)
        const selectedDisplay = document.getElementById(`option-${Number(select.dataset.optionIndex) + 1}-selected`)
        if (selectedDisplay) selectedDisplay.textContent = select.value

        const matchingVariant = variants.find((variant) =>
          variant.options.every((value, index) => value === selectedOptions[index]))
        const addToCartBtn = document.querySelector('[data-add-to-cart] button')
        if (matchingVariant) {
          variantIdInput.value = matchingVariant.id
          if (skuDisplay) {
            skuDisplay.textContent = matchingVariant.sku || 'N/A'
          }

          // Update price
          const priceSpan = document.querySelector('[data-product-price]')
          if (priceSpan) priceSpan.textContent = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: window.Shopify?.currency?.active || 'USD',
          }).format(matchingVariant.price / 100)

          if (addToCartBtn) {
            addToCartBtn.disabled = !matchingVariant.available
            addToCartBtn.textContent = matchingVariant.available ? 'Choose Options' : 'Sold Out'
          }
        } else {
          variantIdInput.value = ''
          if (addToCartBtn) {
            addToCartBtn.disabled = true
            addToCartBtn.textContent = 'Unavailable'
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
  initSearchDrawer()
  initAmbientYoutube()
  initImageSwap()
  initHeaderScroll()
  initScrollReveal()
  initMediaStrip()
  initProductRows()
  initCategoryFilter()
  initCollectionLoadMore()
  initCollectionsInfinite()
  initOoakArchive()
  initProductPage()
})
