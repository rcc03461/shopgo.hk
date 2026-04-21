<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

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

const ClientMilkdownEditor = defineAsyncComponent(
  () => import('./AdminFormWysiwygEditor.client.vue'),
)
</script>

<template>
  <ClientOnly>
    <ClientMilkdownEditor
      :model-value="props.modelValue"
      :placeholder="props.placeholder"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <template #fallback>
      <textarea
        :value="props.modelValue"
        rows="14"
        class="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm shadow-sm"
        :placeholder="props.placeholder"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      />
    </template>
  </ClientOnly>
</template>
