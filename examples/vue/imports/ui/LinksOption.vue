<script lang="ts">
import { defineComponent } from 'vue'
import { LinksCollection } from '/imports/api/links'

export default defineComponent({
  meteor: {
    $subscribe: {
      links: [],
    },

    links () {
      return LinksCollection.find({}).fetch()
    },
  },
})
</script>

<template>
  <div class="flex flex-col gap-4">
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
    <pre class="bg-gray-100 rounded p-4">{{ { $subReady } }}</pre>
  </div>
</template>

<style scoped>
h1 {
  color: #35495e;
}
</style>
  