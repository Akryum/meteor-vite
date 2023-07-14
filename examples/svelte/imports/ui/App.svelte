<script lang="ts">
  import { Meteor } from "meteor/meteor";
  import { LinksCollection } from '../api/links';

  /**
   * Meteor tracker for Svelte
   * {@link https://github.com/rdb/svelte-meteor-data}
   */
  import { useTracker } from 'meteor/rdb:svelte-meteor-data';

  let counter = 0;
  const addToCounter = () => {
    counter += 1;
  }

  $: links = LinksCollection.find({});

  const remove = (linkId) => {
    Meteor.call('links.reverse-title', linkId)
  }
</script>


<div class="container">
  <h1>Welcome to Meteor!</h1>

  <button on:click={addToCounter}>Click Me</button>
  <p>You've pressed the button {counter} times.</p>

  <h2>Learn Meteor!</h2>
  {#await Meteor.subscribe('links.all')}
    <div>Waiting on links...</div>
  {:then}
    <ul>
      {#each $links as link (link._id)}
        <li>
          <a href={link.url} target="_blank" rel="noreferrer">{link.title}</a>
          <button on:click={() => { remove(link._id) }}>Reverse</button>
        </li>
      {/each}
    </ul>
  {/await}

  <h2>Typescript ready</h2>
  <p>Just add lang="ts" to .svelte components.</p>
</div>
