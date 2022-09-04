<script setup>
import { Cookies } from 'meteor/ostrio:cookies'

const cookies = new Cookies()
console.log('(vite) cookies', cookies.get('meteor_login_token'))
</script>

<template>
  <h1 class="text-3xl">Home</h1>
</template>
