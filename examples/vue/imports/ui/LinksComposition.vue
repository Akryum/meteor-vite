<script setup lang="ts">
import { reactive } from 'vue'
import { subscribe, autorun, useMethod } from './v-meteor'
import { LinksCollection } from '/imports/api/links'

// Subscription

subscribe('links')

// Autorun

const links = autorun(() => LinksCollection.find({}).fetch()).result

// Method

const insertLinkMethod = useMethod<[url: string, link: string]>('links.insert')
insertLinkMethod.onResult((err) => {
  if (!err) {
    // Reset form
    insertLinkForm.title = ''
    insertLinkForm.url = ''
  }
})

const insertLinkForm = reactive({
  title: '',
  url: '',
})

async function insertLink () {
  await insertLinkMethod.call(insertLinkForm.title, insertLinkForm.url)
  console.log('done')
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <h1 class="text-2xl">Learn Meteor!</h1>

    <form @submit.prevent="insertLink()" class="flex gap-4">
      <input
        type="text"
        v-model="insertLinkForm.title"
        placeholder="Title"
        class="border border-gray-300 p-2 rounded"
      />
      <input
        type="text"
        v-model="insertLinkForm.url"
        placeholder="URL"
        class="border border-gray-300 p-2 rounded"
      />
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
