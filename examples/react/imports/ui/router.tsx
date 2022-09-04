import React from "react";
import ReactDOM from 'react-dom';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Home } from './Home';
import { App } from './App';

function render(Component: React.FunctionComponent) {
  ReactDOM.render(<App><Component/></App>, document.getElementById('app'));
}

FlowRouter.route('/', {
  name: 'home',
  action() {
    render(Home);
  }
});

FlowRouter.route('/async', {
  name: 'async',
  async action() {
    const { AsyncComp } = await import('./AsyncComp');
    render(AsyncComp);
  }
});
