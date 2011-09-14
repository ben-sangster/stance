require("datejs/date");

var dmz =
   { ui:
      { button: require("dmz/ui/button")
      , consts: require("dmz/ui/consts")
      , mainWindow: require("dmz/ui/mainWindow")
      , spinBox: require("dmz/ui/spinBox")
      , graph: require("dmz/ui/graph")
      , layout: require("dmz/ui/layout")
      , label: require("dmz/ui/label")
      , loader: require('dmz/ui/uiLoader')
      , textEdit: require("dmz/ui/textEdit")
      , widget: require("dmz/ui/widget")
      , scrollArea: require("dmz/ui/scrollArea")
      , tabWidget: require("dmz/ui/tabWidget")
      , webview: require("dmz/ui/webView")
      }
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

   // Variables
   , MainModule = { list: {}, highlight: function (str) { this.list[str] = true; } }
   , Groups = {}
   , Users = {}
   , ShowStudentsMessage = dmz.message.create("showStudentsWindow")

   // UI
   , groupTabs = dmz.ui.tabWidget.create()
   , dock
   , DockName = "userInfo"
   , userStatisticsWidget = dmz.ui.webview.create("userStatistics")
   , GraphicsScene = dmz.ui.graph.createScene()
   , GraphicsView = dmz.ui.graph.createView(GraphicsScene)
   , GSceneItems = []



   // Functions
   , toDate = dmz.util.timeStampToDate
   , setUserPictureLabel
   , setVotesSeenLabel
   , setLobbyistsSeenLabel
   , setNewspapersSeenLabel
   , setVideosSeenLabel
   , setMemosSeenLabel
   , setLastLoginSeenLabel
   , setStatisticsHtml
   , setUserNameLabel
   , initializeUserVoteData
   , createUserWidget
   , createGroupTabs
   , init

   , setPieChart
   , createPieChart
   ;

self.shutdown = function () { dmz.ui.mainWindow.removeDock(DockName); }

(function () {

   GraphicsView.alignment (dmz.ui.consts.AlignLeft | dmz.ui.consts.AlignTop);
   GraphicsView.show();
}());

// data = [{ amt: #, brush: dmz.ui.graph.createBrush, label: ""}]
createPieChart = function (data, labelFnc, scene, zero) {

   var x = zero ? (zero.x || 0) : 0
     , y = zero ? (zero.y || 0) : 0
     , graphLabel
     , startAngle
     , items = []
     , total = 0
     ;

   if (data && scene) {

      data.forEach(function (item) { total += (item.amt || 0); });
      graphLabel = scene.addText(labelFnc(total));
      graphLabel.pos(20 + x, y);
      startAngle = 0
      data.forEach(function (item, index){

         var spanAngle = item.amt / total * 360 * 16
           , ellipse = scene.addEllipse(x + 30, y + 30, 200, 200, startAngle, spanAngle, 0, item.brush)
           , legendBox = dmz.ui.graph.createRectItem(0, 0, 15, 15, graphLabel)
           , legendLabel
           ;

         legendLabel =
            dmz.ui.graph.createTextItem
               ( item.label + " - " + item.amt + " ("+ (Math.round(item.amt / total * 10000)/100) + "%)"
               , legendBox);

         legendBox.pos(250, index * 20 + 20);
         legendBox.brush(item.brush);
         legendLabel.pos(20, -5);
         items.push(ellipse);
         items.push(legendLabel);
         startAngle += spanAngle;
      });

      items.push(graphLabel);
   }

   return items;
};

setPieChart = function (userHandle) {

   var item = Users[userHandle]
     , data
     , startAngle = 0
     , spanAngle
     , total
     , legend = []
     , passBrush
     , failBrush
     , deniedBrush
     , pendingBrush
     , activeBrush
     , label
     , pct
     ;

   if (item) {

      passBrush = dmz.ui.graph.createBrush({ r: 70/255, b: 70/255, g: 70/255 });
      failBrush = dmz.ui.graph.createBrush({ r: 70/255, b: 240/255, g: 70/255 });
      deniedBrush = dmz.ui.graph.createBrush({ r: 240/255, b: 70/255, g: 70/255 });
      pendingBrush = dmz.ui.graph.createBrush({ r: 240/255, b: 240/255, g: 240/255 });
      activeBrush = dmz.ui.graph.createBrush({ r: 240/255, b: 240/255, g: 70/255 });

      //temp clear -- shouldn't need later
      while (GSceneItems.length) { GraphicsScene.removeItem(GSceneItems.pop()); }

      legend.push({ amt: item.votesPassed, brush: passBrush, label: "Passed" });
      legend.push({ amt: item.votesFailed, brush: failBrush, label: "Failed" });
      legend.push({ amt: item.votesDenied, brush: deniedBrush, label: "Denied" });
      legend.push({ amt: item.votesActive, brush: activeBrush, label: "Active" });
      legend.push({ amt: item.votesPending, brush: pendingBrush, label: "Pending" });

      GSceneItems.concat(
         createPieChart
            ( legend
            , function (total) { return "Vote Breakdown: (Total Completed Votes: " + total + ")"; }
            , GraphicsScene
            ));
   }
};

ShowStudentsMessage.subscribe(self, function () {

   createGroupTabs();
   if (!dock) {

      dock =
         dmz.ui.mainWindow.createDock
            ( DockName
            , { area: dmz.ui.consts.RightToolBarArea, visible: false, floating: true }
            , groupTabs
            );
   }

   dock.show();
});

setUserPictureLabel = function (userHandle) {

   var pic;

   if (Users[userHandle]) {

      pic = dmz.ui.graph.createPixmap(dmz.resources.findFile(Users[userHandle].picture));
      Users[userHandle].ui.userPictureLabel.pixmap(pic.scaled(50, 50));
   }
};

setVotesSeenLabel = function (userHandle) {

   var tempHandles
     , totalGroupVotes
     , latestGroupVoteTime = 0
     , latestUserTime = dmz.stance.userAttribute(userHandle, dmz.stance.VoteTimeHandle)
     , userSeenVotes
     , decisionHandle
     , unseenVotes = 0
     ;

   if (Users[userHandle] && Users[userHandle].groupHandle) {

      totalGroupVotes = dmz.object.superLinks(Users[userHandle].groupHandle, dmz.stance.VoteGroupHandle) || [];
      totalGroupVotes.forEach(function (voteHandle) {

         var createdTime = 0
           , approvedTime = 0
           , endedTime = 0
           , greaterThanUserTime = false
           ;

         createdTime = dmz.object.timeStamp(voteHandle, dmz.stance.CreatedAtServerTimeHandle);
         decisionHandle = dmz.object.superLinks(voteHandle, dmz.stance.VoteLinkHandle);
         if (decisionHandle) {

            decisionHandle = decisionHandle[0];
            approvedTime = dmz.object.timeStamp(decisionHandle, dmz.stance.CreatedAtServerTimeHandle);
            endedTime = dmz.object.timeStamp(decisionHandle, dmz.stance.EndedAtServerTimeHandle);
         }
         if ((createdTime && (createdTime > latestUserTime)) ||
            (approvedTime && (approvedTime > latestUserTime)) ||
            (endedTime && (endedTime > latestUserTime))) {

            greaterThanUserTime = true;
         }
         if (greaterThanUserTime) {

            unseenVotes += 1;
         }
      });
      totalGroupVotes = totalGroupVotes.length;
      Users[userHandle].ui.votesSeenLabel.text("<b>Votes Seen: </b>" + (totalGroupVotes - unseenVotes) + "<b>/</b>" + totalGroupVotes);
   }
};

setLobbyistsSeenLabel = function (userHandle) {

   var tempHandles
     , totalGroupLobbyists
     , userSeenLobbyists
     ;

   if (Users[userHandle] && Users[userHandle].groupHandle) {

      tempHandles = dmz.object.superLinks(Users[userHandle].groupHandle, dmz.stance.MediaHandle) || [];
      totalGroupLobbyists = tempHandles.filter(function (mediaItem) {

         return (dmz.object.type(mediaItem).isOfType(dmz.stance.LobbyistType) && dmz.object.flag(mediaItem, dmz.stance.ActiveHandle));
      });
      totalGroupLobbyists = totalGroupLobbyists.length;
      tempHandles = dmz.object.superLinks(userHandle, dmz.stance.MediaHandle) || [];
      userSeenLobbyists = tempHandles.filter(function (mediaItem) {

         return (dmz.object.type(mediaItem).isOfType(dmz.stance.LobbyistType) && dmz.object.flag(mediaItem, dmz.stance.ActiveHandle));
      });
      userSeenLobbyists = userSeenLobbyists.length;
      Users[userHandle].ui.lobbyistsSeenLabel.text("<b>Lobbyists Seen: </b>" + userSeenLobbyists + "<b>/</b>" + totalGroupLobbyists);
   }
};

setNewspapersSeenLabel = function (userHandle) {

   var tempHandles
     , totalGroupNewspapers
     , userSeenNewspapers
     ;

   if (Users[userHandle] && Users[userHandle].groupHandle) {

      tempHandles = dmz.object.superLinks(Users[userHandle].groupHandle, dmz.stance.MediaHandle) || [];
      totalGroupNewspapers = tempHandles.filter(function (mediaItem) {

         return (dmz.object.type(mediaItem).isOfType(dmz.stance.NewspaperType) && dmz.object.flag(mediaItem, dmz.stance.ActiveHandle));
      });
      totalGroupNewspapers = totalGroupNewspapers.length;
      tempHandles = dmz.object.superLinks(userHandle, dmz.stance.MediaHandle) || [];
      userSeenNewspapers = tempHandles.filter(function (mediaItem) {

         return (dmz.object.type(mediaItem).isOfType(dmz.stance.NewspaperType) && dmz.object.flag(mediaItem, dmz.stance.ActiveHandle));
      });
      userSeenNewspapers = userSeenNewspapers.length;
      Users[userHandle].ui.newspapersSeenLabel.text("<b>Newspapers Seen: </b>" + userSeenNewspapers + "<b>/</b>" + totalGroupNewspapers);
   }
};

setVideosSeenLabel = function (userHandle) {

   var tempHandles
     , totalGroupVideos
     , userSeenVideos
     ;

   if (Users[userHandle] && Users[userHandle].groupHandle) {

      tempHandles = dmz.object.superLinks(Users[userHandle].groupHandle, dmz.stance.MediaHandle) || [];
      totalGroupVideos = tempHandles.filter(function (mediaItem) {

         return (dmz.object.type(mediaItem).isOfType(dmz.stance.VideoType) && dmz.object.flag(mediaItem, dmz.stance.ActiveHandle));
      });
      totalGroupVideos = totalGroupVideos.length;
      tempHandles = dmz.object.superLinks(userHandle, dmz.stance.MediaHandle) || [];
      userSeenVideos = tempHandles.filter(function (mediaItem) {

         return (dmz.object.type(mediaItem).isOfType(dmz.stance.VideoType) && dmz.object.flag(mediaItem, dmz.stance.ActiveHandle));
      });
      userSeenVideos = userSeenVideos.length;
      Users[userHandle].ui.videosSeenLabel.text("<b>Videos Seen: </b>" + userSeenVideos + "<b>/</b>" + totalGroupVideos);
   }
};

setMemosSeenLabel = function (userHandle) {

   var tempHandles
     , totalGroupMemos
     , userSeenMemos
     ;

   if (Users[userHandle] && Users[userHandle].groupHandle) {

      tempHandles = dmz.object.superLinks(Users[userHandle].groupHandle, dmz.stance.MediaHandle) || [];
      totalGroupMemos = tempHandles.filter(function (mediaItem) {

         return (dmz.object.type(mediaItem).isOfType(dmz.stance.MemoType) && dmz.object.flag(mediaItem, dmz.stance.ActiveHandle));
      });
      totalGroupMemos = totalGroupMemos.length;
      tempHandles = dmz.object.superLinks(userHandle, dmz.stance.MediaHandle) || [];
      userSeenMemos = tempHandles.filter(function (mediaItem) {

         return (dmz.object.type(mediaItem).isOfType(dmz.stance.MemoType) && dmz.object.flag(mediaItem, dmz.stance.ActiveHandle));
      });
      userSeenMemos = userSeenMemos.length;
      Users[userHandle].ui.memosSeenLabel.text("<b>Memos Seen: </b>" + userSeenMemos + "<b>/</b>" + totalGroupMemos);
   }
};

setLastLoginSeenLabel = function (userHandle) {

   if (Users[userHandle]) {

      Users[userHandle].ui.lastLoginLabel.text("<b>Time currently not supported. </b>");
   }
};

setUserNameLabel = function (userHandle) {

   if (Users[userHandle]) {

      Users[userHandle].ui.userNameLabel.text("<b>User Name: </b>" + Users[userHandle].name);
   }
};

initializeUserVoteData = function () {

   var tempHandles
     , voteHandles
     , voteState
     , tempUserHandle
     ;

   Object.keys(Users).forEach(function (key) {

      Users[key].votesPending = 0;
      Users[key].votesDenied = 0;
      Users[key].votesActive = 0;
      Users[key].votesPassed = 0;
      Users[key].votesFailed = 0;
      Users[key].totalVotes = 0;
   });
   tempHandles = dmz.object.getObjects() || [];
   voteHandles = tempHandles.filter(function (item) {

      return dmz.object.type(item).isOfType(dmz.stance.VoteType);
   });
   voteHandles.forEach(function (voteHandle) {

      var item;
      voteState = dmz.object.scalar(voteHandle, dmz.stance.VoteState);
      tempHandles = dmz.object.subLinks(voteHandle, dmz.stance.CreatedByHandle);
      if (tempHandles && Users[tempHandles[0]]) {

         tempUserHandle = tempHandles[0];
         item = Users[tempUserHandle];
         switch (voteState) {

         case dmz.stance.VOTE_APPROVAL_PENDING: item.votesPending += 1; break;
         case dmz.stance.VOTE_DENIED: item.votesDenied += 1; break;
         case dmz.stance.VOTE_ACTIVE: item.votesActive += 1; break;
         case dmz.stance.VOTE_YES: item.votesPassed += 1; break;
         case dmz.stance.VOTE_NO: item.votesFailed += 1; break;
         default: self.log.error ("Vote error state:", voteHandle); break;
         }
         Users[tempUserHandle].totalVotes += 1;
      }
   });
};

setStatisticsHtml = function (userHandle) {

   var html;

   initializeUserVoteData();

   setPieChart(userHandle);

   self.log.error(Users[userHandle].votesPending, Users[userHandle].votesDenied, Users[userHandle].votesActive);
   // Page opening
   html = "<html><head><script type='text/javascript' src='https://www.google.com/jsapi'></script>";
   html += "<script type='text/javascript'>google.load('visualization', '1.0', {'packages':['corechart']});";
   html += "google.setOnLoadCallback(drawVotePieChart);"

   // Vote Statistics Pie Chart
   html += "function drawVotePieChart() { var data = new google.visualization.DataTable();";
   html += "data.addColumn('string', 'State'); data.addColumn('number', 'Votes'); data.addRows([ ['Denied', " + Users[userHandle].votesDenied + "],";
   html += "['Passed', " + Users[userHandle].votesPassed + "], ['Failed', " + Users[userHandle].votesFailed + "], ['Active', " +  Users[userHandle].votesActive +"] ]);";
   html += "var options = {'title':'Vote Breakdown (Total Votes Proposed: " + Users[userHandle].totalVotes + ")', 'width':600, 'height':450, 'is3D':true };";
   html += "var chart = new google.visualization.PieChart(document.getElementById('chart_div'));";
   html += "chart.draw(data, options); } "

   // Compared with other users bar graph
   //html += "function drawUserComparisonChart() { var data = new google.visualization.DataTable();";
   //html += "data.addColumn('string', 'name'); data.addColumn('number', 'Votes')";

   html += "</script></head><body><center> <div id='chart_div'></div></center></body></html>";
   userStatisticsWidget.setHtml(html);
};

createUserWidget = function (userHandle) {

   var userWidget
     , userItem
     ;

   if (Users[userHandle]) {

      userItem = Users[userHandle];
      userWidget = dmz.ui.loader.load("UserInfoSubWidget.ui");
      userItem.ui = { userWidget: userWidget };
      userItem.ui.userPictureLabel = userWidget.lookup("userPictureLabel");
      userItem.ui.votesSeenLabel = userWidget.lookup("votesSeenLabel");
      userItem.ui.userNameLabel = userWidget.lookup("userNameLabel");
      userItem.ui.lastLoginLabel = userWidget.lookup("lastLoginLabel");
      userItem.ui.memosSeenLabel = userWidget.lookup("memosSeenLabel");
      userItem.ui.newspapersSeenLabel = userWidget.lookup("newspapersSeenLabel");
      userItem.ui.videosSeenLabel = userWidget.lookup("videosSeenLabel");
      userItem.ui.lobbyistsSeenLabel = userWidget.lookup("lobbyistsSeenLabel");
      userItem.ui.showForumPostsButton = userWidget.lookup("showForumPostsButton");
      userItem.ui.showVoteStatisticsButton = userWidget.lookup("showVoteStatisticsButton");
      userItem.ui.showUserStatisticsButton = userWidget.lookup("userStatisticsButton");
      userItem.ui.contentLayout = userWidget.lookup("contentLayout");
      userItem.ui.userStatisticsWidgetOpen = false;

      userItem.ui.showUserStatisticsButton.observe(self, "clicked", function () {

         if (userItem.ui.userStatisticsWidgetOpen) {

            userStatisticsWidget.hide();
            userItem.ui.contentLayout.removeWidget(userStatisticsWidget);
         }
         else {

            userItem.ui.contentLayout.insertWidget(0, userStatisticsWidget);
            userStatisticsWidget.show();
            userStatisticsWidget.fixedHeight(600);
            setStatisticsHtml(userHandle);
         }
         userItem.ui.userStatisticsWidgetOpen = !userItem.ui.userStatisticsWidgetOpen;
      });

      setUserNameLabel(userItem.handle);
      setLastLoginSeenLabel(userItem.handle);
      setMemosSeenLabel(userItem.handle);
      setVideosSeenLabel(userItem.handle);
      setNewspapersSeenLabel(userItem.handle);
      setLobbyistsSeenLabel(userItem.handle);
      setUserPictureLabel(userItem.handle);
      setVotesSeenLabel(userItem.handle);
   }
};

createGroupTabs = function () {

   var scrollArea
     , usersLayout
     , scrollLayout
     , scrollWidget
     , itors = {}
     ;

   groupTabs.clear();
   Object.keys(Groups).forEach(function (key) {

      scrollArea = dmz.ui.scrollArea.create();
      scrollWidget = dmz.ui.widget.create("scrollWidget");
      usersLayout = dmz.ui.layout.createVBoxLayout();
      usersLayout.addStretch(1);
      scrollWidget.layout(usersLayout);
      scrollArea.widget(scrollWidget);
      scrollArea.widgetResizable(true);

      groupTabs.add(scrollArea, Groups[key].name);
      Groups[key].usersLayout = usersLayout;
   });

   Object.keys(Users).forEach(function (key) {

      if (Users[key].groupHandle && Groups[Users[key].groupHandle] &&
         Groups[Users[key].groupHandle].usersLayout) {

         createUserWidget(key);
         if (itors[Users[key].groupHandle] !== undefined) {

            itors[Users[key].groupHandle].itor += 1;
         }
         else {

            itors[Users[key].groupHandle] = { itor: 0 };
         }
         Groups[Users[key].groupHandle].usersLayout.insertWidget(
            itors[Users[key].groupHandle].itor, Users[key].ui.userWidget);
      }
   });
};

dmz.object.create.observe(self, function (objHandle, objType) {

   if (objType.isOfType(dmz.stance.GroupType)) {

      Groups[objHandle] =
         { handle: objHandle
         , totalVotes: 0
         };
   }
   if (objType.isOfType(dmz.stance.UserType)) {

      Users[objHandle] =
         { handle: objHandle
         , votesPending: 0
         , votesActive: 0
         , votesDenied: 0
         , votesPassed: 0
         , votesFailed: 0
         , totalVotes: 0
         };
   }
});

dmz.object.text.observe(self, dmz.stance.NameHandle,
function (objHandle, attrHandle, newVal, oldVal) {

   if (Groups[objHandle]) {

      Groups[objHandle].name = newVal;
   }
   if (Users[objHandle]) {

      Users[objHandle].uuid = newVal;
   }
});

dmz.object.text.observe(self, dmz.stance.DisplayNameHandle,
function (objHandle, attrHandle, newVal, oldVal) {

   if (Users[objHandle]) {

      Users[objHandle].name = newVal;
   }
});

dmz.object.text.observe(self, dmz.stance.PictureHandle,
function (objHandle, attrHandle, newVal, oldVal) {

   if (Users[objHandle]) {

      Users[objHandle].picture = newVal;
   }
});

dmz.object.link.observe(self, dmz.stance.GroupMembersHandle,
function (linkHandle, attrHandle, supHandle, subHandle) {

   if (Users[supHandle]) {

      Users[supHandle].groupHandle = subHandle;
   }
});

