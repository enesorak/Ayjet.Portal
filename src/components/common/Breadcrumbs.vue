<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const breadcrumbs = computed(() => {
  const pathArray = [];
  let currentRoute = route;

  // Mevcut sayfadan başlayarak, parent'ları takip edip geriye doğru git
  while (currentRoute) {
    const routeRecord = router.getRoutes().find(r => r.name === currentRoute.name);
    if (routeRecord && routeRecord.meta.breadcrumb) {
      pathArray.push({
        text: routeRecord.meta.breadcrumb as string,
        to: { name: routeRecord.name, params: currentRoute.params }
      });
    }

    const parentName = routeRecord?.meta.parent as string | undefined;
    if (parentName) {
      const parentRoute = router.getRoutes().find(r => r.name === parentName);
      // Bir üst seviyeye çıkmak için yeni bir route objesi oluşturuyoruz
      currentRoute = { ...parentRoute, params: currentRoute.params } as any;
    } else {
      break; // Parent yoksa döngüyü bitir
    }
  }

  // Diziyi ters çevirip en başa Ana Sayfa'yı ekle
  const reversedCrumbs = pathArray.reverse();
  if (route.name !== 'home') {
    return [{ text: 'Ana Sayfa', to: '/' }, ...reversedCrumbs];
  }
  return reversedCrumbs;
});
</script>

<template>
  <nav v-if="breadcrumbs.length > 1" class="mb-6" aria-label="breadcrumb">
    <ol class="flex items-center space-x-2 text-sm">
      <li v-for="(crumb, index) in breadcrumbs" :key="index" class="flex items-center">
        <span v-if="index > 0" class="mx-2 text-gray-400">/</span>
        <RouterLink
            v-if="index < breadcrumbs.length - 1"
            :to="crumb.to"
            class="text-gray-500 hover:text-indigo-600"
        >
          {{ crumb.text }}
        </RouterLink>
        <span v-else class="font-semibold text-gray-700">
          {{ crumb.text }}
        </span>
      </li>
    </ol>
  </nav>
</template>