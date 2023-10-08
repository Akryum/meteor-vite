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
  const Meteor = Package.meteor.Meteor
  const global = Package.meteor.global
  const meteorEnv = Package.meteor.meteorEnv
  const meteorInstall = Package.modules.meteorInstall
  const Promise = Package.promise.Promise

  const require = meteorInstall({ node_modules: { meteor: { 'test:lazy': { 'index.js': function module(require, exports, module) {
    ///////////////////////////////////////////////////////////////////////
    //                                                                   //
    // packages/test_lazy/index.js                                       //
    //                                                                   //
    ///////////////////////////////////////////////////////////////////////
    //
    module.export({
      MEOWMEOW: () => MEOWMEOW,
    })
    const MEOWMEOW = 1
    ///////////////////////////////////////////////////////////////////////
  } } } } }, {
    extensions: [
      '.js',
      '.json',
    ],
  })

  /* Exports */
  Package._define('test:lazy')
})()
