<template>
  <nav class="flex gap-4">
    <router-link :to="{ name: 'home' }">Home</router-link>
    <router-link :to="{ name: 'links-composition' }">Data (Composition)</router-link>
    <router-link :to="{ name: 'links-option' }">Data (Option)</router-link>
  </nav>
</template>