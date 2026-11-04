<script setup lang="ts">
import { watch, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Extension, type JSONContent } from '@tiptap/vue-3'

const { t } = useI18n()

const props = defineProps<{
  noteId?: string
  initialContent?: JSONContent
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'update', payload: { content: JSONContent; plainText: string }): void
  (e: 'toggleToolbar'): void
}>()

const CustomShortcuts = Extension.create({
  name: 'customShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-x': () => this.editor.commands.toggleStrike(),
      'Mod-Shift-X': () => this.editor.commands.toggleStrike(),
      'Mod-Shift-7': () => this.editor.commands.toggleOrderedList(),
      'Mod-Shift-8': () => this.editor.commands.toggleBulletList(),
      'Mod-Shift-9': () => this.editor.commands.toggleTaskList()
    }
  }
})

const editor = useEditor({
  content: props.initialContent || { type: 'doc', content: [{ type: 'paragraph' }] },
  editable: props.editable ?? true,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] }
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TaskList,
    TaskItem.configure({
      nested: true
    }),
    Table.configure({
      resizable: true
    }),
    TableRow,
    TableHeader,
    TableCell,
    Image.configure({
      allowBase64: true,
      inline: false
    }),
    Placeholder.configure({
      placeholder: () => t('note.placeholder')
    }),
    CustomShortcuts
  ],
  editorProps: {
    handlePaste(view, event) {
      const items = event.clipboardData?.items
      if (!items || !props.noteId || !window.stikly) return false
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            event.preventDefault()
            const ext = file.type.split('/')[1] || 'png'
            file.arrayBuffer().then(async (buffer) => {
              const url = await window.stikly.saveImageBuffer(props.noteId!, buffer, ext)
              if (url && editor.value) {
                editor.value.chain().focus().setImage({ src: url }).run()
              }
            })
            return true
          }
        }
      }
      return false
    },
    handleDrop(view, event) {
      const files = event.dataTransfer?.files
      if (!files || files.length === 0 || !props.noteId || !window.stikly) return false
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.type.startsWith('image/')) {
          event.preventDefault()
          const ext = file.type.split('/')[1] || 'png'
          file.arrayBuffer().then(async (buffer) => {
            const url = await window.stikly.saveImageBuffer(props.noteId!, buffer, ext)
            if (url && editor.value) {
              editor.value.chain().focus().setImage({ src: url }).run()
            }
          })
          return true
        }
      }
      return false
    }
  },
  onUpdate: ({ editor }) => {
    emit('update', {
      content: editor.getJSON(),
      plainText: editor.getText()
    })
  }
})

// Watch for initialContent updates if loaded asynchronously
watch(
  () => props.initialContent,
  (newContent) => {
    if (editor.value && newContent && !editor.value.isFocused) {
      const isSame = JSON.stringify(editor.value.getJSON()) === JSON.stringify(newContent)
      if (!isSame) {
        editor.value.commands.setContent(newContent, false)
      }
    }
  }
)

function onWrapperClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target && !target.closest('button, input, select, a, table')) {
    if (editor.value && !editor.value.isFocused) {
      editor.value.commands.focus('end')
    }
  }
}

defineExpose({
  editor
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div
    class="note-editor-wrapper h-full flex-1 flex flex-col overflow-hidden text-sm cursor-text"
    @click="onWrapperClick"
  >
    <editor-content
      :editor="editor"
      class="flex-1 h-full overflow-y-auto px-3 py-2 outline-none cursor-text"
    />
  </div>
</template>

<style>
/* ProseMirror TipTap Custom Styles */
.note-editor-wrapper {
  height: 100%;
}

.note-editor-wrapper > div {
  height: 100%;
}

.ProseMirror {
  outline: none;
  min-height: 100%;
  cursor: text;
  user-select: text !important;
  -webkit-user-select: text !important;
}

.ProseMirror p.is-editor-empty:first-child::before {
  color: var(--note-fg);
  opacity: 0.4;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

/* Checklists */
ul[data-type="taskList"] {
  list-style: none;
  padding: 0;
  margin: 0.25rem 0;
}

ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  margin: 0.2rem 0;
}

ul[data-type="taskList"] li > label {
  flex: 0 0 auto;
  margin-right: 0.5rem;
  user-select: none;
  cursor: pointer;
}

ul[data-type="taskList"] li > label input[type="checkbox"] {
  cursor: pointer;
  accent-color: var(--note-fg);
}

ul[data-type="taskList"] li > div {
  flex: 1 1 auto;
}

ul[data-type="taskList"] li[data-checked="true"] > div {
  text-decoration: line-through;
  opacity: 0.55;
}

/* Bullet & ordered lists */
.ProseMirror ul:not([data-type="taskList"]) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}

.ProseMirror ol {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}

/* Tables */
.ProseMirror table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 0.5rem 0;
  overflow: hidden;
}

.ProseMirror td,
.ProseMirror th {
  min-width: 1em;
  border: 1px solid var(--note-fg);
  border-opacity: 0.25;
  padding: 3px 5px;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}

.ProseMirror th {
  font-weight: bold;
  text-align: left;
  background-color: rgba(0, 0, 0, 0.05);
}

/* Images */
.ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 0.25rem 0;
}
</style>
