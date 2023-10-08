//////////////////////////////////////////////////////////////////////////
//                                                                      //
// This is a generated file. You can view the original                  //
// source in your browser if your browser supports source maps.         //
// Source maps are supported by all recent versions of Chrome, Safari,  //
// and Firefox, and by Internet Explorer 11.                            //
//                                                                      //
//////////////////////////////////////////////////////////////////////////


(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var _subscribe;

var require = meteorInstall({"node_modules":{"meteor":{"rdb:svelte-meteor-data":{"index.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/rdb_svelte-meteor-data/index.js                                                      //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
let checkNpmVersions;
module.link("meteor/tmeasday:check-npm-versions", {
  checkNpmVersions(v) {
    checkNpmVersions = v;
  }
}, 0);
module.link("./use-tracker", {
  default: "useTracker"
}, 1);
module.link("./subscribe");
module.link("./autorun");
if (Meteor.isServer) {
  checkNpmVersions({
    'svelte': ">=3.25.0"
  }, 'rdb:svelte-meteor-data');
  // this require is here only to make sure we can validate the npm dependency above
  require("svelte/package.json");
}
if (Package['mongo']) {
  module.link("./cursor");
}
if (Package['reactive-var']) {
  module.link("./reactive-var");
}
if (Package['session'] && Meteor.isClient) {
  module.link("./use-session", {
    default: "useSession"
  }, 2);
}

// Import this last, since it overwrites the built-in Tracker.autorun
///////////////////////////////////////////////////////////////////////////////////////////////////

},"autorun.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/rdb_svelte-meteor-data/autorun.js                                                    //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
let Tracker;
module.link("meteor/tracker", {
  Tracker(v) {
    Tracker = v;
  }
}, 0);
let current_component, schedule_update, dirty_components;
module.link("svelte/internal", {
  current_component(v) {
    current_component = v;
  },
  schedule_update(v) {
    schedule_update = v;
  },
  dirty_components(v) {
    dirty_components = v;
  }
}, 1);
const _autorun = Tracker.autorun;
const _nonreactive = Tracker.nonreactive;
function svelteAwareAutorun(f, options) {
  const component = current_component;
  const computation = _autorun.apply(this, arguments);
  if (component) {
    // We're inside a Svelte component.  We have to stop the computation when
    // the component is destroyed.
    _autoStopComputation(computation, component);
  }
  return computation;
}
Tracker.autorun = svelteAwareAutorun;
Tracker.nonreactive = function nonreactive(f) {
  if (current_component) {
    // A Tracker.autorun inside a Tracker.nonreactive should behave normally,
    // without the special Svelte stuff.
    const prevAutorun = Tracker.autorun;
    Tracker.autorun = _autorun;
    try {
      return _nonreactive.apply(this, arguments);
    } finally {
      Tracker.autorun = prevAutorun;
    }
  } else {
    return _nonreactive.apply(this, arguments);
  }
};
function _autoStopComputation(computation, component) {
  const $$ = component.$$;
  $$.on_destroy.push(computation.stop.bind(computation));
  if (!$$.ctx) {
    // We're in initialization, so nothing else to do.
    return;
  }
  if ($$.fragment && $$.dirty[0] === -1) {
    // We have a fragment, but it's set to the initial dirty state, so we must
    // be in on onMount or so.  Don't do anything special, then.
    return;
  }

  // We are in a reactive Svelte update.  That means that we'll need to stop the
  // computation the next time that it is run.  But we don't know when that is,
  // because the next update may or may not hit this autorun again, depending on
  // the dirty flags.
  // So, we simply stop all computations the next time that the update is run,
  // but we keep listening for invalidations, so that if one of them becomes
  // invalid, we can force Svelte to re-run the updates to make it hit the
  // autorun again.

  // But first, remember which dirty flags made this autorun trigger, so that we
  // can reuse these bits to force Svelte to re-hit the autorun.
  // This will unfortunately most of the time be all bits set, since the first
  // time it is called is usually during initialization.  But if the autorun is
  // first enabled by a Svelte variable change, it will be a bit more efficient.
  computation._savedDirty = [...$$.dirty];
  if ($$._stopComputations) {
    $$._stopComputations.push(computation);
    return;
  }
  $$._stopComputations = [computation];

  // Temporary hook around the update function so that it stops our computation
  // the next time it is called.
  const _update = $$.update;
  $$.update = () => {
    // Optimization: are we about to rerun everything?  If so, don't bother with
    // onInvalidate, just stop the computations right here.
    if ($$.dirty.every(d => d === 0x7fffffff)) {
      $$._stopComputations.forEach(comp => comp.stop());
    } else {
      // Otherwise, we are not sure whether all the autorun blocks will run
      // again, so we prevent the computations from continuing to run, but will
      // continue to watch it for changes.  If there is a change, we require the
      // update to be run again.
      for (const comp of $$._stopComputations) {
        comp.stopped = true;
        comp.onInvalidate(() => {
          if ($$.dirty[0] === -1) {
            // We're the first to mark it dirty since the last update.
            dirty_components.push(component);
            schedule_update();
            $$.dirty.fill(0);
          }
          comp._savedDirty.forEach((mask, i) => {
            $$.dirty[i] |= mask & 0x7fffffff;
          });
        });
      }
    }

    // Leave everything as it was, so that the overhead is removed if the
    // Tracker.autorun was under a condition that has now becomes false.
    delete $$._stopComputations;
    $$.update = _update;
    return _update();
  };
}
///////////////////////////////////////////////////////////////////////////////////////////////////

},"cursor.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/rdb_svelte-meteor-data/cursor.js                                                     //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }
}, 0);
Mongo.Cursor.prototype.subscribe = function (set) {
  // Set the initial result directly, without going through the callbacks
  const mapFn = this._transform ? element => this._transform(this._projectionFn(element)) : element => this._projectionFn(element);
  let result = this._getRawObjects({
    ordered: true
  }).map(mapFn);
  const handle = this.observe({
    _suppress_initial: true,
    addedAt: (doc, i) => {
      result = [...result.slice(0, i), doc, ...result.slice(i)];
      set(result);
    },
    changedAt: (doc, old, i) => {
      result = [...result.slice(0, i), doc, ...result.slice(i + 1)];
      set(result);
    },
    removedAt: (old, i) => {
      result = [...result.slice(0, i), ...result.slice(i + 1)];
      set(result);
    },
    movedTo: (doc, from, to) => {
      result = [...result.slice(0, from), ...result.slice(from + 1)];
      result.splice(to, 0, doc);
      set(result);
    }
  });
  set(result);
  return handle.stop.bind(this);
};
///////////////////////////////////////////////////////////////////////////////////////////////////

},"reactive-var.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/rdb_svelte-meteor-data/reactive-var.js                                               //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
let ReactiveVar;
module.link("meteor/reactive-var", {
  ReactiveVar(v) {
    ReactiveVar = v;
  }
}, 0);
let nextId = 1;
ReactiveVar.prototype.subscribe = function subscribe(set) {
  const value = this.curValue;
  if (value !== undefined) {
    set(value);
  }
  const id = "svelte-".concat(nextId++);
  this.dep._dependentsById[id] = {
    _id: id,
    invalidate: () => {
      set(this.curValue);
    }
  };
  return () => {
    delete this.dep._dependentsById[id];
  };
};
///////////////////////////////////////////////////////////////////////////////////////////////////

},"subscribe.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/rdb_svelte-meteor-data/subscribe.js                                                  //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
let current_component;
module.link("svelte/internal", {
  current_component(v) {
    current_component = v;
  }
}, 0);
_subscribe = Meteor.subscribe;
Meteor.subscribe = function subscribe(name) {
  const params = Array.from(arguments);
  let callbacks = Object.create(null);
  if (params.length > 1) {
    // Preserve existing callbacks.
    const last = params[params.length - 1];
    if (last) {
      // Last arg may be specified as a function, or as an object
      if (typeof last === 'function') {
        callbacks.onReady = params.pop();
      } else if ([last.onReady, last.onError, last.onStop].some(f => typeof f === "function")) {
        callbacks = params.pop();
      }
    }
  }
  params.push(callbacks);
  let subscription;

  // Collect callbacks to call when subscription is ready or has errored.
  let readyCallbacks = [];
  let errorCallbacks = [];
  if (callbacks.onReady) {
    readyCallbacks.push(callbacks.onReady);
  }
  if (callbacks.onError) {
    errorCallbacks.push(callbacks.onError);
  }
  callbacks.onReady = () => {
    readyCallbacks.forEach(fn => fn(subscription));
    readyCallbacks.length = 0;
  };
  callbacks.onError = err => {
    errorCallbacks.forEach(fn => fn(err));
    errorCallbacks.length = 0;
  };
  subscription = _subscribe.apply(this, params);
  if (current_component) {
    current_component.$$.on_destroy.push(subscription.stop.bind(subscription));
  }
  subscription.then = (fn, err) => {
    if (subscription.ready()) {
      fn();
    } else {
      readyCallbacks.push(fn);
      err && errorCallbacks.push(err);
    }
  };
  return subscription;
};
///////////////////////////////////////////////////////////////////////////////////////////////////

},"use-session.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/rdb_svelte-meteor-data/use-session.js                                                //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.export({
  default: () => useSession
});
let Session;
module.link("meteor/session", {
  Session(v) {
    Session = v;
  }
}, 0);
let EJSON;
module.link("meteor/ejson", {
  EJSON(v) {
    EJSON = v;
  }
}, 1);
let nextId = 1;
const parse = serialized => serialized !== undefined && serialized !== 'undefined' ? EJSON.parse(serialized) : undefined;
function useSession(key, defaultValue) {
  if (arguments.length > 1) {
    Session.setDefault(key, defaultValue);
  }
  return {
    subscribe(set) {
      Session._ensureKey(key);
      const dep = Session.keyDeps[key];
      if (Object.prototype.hasOwnProperty.call(Session.keys, key)) {
        set(parse(Session.keys[key]));
      }
      const id = "svelte-session-".concat(nextId++);
      dep._dependentsById[id] = {
        _id: id,
        invalidate: () => {
          set(parse(Session.keys[key]));
        }
      };
      return () => {
        delete dep._dependentsById[id];
      };
    },
    set(value) {
      Session.set(key, value);
    }
  };
}
;
///////////////////////////////////////////////////////////////////////////////////////////////////

},"use-tracker.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/rdb_svelte-meteor-data/use-tracker.js                                                //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.export({
  default: () => useTracker
});
/**
 * This function wraps a reactive Meteor computation as a Svelte store.
 */

const nonreactive = Tracker.nonreactive;
const autorun = Tracker.autorun;
function useTracker(reactiveFn) {
  return {
    subscribe(set) {
      return nonreactive(() => {
        const computation = autorun(() => set(reactiveFn()));
        return computation.stop.bind(computation);
      });
    }
  };
}
;
///////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/rdb:svelte-meteor-data/index.js");

/* Exports */
Package._define("rdb:svelte-meteor-data", exports);

})();
