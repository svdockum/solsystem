<template>
  <div>
    <p v-if="rows.length === 0" class="text-center py-8 text-white/30 text-sm">
      No students scanned yet.
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="row in rows"
        :key="row.student_number"
        class="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-white/5"
      >
        <!-- Number above the times on a phone, beside them on wider screens -->
        <div class="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
          <span class="font-mono font-semibold text-base sm:w-32 sm:flex-shrink-0 truncate">
            {{ row.student_number }}
          </span>

          <div class="flex-1 min-w-0 space-y-1 text-sm">
          <div class="flex items-center gap-2">
            <span class="w-8 text-xs uppercase tracking-wider text-green-400/80 flex-shrink-0">In</span>
            <template v-if="row.enter">
              <span class="text-white/70 font-mono text-xs flex-shrink-0">{{ formatDateTime(row.enter.scanned_at) }}</span>
              <span v-if="moodOption(row.enter.mood)" class="truncate">
                {{ moodOption(row.enter.mood)!.emoji }} {{ moodOption(row.enter.mood)!.label }}
              </span>
            </template>
            <span v-else class="text-white/20">—</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-8 text-xs uppercase tracking-wider text-orange-400/80 flex-shrink-0">Out</span>
            <template v-if="row.leave">
              <span class="text-white/70 font-mono text-xs flex-shrink-0">{{ formatDateTime(row.leave.scanned_at) }}</span>
              <span v-if="ratingOption(row.leave.rating)" class="truncate">
                {{ ratingOption(row.leave.rating)!.emoji }} {{ ratingOption(row.leave.rating)!.label }}
              </span>
            </template>
            <span v-else class="text-white/20">—</span>
          </div>
          </div>
        </div>

        <button
          class="text-white/20 hover:text-red-400 transition-colors text-xs flex-shrink-0 px-1 py-0.5"
          title="Remove student"
          @click="$emit('remove', row.student_number)"
        >
          ✕
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { StudentScans } from '~/types'

defineProps<{
  rows: StudentScans[]
}>()

defineEmits<{
  remove: [studentNumber: string]
}>()
</script>
