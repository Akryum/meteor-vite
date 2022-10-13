<template>
  <nav class="flex gap-4 mb-4">
    <router-link :to="{ name: 'home' }">Home</router-link>
    <router-link :to="{ name: 'links-composition' }">Data (Composition)</router-link>
    <router-link :to="{ name: 'links-option' }">Data (Option)</router-link>
  </nav>
</template>

<style lang="postcss" scoped>
.router-link-active {
  color: #42b883;
}
</style>
