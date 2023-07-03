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
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"test:modules":{"index.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/test_modules/index.js                                    //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
module.export({
  A: () => A,
  foo: () => foo,
  a: () => a,
  b: () => b
});
module.link("meteor/meteor", {
  Meteor: "MyMeteor"
}, 0);
module.link("meteor/tracker", {
  "*": "*"
}, 1);
module.link("./other", {
  default: "ReExportedDefault",
  other: "other",
  subOther: "subOther"
}, 2);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }
}, 3);
const A = 'A';
function foo() {
  return 'bar';
}
const a = 1;
const b = 2;
module.exportDefault(foo);
Meteor.version;
///////////////////////////////////////////////////////////////////////

},"other.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/test_modules/other.js                                    //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
module.export({
  other: () => other
});
module.link("./sub-other", {
  subOther: "subOther"
}, 0);
const defaultExport = 'default export';
module.exportDefault(defaultExport);
const other = 'other';
///////////////////////////////////////////////////////////////////////

},"sub-other.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/test_modules/sub-other.js                                //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
module.export({
  subOther: () => subOther
});
const subOther = 'sub other';
///////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/test:modules/index.js");

/* Exports */
Package._define("test:modules", exports);

})();
