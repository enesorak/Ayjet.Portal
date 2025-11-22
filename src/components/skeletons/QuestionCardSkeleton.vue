<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue';
</script>
<template>
  <div class="bg-white p-6 rounded-lg shadow space-y-4">
    <SkeletonLoader class="h-5 w-3/4" />
    <div class="space-y-3 pl-4">
      <SkeletonLoader class="h-4 w-1/2" />
      <SkeletonLoader class="h-4 w-1/2" />
      <SkeletonLoader class="h-4 w-1/2" />
      <SkeletonLoader class="h-4 w-1/2" />
    </div>
  </div>
</template>