// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import FrameDialog from '../FrameDialog.vue'
import type { Frame } from '~/services/storage/types'

function makeFrame(overrides: Partial<Frame> = {}): Frame {
  return {
    id: 'frame_test',
    title: 'Rain on the crossing',
    anime: 'Kagerou Line',
    episode: 'EP 04',
    timestamp: '00:12:41',
    tags: ['rain'],
    note: 'Window light.',
    favorite: false,
    width: 1600,
    height: 900,
    src: '/frames/frame_001.png',
    capturedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('FrameDialog', () => {
  it('renders nothing while no frame is selected', () => {
    const wrapper = mount(FrameDialog, {
      props: { frame: null, hasPrev: false, hasNext: false },
    })

    expect(wrapper.find('.dialog').exists()).toBe(false)
  })

  it('announces itself as a modal dialog and shows the frame detail', () => {
    const wrapper = mount(FrameDialog, {
      props: { frame: makeFrame(), hasPrev: true, hasNext: true },
    })

    const dialog = wrapper.find('.dialog')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('role')).toBe('dialog')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.attributes('aria-label')).toContain('Frame detail:')

    expect(wrapper.find('.dialog__title').text()).toBe('Rain on the crossing')
    expect(wrapper.text()).toContain('Kagerou Line')
    expect(wrapper.text()).toContain('Window light.')
  })

  it('closes on Escape and steps with the arrow keys', async () => {
    const wrapper = mount(FrameDialog, {
      props: { frame: makeFrame(), hasPrev: true, hasNext: true },
    })
    const dialog = wrapper.find('.dialog')

    await dialog.trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('close')).toHaveLength(1)

    await dialog.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('navigate')?.[0]).toEqual([1])

    await dialog.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('navigate')?.[1]).toEqual([-1])
  })

  it('does not step past the ends of the list', async () => {
    const wrapper = mount(FrameDialog, {
      props: { frame: makeFrame(), hasPrev: false, hasNext: false },
    })
    const dialog = wrapper.find('.dialog')

    await dialog.trigger('keydown', { key: 'ArrowRight' })
    await dialog.trigger('keydown', { key: 'ArrowLeft' })

    expect(wrapper.emitted('navigate')).toBeUndefined()
  })

  it('toggles the favorite from the caption button', async () => {
    const wrapper = mount(FrameDialog, {
      props: { frame: makeFrame({ favorite: false }), hasPrev: false, hasNext: false },
    })

    const fav = wrapper.find('.dialog__fav')
    expect(fav.attributes('aria-pressed')).toBe('false')

    await fav.trigger('click')
    expect(wrapper.emitted('toggle-favorite')?.[0]).toEqual(['frame_test'])
  })
})