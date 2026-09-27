// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import FrameCard from '../FrameCard.vue'
import type { Frame } from '~/services/storage/types'

function makeFrame(overrides: Partial<Frame> = {}): Frame {
  return {
    id: 'frame_test',
    title: 'Rain on the crossing',
    anime: 'Kagerou Line',
    episode: 'EP 04',
    timestamp: '00:12:41',
    tags: ['rain', 'city'],
    note: '',
    favorite: false,
    width: 1600,
    height: 900,
    src: '/frames/frame_001.png',
    capturedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('FrameCard', () => {
  it('renders the title and series / episode / timecode meta', () => {
    const wrapper = mount(FrameCard, { props: { frame: makeFrame() } })

    expect(wrapper.find('.frame__title').text()).toBe('Rain on the crossing')
    expect(wrapper.find('.frame__anime').text()).toBe('Kagerou Line')
    expect(wrapper.find('.frame__episode').text()).toBe('EP 04')
    expect(wrapper.find('.frame__time').text()).toBe('00:12:41')
  })

  it('emits open with the frame when the still is clicked', async () => {
    const frame = makeFrame()
    const wrapper = mount(FrameCard, { props: { frame } })

    await wrapper.find('.frame__open').trigger('click')

    const emitted = wrapper.emitted('open')
    expect(emitted).toHaveLength(1)
    expect(emitted?.[0]).toEqual([frame])
  })

  it('exposes favorite state via aria-pressed and emits the toggle', async () => {
    const wrapper = mount(FrameCard, { props: { frame: makeFrame({ favorite: true }) } })

    const fav = wrapper.find('.frame__fav')
    expect(fav.attributes('aria-pressed')).toBe('true')
    expect(fav.attributes('aria-label')).toContain('Remove')

    await fav.trigger('click')
    expect(wrapper.emitted('toggle-favorite')?.[0]).toEqual(['frame_test'])
  })

  it('burns the timecode into the still as a decorative overlay', () => {
    const wrapper = mount(FrameCard, { props: { frame: makeFrame() } })

    const burnin = wrapper.find('.frame__burnin')
    expect(burnin.exists()).toBe(true)
    expect(burnin.text()).toContain('00:12:41')
    expect(burnin.attributes('aria-hidden')).toBe('true')
  })

  it('omits the burn-in overlay when there is no timestamp', () => {
    const wrapper = mount(FrameCard, { props: { frame: makeFrame({ timestamp: '' }) } })
    expect(wrapper.find('.frame__burnin').exists()).toBe(false)
  })
})