<script setup>
import { Cookies } from 'meteor/ostrio:cookies'
import * as testModules from 'meteor/test:modules'

const cookies = new Cookies()
console.log('(vite) cookies', cookies.get('meteor_login_token'))

console.log('(vite) meteor/test:modules', testModules)
</script>

<template>
  <h1 class="text-3xl">Home</h1>
</template>
