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
   , pdfViewer = dmz.ui.loader.load("StudentPdfDialog.ui")
   , pdfScrollArea = pdfViewer.lookup("pdfScrollArea")
   , scrollFormContent = pdfScrollArea.widget()
   , pdfContentLayout = dmz.ui.layout.createVBoxLayout()
   , groupSelectionLayout = pdfViewer.lookup("groupSelectionLayout")
   , pdfWebView = pdfViewer.lookup("pdfWebView")
   , addPdfButton = pdfViewer.lookup("addPdfButton")
   , addLinkWidget = pdfViewer.lookup("addLinkWidget")
   , titleTextEdit = pdfViewer.lookup("titleTextEdit")
   , linkTextEdit = pdfViewer.lookup("linkTextEdit")
   , titleTextLabel = pdfViewer.lookup("titleTextLabel")
   , linkTextLabel = pdfViewer.lookup("linkTextLabel")
   , tagButton = pdfViewer.lookup("tagButton")
   , deleteButton = pdfViewer.lookup("deleteButton")
   , cancelButton = pdfViewer.lookup("cancelButton")

   // Variables
   , hil
   , beenOpened = false
   , userGroupHandle
   , Groups = {}
   , PdfItems = {}
   , Memos = {}
   , Newspapers = {}
   , Videos = {}
   , PdfArray = []
   , MemosArray = []
   , NewspapersArray = []
   , VideosArray = []
   , CurrentMap = {}
   , CurrentArray = []
   , TypesMap =
      { "PdfItem": dmz.stance.PdfItemType
      , "Memo": dmz.stance.MemoType
      , "Newspaper": dmz.stance.NewspaperType
      , "Video": dmz.stance.VideoType
      }
   , CurrentItem
   , CurrentType
   , MainModule = { list: {}, highlight: function (str) { this.list[str] = true; } }

   // Functions
   , changeState
   , initialButtonObserve
   , clickDelete
   , confirmDelete
   , clickCancel
   , mouseEventHandler
   , mouseEvent
   , clearLayout
   , clearGroupSelectionLayout
   , initiatePdfPostItemUi
   , removeFromScrollArea
   , indexOfPdfItem
   , insertIntoScrollArea
   , openWindow
   , checkNotifications
   , init
   ;

changeState = function (state) {

   CurrentItem = 0;
   clearLayout();
   pdfWebView.setHtml("");
   PdfArray = [];
   MemosArray = [];
   NewspapersArray = [];
   VideosArray = [];
   CurrentType = state;
   self.log.error(state);
   if (state === "PdfItem") {

      self.log.error("pdfItem!");
      CurrentMap = PdfItems;
      CurrentArray = PdfArray;
   }
   else if (state === "Memo") {

      CurrentMap = Memos;
      CurrentArray = MemosArray;
   }
   else if (state === "Newspaper") {

      CurrentMap = Newspapers;
      CurrentArray = NewspapersArray;
   }
   else if (state === "Video") {

      CurrentMap = Videos;
      CurrentArray = VideosArray;
   }
};

initialButtonObserve = function () {

   deleteButton.observe(self, "clicked", function () {

      clickDelete();
   });
   tagButton.show();
   cancelButton.hide();
   deleteButton.show();
};

clickDelete = function () {

   if (CurrentItem) {

      tagButton.hide();
      cancelButton.show();
      deleteButton.observe(self, "clicked", function () {

         confirmDelete()
      });
      cancelButton.observe(self, "clicked", function () {

         clickCancel()
      });
   }
};

confirmDelete = function () {

   if (CurrentItem) {

      dmz.object.flag(CurrentItem.handle, dmz.stance.ActiveHandle, false);
      removeFromScrollArea(CurrentItem);
      CurrentItem = 0;
      pdfWebView.setHtml("");
      self.log.error("DELETED!");
      initialButtonObserve();
   }
};

clickCancel = function () {

   initialButtonObserve();
};

tagButton.observe(self, "clicked", function () {

   if (CurrentItem) {

      dmz.stance.TAG_MESSAGE.send(dmz.data.wrapHandle(CurrentItem.handle));
   }
});

addPdfButton.observe(self, "clicked", function () {

   var pdfItemHandle
     , atLeastOneChecked = false
     ;

   if ((titleTextEdit.text() !== "") && (linkTextEdit.text() !== "") &&
      dmz.stance.isAllowed(hil, dmz.stance.InjectPDFFlag)) {

      pdfItemHandle = dmz.object.create(TypesMap[CurrentType]);
      dmz.object.text(pdfItemHandle, dmz.stance.TitleHandle, titleTextEdit.text());
      dmz.object.text(pdfItemHandle, dmz.stance.TextHandle, linkTextEdit.text());
      if (CurrentType === "PdfItem") {

         dmz.object.link(dmz.stance.CreatedByHandle, pdfItemHandle, hil);
      }
      dmz.object.link(dmz.stance.MediaHandle, pdfItemHandle, hil);
      dmz.object.flag(pdfItemHandle, dmz.stance.UpdateStartTimeHandle, true);
      dmz.object.timeStamp(pdfItemHandle, dmz.stance.CreatedAtServerTimeHandle, 0);
      dmz.object.flag(pdfItemHandle, dmz.stance.ActiveHandle, true);
      if (dmz.stance.isAllowed(hil, dmz.stance.SwitchGroupFlag)) {

         Object.keys(Groups).forEach(function (key) {

            if (Groups[key].ui && Groups[key].ui.checkBox && Groups[key].ui.checkBox.isChecked()) {

               atLeastOneChecked = true;
               dmz.object.link(dmz.stance.MediaHandle, pdfItemHandle, Groups[key].handle);
            }
         });
      }
      else {

         atLeastOneChecked = true;
         dmz.object.link(dmz.stance.MediaHandle, pdfItemHandle, userGroupHandle);
      }
      if (atLeastOneChecked) {

         dmz.object.activate(pdfItemHandle);
         titleTextEdit.text("");
         linkTextEdit.text("");
      }
   }
});

mouseEventHandler = function (object, event) {

   mouseEvent(object, event.type());
};

mouseEvent = function (object, type) {

   CurrentArray.forEach(function (pdfItem) {

      if ((object == pdfItem.ui.postItem) && (type == dmz.ui.event.MouseButtonPress) &&
         (CurrentItem != pdfItem)) {

         // set CurrentItem widget back to grey and change value to new widget
         if (CurrentItem) {

            CurrentItem.ui.postItem.styleSheet("* { background-color: rgb(210, 210, 210); border-style: solid; }");
         }
         CurrentItem = pdfItem;
         dmz.time.setTimer(self, function () {

            // link and set widget to dark grey (current)
            initialButtonObserve();
            dmz.object.link(dmz.stance.MediaHandle, pdfItem.handle, hil);
            pdfItem.ui.notificationLabel.hide();
            pdfItem.ui.postItem.styleSheet("* { background-color: rgb(180, 180, 180); border-style: solid; }");
            if (CurrentType === "PdfItem") {

               pdfWebView.setHtml(
                  "<center><iframe src='http://docs.google.com/viewer?" +
                  "url=" + encodeURIComponent(pdfItem.link) +
                  "&embedded=true'" +
                  "width='" + (pdfWebView.page().width() - 20) +
                  "' height='" + (pdfWebView.page().height() - 20) +
                  "' style='border: none;'></iframe></center>");
            }
            else if (CurrentType === "Video"){

               pdfWebView.page().mainFrame().load(
                     "http://www.chds.us/?stance:youtube&video=" + pdfItem.link +
                     "&width=" + (pdfWebView.page().width() - 20) +"&height=" + (pdfWebView.page().height() - 20));
            }
            else { pdfWebView.page().mainFrame().load(pdfItem.link); }
         });
      }
      else if ((object == pdfItem.ui.postItem) && (type == dmz.ui.event.Enter)) {

         if (pdfItem.viewed.indexOf(hil) === -1) { // enter hasn't seen (redder)

            pdfItem.ui.postItem.styleSheet("* { background-color: rgb(190, 140, 140); border-style: solid; }");
         }
         else if (CurrentItem && CurrentItem.ui && (CurrentItem.ui.postItem == object)) {

            // Placeholder in case we want to make the hover chnge color for the current PDF
         }
         else { // enter seen (greyer)

            pdfItem.ui.postItem.styleSheet("* { background-color: rgb(180, 180, 180); border-style: solid; }");
         }
      }
      else if ((object == pdfItem.ui.postItem) && (type == dmz.ui.event.Leave)) {

         if (pdfItem.viewed.indexOf(hil) === -1) { // back to red

            pdfItem.ui.postItem.styleSheet("* { background-color: rgb(210, 180, 180); border-style: solid; }");
         }
         else if (CurrentItem && CurrentItem.ui && (CurrentItem.ui.postItem == object)) {

            // Also a placeholder for leeaving the currently displayed PDF
         }
         else { // back to grey

            pdfItem.ui.postItem.styleSheet("* { background-color: rgb(210, 210, 210); border-style: solid; }");
         }
      }
   });
};

clearLayout = function () {

   var widget;

   if (scrollFormContent && pdfContentLayout) {

      widget = pdfContentLayout.takeAt(0);
      while (widget) {

         widget.hide();
         widget = pdfContentLayout.takeAt(0);
      }
      pdfContentLayout.addStretch(1);
   }
};

clearGroupSelectionLayout = function () {

   var widget;

   if (groupSelectionLayout) {

      widget = groupSelectionLayout.takeAt(0);
      while (widget) {

         widget.hide();
         widget = groupSelectionLayout.takeAt(0);
      }
      groupSelectionLayout.addStretch(0);
   }
;}

initiatePdfPostItemUi = function (pdfItem) {

   if (pdfItem && !pdfItem.ui) {

      pdfItem.ui = {};
      pdfItem.ui.postItem = dmz.ui.loader.load("PdfPostItem.ui");
      pdfItem.ui.titleLabel = pdfItem.ui.postItem.lookup("titleLabel");
      pdfItem.ui.createdByLabel = pdfItem.ui.postItem.lookup("postedByLabel");
      pdfItem.ui.notificationLabel = dmz.ui.label.create(pdfItem.ui.postItem);
      pdfItem.ui.notificationLabel.fixedWidth(34);
      pdfItem.ui.titleLabel.text(pdfItem.title);
      pdfItem.ui.createdByLabel.text(pdfItem.createdBy);
      pdfItem.ui.postItem.eventFilter(self, mouseEventHandler);
      if (pdfItem.viewed.indexOf(hil) === -1) { // not seen

         pdfItem.ui.notificationLabel.pixmap((dmz.ui.graph.createPixmap(dmz.resources.findFile("PushNotify"))));
         pdfItem.ui.notificationLabel.move(5, 5);
         pdfItem.ui.titleLabel.raise();
         pdfItem.ui.titleLabel.styleSheet("* { background-color: rgba(0, 0, 0, 0); }");
         pdfItem.ui.postItem.styleSheet("* { background-color: rgb(210, 180, 180); border-style: solid; }");
      }
      else { // seen

         pdfItem.ui.notificationLabel.hide();
         pdfItem.ui.postItem.styleSheet("* { background-color: rgb(210, 210, 210); border-style: solid; }");
      }
   }
};

removeFromScrollArea = function (pdfItem) {

   var pdfItemIndex;

   if (pdfItem.ui) {

      pdfItemIndex = indexOfPdfItem(pdfItem);
      self.log.error(pdfItemIndex);
      if (pdfItemIndex !== -1) {

         CurrentArray.splice(pdfItemIndex, 1);
         pdfItem.ui.postItem.hide();
         pdfContentLayout.removeWidget(pdfItem.ui.postItem);
      }
   }
};

indexOfPdfItem = function (pdfItem) {

   var itor
     , result = -1
     ;

   for (itor = 0; itor < CurrentArray.length; itor += 1) {

      if (CurrentArray[itor].handle === pdfItem.handle) {

         result = itor;
      }
   }
   return result;
};

insertIntoScrollArea = function (pdfItem) {

   var newStartTime
     , insertedStartTime
     , inserted = false
     , itor
     ;

   if (pdfItem.ui) {

      newStartTime = pdfItem.createdAt;
      if ((newStartTime === 0) || (CurrentArray.length === 0)) {

         inserted = true;
         if (CurrentArray.length === 0) { CurrentArray.push(pdfItem); }
         else { CurrentArray.splice(0, 0, pdfItem); }
         pdfContentLayout.insertWidget(0, pdfItem.ui.postItem);
         pdfItem.ui.postItem.show();
      }
      for (itor = 0; itor < CurrentArray.length; itor += 1) {

         if (!inserted) {

            insertedStartTime = CurrentArray[itor].createdAt;
            if (newStartTime >= insertedStartTime) {

               inserted = true;
               if (CurrentArray.length === 0) { CurrentArray.push(pdfItem); }
               else { CurrentArray.splice(itor, 0, pdfItem); }
               pdfContentLayout.insertWidget(itor, pdfItem.ui.postItem);
               pdfItem.ui.postItem.show();
            }
         }
      }
      if (!inserted) {

         inserted = true;
         CurrentArray.push(pdfItem);
         pdfContentLayout.insertWidget(CurrentArray.length - 1, pdfItem.ui.postItem);
         pdfItem.ui.postItem.show();
      }
   }
};

openWindow = function () {

   var index = 0;

   beenOpened = true;
   Object.keys(CurrentMap).forEach(function (key) {

      self.log.error(CurrentMap[key].link);
   });
   Object.keys(CurrentMap).forEach(function (key) {

      if ((CurrentMap[key].groups.indexOf(userGroupHandle) !== -1) && (indexOfPdfItem(CurrentMap[key]) === -1) &&
         CurrentMap[key].active) {

         initiatePdfPostItemUi(CurrentMap[key]);
         insertIntoScrollArea(CurrentMap[key]);
      }
   });
   if (CurrentArray && CurrentArray[0]) {

      mouseEvent(CurrentArray[0].ui.postItem, dmz.ui.event.MouseButtonPress);
   }
   else { pdfWebView.setHtml("<center><b>No Current Items</b></Center>"); }
};

checkNotifications = function () {

   Object.keys(PdfItems).forEach(function (key) {

      PdfItems[key].groups.forEach(function (groupHandle) {

         if ((groupHandle === userGroupHandle) && (PdfItems[key].viewed.indexOf(hil) === -1) &&
            PdfItems[key].active) {

            MainModule.highlight("Lobbyist");
         }
      });
   });
   Object.keys(Memos).forEach(function (key) {

      Memos[key].groups.forEach(function (groupHandle) {

         if ((groupHandle === userGroupHandle) && (Memos[key].viewed.indexOf(hil) === -1) &&
            Memos[key].active) {

            MainModule.highlight("Memo");
         }
      });
   });
   Object.keys(Newspapers).forEach(function (key) {

      Newspapers[key].groups.forEach(function (groupHandle) {

         if ((groupHandle === userGroupHandle) && (Newspapers[key].viewed.indexOf(hil) === -1) &&
            Newspapers[key].active) {

            MainModule.highlight("Newspaper");
         }
      });
   });
   Object.keys(Videos).forEach(function (key) {

      Videos[key].groups.forEach(function (groupHandle) {

         if ((groupHandle === userGroupHandle) && (Videos[key].viewed.indexOf(hil) === -1) &&
            Videos[key].active) {

            MainModule.highlight("Video");
         }
      });
   });
};

dmz.object.create.observe(self, function (objHandle, objType) {

   if (objType.isOfType(dmz.stance.PdfItemType)) {

      PdfItems[objHandle] =
         { handle: objHandle
         , viewed: []
         , groups: []
         };
   }
   else if (objType.isOfType(dmz.stance.MemoType)) {

      Memos[objHandle] =
         { handle: objHandle
         , viewed: []
         , groups: []
         , createdBy: "Admin"
         };
   }
   else if (objType.isOfType(dmz.stance.NewspaperType)) {

      Newspapers[objHandle] =
         { handle: objHandle
         , viewed: []
         , groups: []
         , createdBy: "Admin"
         };
   }
   else if (objType.isOfType(dmz.stance.VideoType)) {

      Videos[objHandle] =
         { handle: objHandle
         , viewed: []
         , groups: []
         , createdBy: "Admin"
         };
   }
   else if (objType.isOfType(dmz.stance.GroupType)) {

      Groups[objHandle] = { handle: objHandle };
   }
});

dmz.object.flag.observe(self, dmz.object.HILAttribute,
function (objHandle, attrHandle, value) {

   if (value) {

      hil = objHandle;
      dmz.time.setTimer(self, function () {

         userGroupHandle = dmz.stance.getUserGroupHandle(hil);
         checkNotifications();
         clearLayout();
         clearGroupSelectionLayout();
         tagButton.hide();
         deleteButton.hide();
         cancelButton.hide();

         PdfArray = [];
         MemosArray = [];
         NewspapersArray = [];
         VideosArray = [];
         CurrentItem = 0;
         pdfWebView.setHtml("");
         Object.keys(PdfItems).forEach(function (key) {

            if (PdfItems[key].ui) { delete PdfItems[key].ui; }
         });
         Object.keys(Groups).forEach(function (key) {

            if (Groups[key].ui) { delete Groups[key].ui; }
         });
         if (dmz.stance.isAllowed(hil, dmz.stance.InjectPDFFlag)) {

            addLinkWidget.show();
            addPdfButton.show();
         }
         else {

            addLinkWidget.hide();
            addPdfButton.hide();
         }
         if (dmz.stance.isAllowed(hil, dmz.stance.SwitchGroupFlag)) {
            initialButtonObserve();

            self.log.error("CHECKS");
            Object.keys(Groups).forEach(function (key) {

               if (!Groups[key].ui) {

                  Groups[key].ui = {};
                  Groups[key].ui.nameLabel = dmz.ui.label.create("<b>" + Groups[key].name + "</b>");
                  Groups[key].ui.checkBox = dmz.ui.button.createCheckBox();
                  groupSelectionLayout.insertWidget(0, Groups[key].ui.nameLabel);
                  groupSelectionLayout.insertWidget(0, Groups[key].ui.checkBox);
                  if (key == userGroupHandle) { Groups[key].ui.checkBox.setChecked(true); }
                  else { Groups[key].ui.checkBox.setChecked(false); }
                  self.log.error(groupSelectionLayout);
               }
               else {

                  if (key == userGroupHandle) { Groups[key].ui.checkBox.setChecked(true); }
                  else { Groups[key].ui.checkBox.setChecked(false); }
               }
            });
         }
      });
   }
});

dmz.object.text.observe(self, dmz.stance.TitleHandle,
function (objHandle, attrHandle, newVal, oldVal) {

   if (PdfItems[objHandle]) {

      PdfItems[objHandle].title = newVal;
   }
   if (Memos[objHandle]) {

      Memos[objHandle].title = newVal;
   }
   if (Newspapers[objHandle]) {

      Newspapers[objHandle].title = newVal;
   }
   if (Videos[objHandle]) {

      Videos[objHandle].title = newVal;
   }
});

dmz.object.text.observe(self, dmz.stance.TextHandle,
function (objHandle, attrHandle, newVal, oldVal) {

   if (PdfItems[objHandle]) {

      PdfItems[objHandle].link = newVal;
   }
   if (Memos[objHandle]) {

      self.log.error(newVal);
      Memos[objHandle].link = newVal;
   }
   if (Newspapers[objHandle]) {

      Newspapers[objHandle].link = newVal;
   }
   if (Videos[objHandle]) {

      Videos[objHandle].link = newVal;
   }
});

dmz.object.timeStamp.observe(self, dmz.stance.CreatedAtServerTimeHandle,
function (objHandle, attrHandle, newVal, oldVal) {

   if (PdfItems[objHandle]) {

      PdfItems[objHandle].createdAt = newVal;
   }
   else if (Memos[objHandle]) {

      Memos[objHandle].createdAt = newVal;
   }
   else if (Newspapers[objHandle]) {

      Newspapers[objHandle].createdAt = newVal;
   }
   else if (Videos[objHandle]) {

      Videos[objHandle].createdAt = newVal;
   }
});

dmz.object.flag.observe(self, dmz.stance.ActiveHandle,
function (objHandle, attrHandle, newVal, oldVal) {

   if (PdfItems[objHandle]) {

      PdfItems[objHandle].active = newVal;
   }
   else if (Memos[objHandle]) {

      Memos[objHandle].active = newVal;
   }
   else if (Newspapers[objHandle]) {

      Newspapers[objHandle].active = newVal;
   }
   else if (Videos[objHandle]) {

      Videos[objHandle].active = newVal;
   }
});

dmz.object.text.observe(self, dmz.stance.NameHandle,
function (objHandle, attrHandle, newVal, oldVal) {

   if (Groups[objHandle]) {

      Groups[objHandle].name = newVal;
   }
});

dmz.object.link.observe(self, dmz.stance.CreatedByHandle,
function (linkHandle, attrHandle, supHandle, subHandle) {


   if (PdfItems[supHandle]) {

      PdfItems[supHandle].createdByHandle = subHandle;
      dmz.time.setTimer(self, function () {

         PdfItems[supHandle].createdBy = dmz.stance.getDisplayName(subHandle);
      });
   }
   else if (Memos[supHandle]) {

      Memos[supHandle].createdByHandle = subHandle;
      dmz.time.setTimer(self, function () {

         Memos[supHandle].createdBy = dmz.stance.getDisplayName(subHandle);
      });
   }
   else if (Newspapers[supHandle]) {

      Newspapers[supHandle].createdByHandle = subHandle;
      dmz.time.setTimer(self, function () {

         Newspapers[supHandle].createdBy = dmz.stance.getDisplayName(subHandle);
      });
   }
   else if (Videos[supHandle]) {

      Videos[supHandle].createdByHandle = subHandle;
      dmz.time.setTimer(self, function () {

         Videos[supHandle].createdBy = dmz.stance.getDisplayName(subHandle);
      });
   }
});

dmz.object.link.observe(self, dmz.stance.MediaHandle,
function (linkHandle, attrHandle, supHandle, subHandle) {

   if (PdfItems[supHandle]) {

      if (dmz.object.type(subHandle).isOfType(dmz.stance.GroupType)) {

         PdfItems[supHandle].groups.push(subHandle);
         dmz.time.setTimer(self, function () {

            if ((indexOfPdfItem(PdfItems[supHandle]) === -1) && beenOpened){

               initiatePdfPostItemUi(PdfItems[supHandle]);
               insertIntoScrollArea(PdfItems[supHandle]);
               if ((PdfItems[supHandle].viewed.indexOf(hil) === -1) && PdfItems[supHandle].active) {

                  MainModule.highlight("Lobbyist");
               }
            }
         });
      }
      else if (dmz.object.type(subHandle).isOfType(dmz.stance.UserType)) {

         PdfItems[supHandle].viewed.push(subHandle);
      }
   }
   else if (Memos[supHandle]) {

      if (dmz.object.type(subHandle).isOfType(dmz.stance.GroupType)) {

         Memos[supHandle].groups.push(subHandle);
         dmz.time.setTimer(self, function () {

            if ((indexOfPdfItem(Memos[supHandle]) === -1) && beenOpened){

               initiatePdfPostItemUi(Memos[supHandle]);
               insertIntoScrollArea(Memos[supHandle]);
               if ((Memos[supHandle].viewed.indexOf(hil) === -1) && Memos[supHandle].active) {

                  MainModule.highlight("Memos");
               }
            }
         });
      }
      else if (dmz.object.type(subHandle).isOfType(dmz.stance.UserType)) {

         Memos[supHandle].viewed.push(subHandle);
      }
   }
   else if (Newspapers[supHandle]) {

      if (dmz.object.type(subHandle).isOfType(dmz.stance.GroupType)) {

         Newspapers[supHandle].groups.push(subHandle);
         dmz.time.setTimer(self, function () {

            if ((indexOfPdfItem(Newspapers[supHandle]) === -1) && beenOpened){

               initiatePdfPostItemUi(Newspapers[supHandle]);
               insertIntoScrollArea(Newspapers[supHandle]);
               if ((Newspapers[supHandle].viewed.indexOf(hil) === -1) && Newspapers[supHandle].active) {

                  MainModule.highlight("Newspaper");
               }
            }
         });
      }
      else if (dmz.object.type(subHandle).isOfType(dmz.stance.UserType)) {

         Newspapers[supHandle].viewed.push(subHandle);
      }
   }
   else if (Videos[supHandle]) {

      if (dmz.object.type(subHandle).isOfType(dmz.stance.GroupType)) {

         Videos[supHandle].groups.push(subHandle);
         dmz.time.setTimer(self, function () {

            if ((indexOfPdfItem(Videos[supHandle]) === -1) && beenOpened){

               initiatePdfPostItemUi(Videos[supHandle]);
               insertIntoScrollArea(Videos[supHandle]);
               if ((Videos[supHandle].viewed.indexOf(hil) === -1) && Videos[supHandle].active) {

                  MainModule.highlight("Video");
               }
            }
         });
      }
      else if (dmz.object.type(subHandle).isOfType(dmz.stance.UserType)) {

         Videos[supHandle].viewed.push(subHandle);
      }
   }
});

dmz.module.subscribe(self, "main", function (Mode, module) {

   var list;

   if (Mode === dmz.module.Activate) {

      list = MainModule.list;
      MainModule = module;
      module.addPage
         ( "Lobbyist"
         , pdfViewer
         , function () {

            changeState("PdfItem");
            openWindow();
         }
         , checkNotifications
         );
      module.addPage
         ( "Memo"
         , "Lobbyist"
         , function () {

            changeState("Memo");
            openWindow();
         }
         , checkNotifications
         );
      module.addPage
         ( "Newspaper"
         , "Lobbyist"
         , function () {

            changeState("Newspaper");
            openWindow();
         }
         , checkNotifications
         );
      module.addPage
         ( "Video"
         , "Lobbyist"
         , function () {

            changeState("Video");
            openWindow();
         }
         , checkNotifications
         );
      if (list) { Object.keys(list).forEach(function (str) { module.highlight(str); }); }
   }
});

init = function () {

   scrollFormContent.layout(pdfContentLayout);
   pdfContentLayout.addStretch(1);
   groupSelectionLayout.addStretch(1);
   tagButton.hide();
   tagButton.styleSheet(dmz.stance.YELLOW_BUTTON);
   deleteButton.hide();
   deleteButton.styleSheet(dmz.stance.RED_BUTTON);
   cancelButton.hide();
   cancelButton.styleSheet(dmz.stance.GREEN_BUTTON);
};

init();
