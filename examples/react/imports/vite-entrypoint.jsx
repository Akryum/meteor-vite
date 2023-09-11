import React from 'react';
const { createRoot } = require('react-dom/client');
import { Meteor } from 'meteor/meteor';
import { App } from './ui/App';

Meteor.startup(() => {
    const container = document.getElementById('react-target');
    const root = createRoot(container);
    root.render(<App />);
});