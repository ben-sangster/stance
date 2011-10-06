var dmz =
   { ui:
      { button: require("dmz/ui/button")
      , consts: require('dmz/ui/consts')
      , event: require("dmz/ui/event")
      , graph: require("dmz/ui/graph")
      , inputDialog: require("dmz/ui/inputDialog")
      , label: require("dmz/ui/label")
      , layout: require("dmz/ui/layout")
      , loader: require('dmz/ui/uiLoader')
      , messageBox: require("dmz/ui/messageBox")
      , mainWindow: require('dmz/ui/mainWindow')
      , treeWidget: require("dmz/ui/treeWidget")
      , webview: require("dmz/ui/webView")
      , widget: require("dmz/ui/widget")
      }
   , data: require("dmz/runtime/data")
   , stance: require("stanceConst")
   , defs: require("dmz/runtime/definitions")
   , object: require("dmz/components/object")
   , objectType: require("dmz/runtime/objectType")
   , module: require("dmz/runtime/module")
   , message: require("dmz/runtime/messaging")
   , resources: require("dmz/runtime/resources")
   , time: require("dmz/runtime/time")
   , util: require("dmz/types/util")
   , time: require("dmz/runtime/time")
   }

   // UI Elements
   , wikiWidget = dmz.ui.loader.load("WikiForm.ui")
   , wikiViewer = wikiWidget.lookup("wikiWebView")

   // Variables
   , hil
   , userGroupHandle
   , Groups = {}
   , MainModule = { list: {}, highlight: function (str) { this.list[str] = true; } }
   ;

dmz.object.flag.observe(self, dmz.object.HILAttribute,
function (objHandle, attrHandle, value) {

   hil = objHandle;
   dmz.time.setTimer(self, function () {

      userGroupHandle = dmz.stance.getUserGroupHandle(hil);
   });
});

dmz.object.create.observe(self, function (objHandle, objType) {

   if (objType.isOfType(dmz.stance.GroupType)) { Groups[objHandle] = { handle: objHandle }; }
});

dmz.object.text.observe(self, dmz.stance.GroupWikiLinkHandle,
function (objHandle, attrHandle, newVal, oldVal) {

   if (Groups[objHandle]) { Groups[objHandle].wikiLink = newVal; }
});

dmz.module.subscribe(self, "main", function (Mode, module) {

   var list;

   if (Mode === dmz.module.Activate) {

      list = MainModule.list;
      MainModule = module;

      module.addPage
         ( "Resource"
         , wikiWidget
         , function () {

            wikiViewer.page().mainFrame().load(Groups[userGroupHandle].wikiLink);
         }
         , function () { wikiViewer.setHtml("<center><b>Loading...</b><center>"); }
         );
      if (list) { Object.keys(list).forEach(function (str) { module.highlight(str); }); }
   }
});

wikiViewer.setHtml("<center><b>Loading...</b><center>");