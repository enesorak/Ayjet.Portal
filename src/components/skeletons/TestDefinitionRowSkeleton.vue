<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue';
</script>

<template>
  <tr>
    <td class="px-6 py-4">
      <SkeletonLoader class="h-4 w-3/4" />
    </td>
    <td class="px-6 py-4">
      <SkeletonLoader class="h-4 w-1/2" />
    </td>
    <td class="px-6 py-4">
      <SkeletonLoader class="h-4 w-full" />
    </td>
  </tr>
</template>