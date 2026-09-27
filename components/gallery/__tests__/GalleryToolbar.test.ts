// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import GalleryToolbar from '../GalleryToolbar.vue'
import type { FrameFilters } from '~/composables/useFrames'

function makeFilters(overrides: Partial<FrameFilters> = {}): FrameFilters {
  return { query: '', anime: '', favoritesOnly: false, sort: 'newest', ...overrides }
}

function mountToolbar(filters = makeFilters(), hasActiveFilters = false) {
  return mount(GalleryToolbar, {
    props: { filters, animes: ['Kagerou Line', 'Higan Shore'], hasActiveFilters },
  })
}

describe('GalleryToolbar', () => {
  it('emits a query patch as the visitor types', async () => {
    const wrapper = mountToolbar()

    await wrapper.find('#gallery-search').setValue('rain')

    expect(wrapper.emitted('update')?.[0]).toEqual([{ query: 'rain' }])
  })

  it('toggles favorites and reflects state through aria-pressed', async () => {
    const wrapper = mountToolbar()
    const fav = wrapper.find('.toolbar__fav-toggle')
    expect(fav.attributes('aria-pressed')).toBe('false')

    await fav.trigger('click')
    expect(wrapper.emitted('update')?.[0]).toEqual([{ favoritesOnly: true }])
  })

  it('emits an anime filter patch from the series select', async () => {
    const wrapper = mountToolbar()

    await wrapper.find('#gallery-anime').setValue('Higan Shore')

    expect(wrapper.emitted('update')?.[0]).toEqual([{ anime: 'Higan Shore' }])
  })

  it('hides reset without active filters and emits reset when shown', async () => {
    const inactive = mountToolbar()
    expect(inactive.find('.toolbar__reset').exists()).toBe(false)

    const active = mountToolbar(makeFilters({ query: 'rain' }), true)
    expect(active.find('.toolbar__reset').exists()).toBe(true)

    await active.find('.toolbar__reset').trigger('click')
    expect(active.emitted('reset')).toHaveLength(1)
  })
})