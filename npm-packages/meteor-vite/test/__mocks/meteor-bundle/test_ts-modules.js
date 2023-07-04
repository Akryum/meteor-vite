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

var require = meteorInstall({"node_modules":{"meteor":{"test:ts-modules":{"explicit-relative-path.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/test_ts-modules/explicit-relative-path.ts                                                      //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  ExplicitRelativePath: () => ExplicitRelativePath
});
const ExplicitRelativePath = 'this should be imported as "meteor/test:ts-modules/explicit-relative-path"';
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/test_ts-modules/index.ts                                                                       //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
!function (module1) {
  module1.export({
    first: () => first,
    FIRST: () => FIRST,
    b: () => b,
    c: () => c,
    namedFunction: () => namedFunction
  });
  module1.link("meteor/meteor", {
    Meteor: "MyMeteor"
  }, 0);
  module1.link("meteor/tracker", {
    "*": "*"
  }, 1);
  module1.link("meteor/meteor", {
    Meteor: "ReExportedMeteor"
  }, 2);
  let Meteor;
  module1.link("meteor/meteor", {
    Meteor(v) {
      Meteor = v;
    }
  }, 3);
  module1.link("./relative-module", {
    NamedRelativeInteger: "NamedRelativeInteger"
  }, 4);
  module1.link("./export-star-from", {
    "*": "*"
  }, 5);
  module1.link("./subdirectory/module-in-subdirectory", {
    WhereAmI: "WhereIsTheSubmodule"
  }, 6);
  const first = 'lowercase';
  const FIRST = 'UPPERCASE';
  /**
   * Check export bracket exports
   */
  const b = 2;
  const c = 3;
  function namedFunction() {
    return 'bar';
  }
  module1.exportDefault(namedFunction);
  Meteor.version;
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"export-star-from.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/test_ts-modules/export-star-from.ts                                                            //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  ExportXInteger: () => ExportXInteger,
  ExportXString: () => ExportXString,
  ExportXObject: () => ExportXObject
});
const ExportXInteger = 1;
const ExportXString = 'foo';
const ExportXObject = {
  key: 'value'
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"re-exports-index.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/test_ts-modules/re-exports-index.ts                                                            //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.link("./re-exports-source", {
  DefaultReExport: "default",
  NamedReExport: "NamedReExport"
}, 0);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"re-exports-source.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/test_ts-modules/re-exports-source.ts                                                           //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  DefaultReExport: () => DefaultReExport,
  NamedReExport: () => NamedReExport
});
const DefaultReExport = 'DefaultReExport';
const NamedReExport = 'NamedReExport';
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"relative-module.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/test_ts-modules/relative-module.ts                                                             //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  NamedRelativeInteger: () => NamedRelativeInteger
});
const NamedRelativeInteger = 1;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"subdirectory":{"module-in-subdirectory.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                         //
// packages/test_ts-modules/subdirectory/module-in-subdirectory.ts                                         //
//                                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                           //
module.export({
  WhereAmI: () => WhereAmI
});
const WhereAmI = 'I am in a subdirectory!';
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json",
    ".ts"
  ]
});

require("/node_modules/meteor/test:ts-modules/explicit-relative-path.ts");
var exports = require("/node_modules/meteor/test:ts-modules/index.ts");

/* Exports */
Package._define("test:ts-modules", exports);

})();
