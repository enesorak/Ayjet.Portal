// views/NotFound.vue
<template>
  <div class="not-found">
    <h1>404</h1>
    <h2>Sayfa Bulunamadı</h2>
    <p>Aradığınız sayfa mevcut değil.</p>
    <router-link to="/">Ana Sayfaya Dön</router-link>
  </div>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 50px;
}
.not-found h1 {
  font-size: 72px;
  color: #e74c3c;
}
</style>