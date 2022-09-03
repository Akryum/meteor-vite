<template>
  <nav class="flex gap-4">
    <router-link :to="{ name: 'home' }">Home</router-link>
    <router-link :to="{ name: 'async' }">Async</router-link>
  </nav>
  <router-view />
</template>
