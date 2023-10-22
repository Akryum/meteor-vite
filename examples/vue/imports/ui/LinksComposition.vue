<script setup lang="ts">
import { reactive } from 'vue'
import { autorun, subscribe, useMethod } from './v-meteor'
import { LinksCollection } from '/imports/api/links'

// Subscription

subscribe('links')

// Autorun

const links = autorun(() => LinksCollection.find({}).fetch()).result

// Method

const insertLinkForm = reactive({
  title: '',
  url: '',
})

const insertLinkMethod = useMethod<[url: string, link: string]>('links.insert')
insertLinkMethod.onResult((err) => {
  if (!err) {
    // Reset form
    insertLinkForm.title = ''
    insertLinkForm.url = ''
  }
})

async function insertLink() {
  await insertLinkMethod.call(insertLinkForm.title, insertLinkForm.url)
  console.log('done')
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <h1 class="text-2xl">
      Learn Meteor!
    </h1>

    <form class="flex gap-4" @submit.prevent="insertLink()">
      <input
        v-model="insertLinkForm.title"
        type="text"
        placeholder="Title"
        class="border border-gray-300 p-2 rounded"
      >
      <input
        v-model="insertLinkForm.url"
        type="text"
        placeholder="URL"
        class="border border-gray-300 p-2 rounded"
      >
      <button
        type="submit"
        :disabled="insertLinkMethod.pending.value"
        class="bg-blue-500 text-white p-2 rounded"
      >
        Submit
      </button>
    </form>

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
