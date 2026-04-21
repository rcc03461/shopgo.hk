<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import TurndownService from 'turndown'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
  }>(),
  { placeholder: '請輸入內容…' },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const md = new MarkdownIt({ html: false, breaks: true, linkify: true })
const turndown = new TurndownService()
const htmlValue = ref('')
const syncing = ref(false)

onMounted(() => {
  htmlValue.value = md.render(props.modelValue || '')
})

watch(
  () => props.modelValue,
  (v) => {
    if (syncing.value) return
    const nextHtml = md.render(v || '')
    if (nextHtml !== htmlValue.value) htmlValue.value = nextHtml
  },
)

function onEditorUpdate(v: string) {
  htmlValue.value = v
  syncing.value = true
  emit('update:modelValue', turndown.turndown(v || ''))
  syncing.value = false
}
</script>

<template>
  <div class="rounded-md border border-neutral-300 bg-white p-2">
    <QuillEditor
      :content="htmlValue"
      content-type="html"
      theme="snow"
      toolbar="full"
      @update:content="onEditorUpdate"
    />
  </div>
</template>
