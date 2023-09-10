import { Meteor } from 'meteor/meteor';
import { LinksCollection } from '/imports/api/links';
import { WebAppInternals } from 'meteor/webapp';
import { getConfig } from 'meteor/jorgenvatle:vite-bundler/loading/vite-connection-handler';

async function insertLink({ title, url }) {
  await LinksCollection.insertAsync({ title, url, createdAt: new Date() });
}

Meteor.startup(async () => {
  // If the Links collection is empty, add some data.
  if (await LinksCollection.find().countAsync() === 0) {
    await insertLink({
      title: 'Do the Tutorial',
      url: 'https://www.meteor.com/tutorials/react/creating-an-app',
    });

    await insertLink({
      title: 'Follow the Guide',
      url: 'https://guide.meteor.com',
    });

    await insertLink({
      title: 'Read the Docs',
      url: 'https://docs.meteor.com',
    });

    await insertLink({
      title: 'Discussions',
      url: 'https://forums.meteor.com',
    });
  }

  // We publish the entire Links collection to all clients.
  // In order to be fetched in real-time to the clients
  Meteor.publish("links", function () {
    return LinksCollection.find();
  });
});

if (Meteor.isDevelopment) {
  WebAppInternals.registerBoilerplateDataCallback('react-preamble', (request, data) => {
    const { host, port } = getConfig();
    data.dynamicHead = data.dynamicHead || '';
    data.dynamicHead += `
<script type="module">
  import RefreshRuntime from "http://${host}:${port}/@react-refresh"
  RefreshRuntime.injectIntoGlobalHook(window)
  window.$RefreshReg$ = () => {}
  window.$RefreshSig$ = () => (type) => type
  window.__vite_plugin_react_preamble_installed__ = true
</script>
    `
  })
}
