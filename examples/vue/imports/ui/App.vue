<script setup lang="ts">
import { autorun } from './v-meteor'
import { LinksCollection } from '../api/links'

const links = autorun(() => LinksCollection.find({}).fetch()).result
</script>

<template>
  <div>
    <h2>Learn Meteor!</h2>
    <ul>
      <li
        v-for="link of links"
        :key="link._id"
      >
        <a :href="link.url" target="_blank">
          {{ link.title }}
        </a>
      </li>
    </ul>
  </div>
</template>
