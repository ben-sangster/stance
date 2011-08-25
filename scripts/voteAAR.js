require("datejs/date"); // www.datejs.com - an open-source JavaScript Date Library.

var dmz =
   { ui:
      { consts: require("dmz/ui/consts")
      , loader: require("dmz/ui/uiLoader")
      , layout: require("dmz/ui/layout")
      , label: require("dmz/ui/label")
      , graph: require("dmz/ui/graph")
      , messageBox: require("dmz/ui/messageBox")
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

   // Consts
   , TIMEFORMAT = "MM/dd hh:mmtt"

   // UI Elements
   , Window = dmz.ui.loader.load("VoteAARWindow.ui")
   , labelLayout = Window.lookup("labelLayout")
   , scrollArea = Window.lookup("scrollArea")
   , gridLayout = dmz.ui.layout.createGridLayout(scrollArea.widget())

   // Variables
   , ShowWindowMessage = dmz.message.create(self.config.string("aarmessage.name"))
   , master = { votes: [], groups: [], game: false }
   , widgetStack = []
   , labelList = []
   , ShowWindowMessage = dmz.message.create(self.config.string("aarmessage.name"))
   , AvatarDefault = dmz.ui.graph.createPixmap(dmz.resources.findFile("AvatarDefault"))

   // Functions
   , resetGrid = function () { self.log.error ("Reset function not yet implemented"); }
   , setupVote = function () { self.log.error ("SetupVote not yet implemented"); }
   , setItemData = function () { self.log.error ("SetItemData not yet implemented"); }
   , getPixmap
   ;

ShowWindowMessage.subscribe(self, function () { Window.show(); });

getPixmap = function (handle) {

   var pic =
      dmz.ui.graph.createPixmap(
         dmz.resources.findFile(dmz.object.text(handle, dmz.stance.PictureHandle)));

   return pic || AvatarDefault;
};

setupVote = function (data) {

   var item = widgetStack.pop();
   if (!item) {

      item = { widget: dmz.ui.loader.load("VoteAARPost.ui") };
      item.userPictureLabel = item.widget.lookup("userPictureLabel");
      item.postedByLabel = item.widget.lookup("postedByLabel");
      item.startTimeLabel = item.widget.lookup("startTimeLabel");
      item.endTimeLabel = item.widget.lookup("endTimeLabel");
      item.questionLabel = item.widget.lookup("questionLabel");
      item.stateLabel = item.widget.lookup("stateLabel");
      item.yesVotesLabel = item.widget.lookup("yesVotesLabel");
      item.noVotesLabel = item.widget.lookup("noVotesLabel");
      item.undecidedVotesLabel = item.widget.lookup("undecidedVotesLabel");
      item.advisorPictureLabel = item.widget.lookup("advisorPictureLabel");
      item.advisorReasonLabel = item.widget.lookup("advisorReasonLabel");
      item.advisorNameLabel = item.widget.lookup("advisorNameLabel");
      item.advisorTitleLabel = item.widget.lookup("advisorTitleLabel");
   }

   if (!data.handle) { widgetStack.push(item); }
   else {

      data.item = item;
      if (!data.author) {

         data.author = (dmz.object.subLinks(data.handle, dmz.stance.CreatedByHandle) || [])[0];
      }
      if (!data.advisor) {

         data.advisor = (dmz.object.subLinks(data.handle, dmz.stance.VoteLinkHandle) || [])[0];
      }
      if (!data.group) {

         data.group = (dmz.object.subLinks(data.handle, dmz.stance.VoteGroupHandle) || [])[0];
         // Legacy testing
         if (!data.group) {

            data.group = dmz.stance.getUserGroupHandle(data.author);
         }
      }
      if (!data.decision) {

         data.decision = (dmz.object.superLinks(data.handle, dmz.stance.VoteLinkHandle) || [])[0];
      }
      data.yes = dmz.object.subLinks(data.decision, dmz.stance.YesHandle) || [];
      data.no = dmz.object.subLinks(data.decision, dmz.stance.NoHandle) || [];
      data.undecided = dmz.object.superLinks(data.group, dmz.stance.GroupMembersHandle) || [];
      if (!data.task) { data.task = dmz.object.text(data.handle, dmz.stance.TextHandle); }
      if (!data.reason) { data.reason = dmz.object.text(data.decision, dmz.stance.TextHandle); }
      if (!data.state) { data.state = dmz.object.scalar(data.handle, dmz.stance.VoteState); }
      if (!data.startTime) {

         if (data.state === dmz.stance.VOTE_DENIED) {

            data.startTime = dmz.object.timeStamp(data.handle, dmz.stance.CreatedAtServerTimeHandle);
         }
         else {

            data.startTime = dmz.object.timeStamp(data.decision, dmz.stance.CreatedAtServerTimeHandle);
        }
      }
      if (!data.endTime) {

         data.endTime = dmz.object.timeStamp(data.decision, dmz.stance.EndedAtServerTimeHandle);
      }

      item.userPictureLabel.pixmap(getPixmap(data.author));
      item.postedByLabel.text("<b>Posted by:</b> " + dmz.stance.getDisplayName(data.author));
      item.startTimeLabel.text(
         "<b>Start: </b>" + dmz.util.timeStampToDate(data.startTime).toString(TIMEFORMAT));
      item.endTimeLabel.text(
         "<b>End: </b>" +
         (data.endTime ?
            dmz.util.timeStampToDate(data.endTime).toString(TIMEFORMAT) :
            " - "));
      item.questionLabel.text("<b>Question: </b>" + data.task);
      item.stateLabel.text("<b>Result:</b> " + dmz.stance.STATE_STR[data.state]);
      item.advisorPictureLabel.pixmap(getPixmap(data.advisor).scaled(25, 25));
      item.advisorNameLabel.text(dmz.stance.getDisplayName(data.advisor));
      item.advisorTitleLabel.text(dmz.object.text(data.advisor, dmz.stance.TitleHandle));
      item.advisorReasonLabel.text("<b>Reason:</b> " + data.reason);
      item.yesVotesLabel.text("<b>Y: </b>" + data.yes.length);
      item.noVotesLabel.text("<b>N: </b>" + data.no.length);
      item.undecidedVotesLabel.text(
         "<b>U: </b>" + (data.undecided.length - data.no.length - data.yes.length));

      if (data.state === dmz.stance.VOTE_NO) {

         data.item.widget.styleSheet("* { background-color: rgb(240, 70, 70); }");
      }
      else if (data.state === dmz.stance.VOTE_YES) {

         data.item.widget.styleSheet("* { background-color: rgb(70, 240, 70); }");
      }
      else if (data.state === dmz.stance.VOTE_DENIED) {

         data.item.widget.styleSheet("* { background-color: rgb(70, 70, 70); color: white; }");
      }
   }
};


Window.observe(self, "updateButton", "clicked", function () {

   var completedVotes
     , currentTime
     , gridIndex = 1
     , groupMap = {}
     ;

   self.log.warn ("GridLayout:", gridLayout);
   resetGrid();
   master.votes.forEach(setupVote);
   self.log.warn (dmz.stance.VOTE_DENIED, dmz.stance.VOTE_YES, dmz.stance.VOTE_NO);
   completedVotes = master.votes.filter(function (data) {

      var result =
         data.state &&
         ((data.state === dmz.stance.VOTE_DENIED) ||
            (data.state === dmz.stance.VOTE_YES) ||
            (data.state === dmz.stance.VOTE_NO));
      return result;
   });
   if (completedVotes.length !== master.votes.length) {

      dmz.ui.messageBox.create(
         { type: dmz.ui.messageBox.Warning
         , text: "Warning! There are " + (master.votes.length - completedVotes.length) + " active votes in simulation."
         , informativeText: "Any active votes will NOT appear in this window."
         , standardButtons: [dmz.ui.messageBox.Ok]
         , defaultButton: dmz.ui.messageBox.Ok
         }
         , Window
         ).open(self, function () {});
   }

   completedVotes.sort(function (obj1, obj2) { return obj1.startTime - obj2.startTime; });
   master.groups.forEach(function (group) {

      groupMap[group.handle] = group.index;
      if (labelList[group.index]) {

         labelList[group.index].text(dmz.stance.getDisplayName(group.handle));
      }
   });

   currentTime = completedVotes[0] ? completedVotes[0].startTime : 0;
   self.log.warn ("CurrentTime:", currentTime);
   completedVotes.forEach(function (data, element) {

      self.log.warn (element+":", data.handle, data.startTime);
      if (!data.group) { self.log.error(data.handle, "has no group"); }
      else if (!data.startTime) { self.log.error(data.handle, "has no time"); }
      else {

         if (data.startTime > currentTime) { gridIndex += 1; }
         self.log.warn ("Add:", data.handle, gridIndex, groupMap[data.group]);
         gridLayout.addWidget(data.item.widget, gridIndex, groupMap[data.group]);
         data.item.widget.show();
      }
   });
   gridLayout.property("spacing", 0);
   gridLayout.margins(0);
});

dmz.object.create.observe(self, function (handle, type) {

   var label
     , obj
     ;
   if (type.isOfType(dmz.stance.VoteType)) { master.votes.push({ handle: handle }); }
   else if (type.isOfType(dmz.stance.GroupType)) {

      obj = { handle: handle, index: master.groups.length };
      label = dmz.ui.label.create("");
      labelList.push(label);
      master.groups.push(obj);
//      labelLayout.addWidget(label);
      gridLayout.addWidget(label, 0, obj.index);
      gridLayout.columnMinimumWidth(obj.index, 275);
   }
   else if (type.isOfType(dmz.stance.GameType)) { master.game = handle; }
});


