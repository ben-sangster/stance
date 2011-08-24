require("datejs/date"); // www.datejs.com - an open-source JavaScript Date Library.

var dmz =
   { ui:
      { consts: require("dmz/ui/consts")
      , layout: require("dmz/ui/layout")
      , loader: require("dmz/ui/uiLoader")
      , mainWindow: require("dmz/ui/mainWindow")
      , graph: require("dmz/ui/graph")
      , event: require("dmz/ui/event")
      , label: require("dmz/ui/label")
      , button: require("dmz/ui/button")
      , tabWidget: require("dmz/ui/tabWidget")
      , webview: require("dmz/ui/webView")
      , widget: require("dmz/ui/widget")
      , textEdit: require("dmz/ui/textEdit")
      , lineEdit: require("dmz/ui/lineEdit")
      }
   , config: require("dmz/runtime/config")
   , defs: require("dmz/runtime/definitions")
   , object: require("dmz/components/object")
   , objectType: require("dmz/runtime/objectType")
   , module: require("dmz/runtime/module")
   , message: require("dmz/runtime/messaging")
   , resources: require("dmz/runtime/resources")
   , stance: require("stanceConst")
   , vector: require("dmz/types/vector")
   , time: require("dmz/runtime/time")
   , util: require("dmz/types/util")
   , sys: require("sys")
   }

   // UI Elements
//   , graphWindow = dmz.ui.loader.load("VoteAARForm.ui")
//   , graphWindowScene = -1
//   , graphicsView = graphWindow.lookup("aarGraphicsView")
//   , intervalAmtBox = graphWindow.lookup("intervalAmtBox")
//   , intervalTypeBox = graphWindow.lookup("intervalTypeBox")

//   , graphDialog = dmz.ui.loader.load("AARDialog.ui", graphWindow)
//   , scrollArea = graphDialog.lookup("scrollArea")
//   , scrollLayout = dmz.ui.layout.createVBoxLayout()

   , Window = dmz.ui.loader.load("VoteAARWindow.ui")
   , labelLayout = Window.lookup("labelLayout")
   , scrollArea = Window.lookup("scrollArea")
   , gridLayout = Window.lookup("widgetGrid")

   // Consts
   , HandleIndex = 0

   , Interval = { days: 1, weeks: 7 }

   // Variables
   , ShowWindowMessage = dmz.message.create(self.config.string("aarmessage.name"))
   , master = { votes: [], groups: [] }
   , widgetStack = []

   // Functions
   , resetGrid = function () { self.log.error ("Reset function not yet implemented"); }
   , getWidget = function () { self.log.error ("GetWidget not yet implemented"); }
   , setItemData = function () { self.log.error ("SetItemData not yet implemented"); }
   ;

getWidget = function () {

   var data = widgetStack.pop();

   if (!data) {

      data = { widget: dmz.ui.loader.load("VoteViewPost.ui") };
      data.userPictureLabel = voteItem.postItem.lookup("userPictureLabel");
      data.postedByLabel = voteItem.postItem.lookup("postedByLabel");
      data.startTimeLabel = voteItem.postItem.lookup("startTimeLabel");
      data.endTimeLabel = voteItem.postItem.lookup("endTimeLabel");
      data.questionLabel = voteItem.postItem.lookup("questionLabel");
      data.stateLabel = voteItem.postItem.lookup("stateLabel");
      data.yesVotesLabel = voteItem.postItem.lookup("yesVotesLabel");
      data.noVotesLabel = voteItem.postItem.lookup("noVotesLabel");
      data.undecidedVotesLabel = voteItem.postItem.lookup("undecidedVotesLabel");
      data.advisorPictureLabel = voteItem.postItem.lookup("advisorPictureLabel");
      data.advisorReasonLabel = voteItem.postItem.lookup("advisorReasonLabel");
   }

   return data;
};

Window.observe(self, "updateButton", "clicked", function () {

   var groupMap = {}
     ;
   resetGrid();
   master.votes.forEach(function (data) {

      if (!data.item) { data.item = getWidget(); }
      if (data.item && data.item.widget) {

         setItemData(data);
      }
   });

   master.votes.sort(function (obj1, obj2) {

      var startTime1
        , startTime2
        , result
        , returnVal
        ;

      if (obj1.state === dmz.stance.VOTE_DENIED) { startTime1 = obj1.postedTime || 0; }
      else { startTime1 = obj1.startTime; }
      if (obj2.state === dmz.stance.VOTE_DENIED) { startTime2 = obj2.postedTime || 0; }
      else { startTime2 = obj2.startTime; }

      result = startTime2 - startTime1;
      returnVal = result || 0;
      if (startTime1 === 0) { returnVal = -1; }
      else if (startTime2 === 0) { returnVal = 1; }

      return returnVal;
   });

   master.groups.forEach(function (groupHandle, index) {

      groupMap[groupHandle] = index;
      // Add group name to label layout
   });

   master.votes.forEach(function (data, element) {

      self.log.warn (element+":", data.handle);
      // add widget to (groupMap[data.group], NextHeightBasedOnInterval)
   });
});


