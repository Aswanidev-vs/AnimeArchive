// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import UploadForm, { type UploadFormModel } from '../UploadForm.vue'

function makeModel(overrides: Partial<UploadFormModel> = {}): UploadFormModel {
  return {
    title: '',
    anime: '',
    episode: '',
    tagsText: '',
    note: '',
    ...overrides,
  }
}

function mountForm(model = makeModel(), disabled = false) {
  return mount(UploadForm, {
    props: { model, disabled, submitLabel: 'Add to the archive' },
  })
}

describe('UploadForm', () => {
  it('numbers every field with slate codes 01–05', () => {
    const wrapper = mountForm()

    const codes = wrapper.findAll('.form__num').map((node) => node.text())
    expect(codes).toEqual(['01', '02', '03', '04', '05'])
  })

  it('emits a partial model patch when the title changes', async () => {
    const wrapper = mountForm()

    await wrapper.find('#up-title').setValue('Rain on the crossing')

    expect(wrapper.emitted('update:model')?.[0]).toEqual([
      { title: 'Rain on the crossing' },
    ])
  })

  it('emits submit when the form is submitted', async () => {
    const wrapper = mountForm()

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('emits cancel and reset-form from the secondary buttons', async () => {
    const wrapper = mountForm()

    await wrapper.find('.form__secondary').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)

    await wrapper.find('.form__secondary--quiet').trigger('click')
    expect(wrapper.emitted('reset-form')).toHaveLength(1)
  })

  it('disables the submit button while the parent says so', () => {
    const wrapper = mountForm(makeModel(), true)

    expect(wrapper.find('.form__submit').attributes('disabled')).toBeDefined()
  })
})