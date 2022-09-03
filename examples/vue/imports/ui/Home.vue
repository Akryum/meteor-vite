<script setup lang="ts">
import { autorun } from './v-meteor'
import { LinksCollection } from '../api/links'

const links = autorun(() => LinksCollection.find({}).fetch()).result
</script>

<template>
  <div>
    <h1 class="text-2xl">Learn Meteor!</h1>
    <ul>
      <li
        v-for="link of links"
        :key="link._id"
      >
        <a :href="link.url" target="_blank" class="underline">
          {{ link.title }}
        </a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
h1 {
  color: #42b883;
}
</style>
