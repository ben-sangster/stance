var dmz =
   { ui:
      { button: require("dmz/ui/button")
      , spinBox: require("dmz/ui/spinBox")
      , consts: require('dmz/ui/consts')
      , graph: require("dmz/ui/graph")
      , inputDialog: require("dmz/ui/inputDialog")
      , layout: require("dmz/ui/layout")
      , loader: require('dmz/ui/uiLoader')
      , messageBox: require("dmz/ui/messageBox")
      , mainWindow: require('dmz/ui/mainWindow')
      , phonon: require("dmz/ui/phonon")
      , treeWidget: require("dmz/ui/treeWidget")
      , textEdit: require("dmz/ui/textEdit")
      , webview: require("dmz/ui/webView")
      , widget: require("dmz/ui/widget")
      }
   , stance: require("stanceConst")
   , defs: require("dmz/runtime/definitions")
   , object: require("dmz/components/object")
   , objectType: require("dmz/runtime/objectType")
   , module: require("dmz/runtime/module")
   , resources: require("dmz/runtime/resources")
   , time: require("dmz/runtime/time")
   , util: require("dmz/types/util")
   , time: require("dmz/runtime/time")
   }

   // UI
   , voteForm = dmz.ui.loader.load("VoteForm.ui")
   , scrollArea= voteForm.lookup("scrollArea")
   , content = scrollArea.widget()
   , myLayout = dmz.ui.layout.createVBoxLayout()

   // Functions

   // Variables
   , MainModule = { list: {}, highlight: function (str) { this.list[str] = true; } }
      /* VoteObject =
            { handle: handle
            , createdBy: userName
            , startTime: time
            , endTime: time
            , duration: time
            , question: text
            , status: statusConst
            , advisorReason: text
            , decisionHandle: handle
            , postItem: postItem
            , yesButton: button
            , noButton: button
            }
      */
   , PastVotes = []
   , ApprovalVotes = []
   , ActiveVotes = []
   , AvatarDefault = dmz.ui.graph.createPixmap(dmz.resources.findFile("AvatarDefault"))
   // Functions
   , resetLayout
   , initVoteForm
   , getTopVote
   , getPreviousVotes
   , displayPastVotes
   , createDecisionObject
   , userVoted
   , voteExpired
   , voteObserveFunction
   , init
   ;

voteExpired = function (voteHandle) {

   var decisionHandles = dmz.object.superLinks(voteHandle, dmz.stance.VoteLinkHandle) || []
     , decisionHandle = decisionHandles[0]
     , yesVotes
     , noVotes
     ;

   yesVotes = dmz.object.superLinks(decisionHandle, dmz.stance.YesHandle) || [];
   noVote = dmz.object.superLinks(decisionHandle, dmz.stance.NoHandle) || [];

   if (noVotes.length >= yesVotes.length) {

      dmz.object.scalar(voteHandle, dmz.stance.VoteState, dmz.stance.VOTE_YES);
   }
   else{

      dmz.object.scalar(voteHandle, dmz.stance.VoteState, dmz.stance.VOTE_NO);
   }
};

voteObserveFunction = function(linkHandle, attrHandle, superHandle, subHandle) {

   var userGroupHandle = dmz.stance.getUserGroupHandle(superHandle)
     , numberInGroup = dmz.object.superLinks(userGroupHandle, dmz.stance.GroupMembersHandle) || []
     , noVotes = dmz.object.superLinks(subHandle, dmz.stance.NoHandle) || []
     , yesVotes = dmz.object.superLinks(subHandle, dmz.stance.YesHandle) || []
     , tempHandles
     , voteHandle
     , itor = 0
     , adminFlag
     ;

   /* Subtract the admins from the total number of users (admins can't vote) */
   numberInGroup.forEach(function (userHandle) {

      adminFlag = dmz.object.flag(userHandle, dmz.stance.AdminHandle);
      if (adminFlag) {

         itor += 1;
      }
   });
   numberInGroup = numberInGroup.length - itor;

   /* See if a majority has been reached on a vote */
   if (noVotes.length >= numberInGroup / 2) {

      tempHandles = dmz.object.subLinks(subHandle, dmz.stance.VoteLinkHandle) || [];
      tempHandles.forEach(function (voteHandle) {

         dmz.object.scalar(voteHandle, dmz.stance.VoteState, dmz.stance.VOTE_NO);
      });
      dmz.object.flag(subHandle, dmz.stance.UpdateEndTimeHandle, true);
   }

   if (yesVotes.length > numberInGroup / 2) {

      tempHandles = dmz.object.subLinks(subHandle, dmz.stance.VoteLinkHandle) || [];
      tempHandles.forEach(function (voteHandle) {

         dmz.object.scalar(voteHandle, dmz.stance.VoteState, dmz.stance.VOTE_YES);
      });
      dmz.object.flag(subHandle, dmz.stance.UpdateEndTimeHandle, true);
   }
}

dmz.object.link.observe(self, dmz.stance.YesHandle, voteObserveFunction);

dmz.object.link.observe(self, dmz.stance.NoHandle, voteObserveFunction);

userVoted = function (userHandle, decisionHandle, vote) {

   dmz.object.link(vote ? dmz.stance.YesHandle : dmz.stance.NoHandle, userHandle, decisionHandle);
};

createDecisionObject = function (decisionValue, voteHandle, duration, reason) {

   var decision = dmz.object.create(dmz.stance.DecisionType);

   dmz.object.activate(decision);
   dmz.object.link(dmz.stance.VoteLinkHandle, decision, voteHandle);
   dmz.object.timeStamp(decision, dmz.stance.CreatedAtServerTimeHandle, 0);
   dmz.object.flag(decision, dmz.stance.UpdateStartTimeHandle, true);
   dmz.object.text(decision, dmz.stance.TextHandle, reason);
   dmz.object.link(dmz.stance.CreatedByHandle, decision, dmz.object.hil());

   if (decisionValue) {

      dmz.object.timeStamp(decision, dmz.stance.EndedAtServerTimeHandle, 0);
      dmz.object.flag(decision, dmz.stance.UpdateEndTimeHandle, true);
      duration *= 3600; //convert to unix seconds
      dmz.object.timeStamp(decision, dmz.stance.DurationHandle, duration);
      dmz.object.scalar(voteHandle, dmz.stance.VoteState, dmz.stance.VOTE_ACTIVE);
   }
   else {

      dmz.object.scalar(voteHandle, dmz.stance.VoteState, dmz.stance.VOTE_DENIED);
   }
};

resetLayout = function () {
   var widget;
   if (content) {

      widget = myLayout.takeAt(0);
      while (widget) {

         widget.hide();
         widget = myLayout.takeAt(0);
      };
   }
   myLayout.addStretch(1);
};

getTopVote = function (hil) {

   var groupHandle = dmz.stance.getUserGroupHandle(hil)
     , groupAdvisorHandles = dmz.object.superLinks(groupHandle, dmz.stance.AdvisorGroupHandle) || []
     , advisorVoteHandles
     ;

   ApprovalVotes = [];
   ActiveVotes = [];

   groupAdvisorHandles.forEach(function (advisorHandle) {

      advisorVoteHandles = dmz.object.superLinks(advisorHandle, dmz.stance.VoteLinkHandle) || [];
      advisorVoteHandles.forEach(function (voteHandle) {

         var postItem = dmz.ui.loader.load("VoteViewPost.ui")
           , buttonLayout = postItem.lookup("buttonLayout")
           , textLayout = postItem.lookup("textLayout")
           , postedByLabel = postItem.lookup("postedBy")
           , startTimeLabel = postItem.lookup("startTime")
           , endTimeLabel = postItem.lookup("endTime")
           , avatarLabel = postItem.lookup("avatarLabel")
           , questionLabel = postItem.lookup("question")
           , statusLabel = postItem.lookup("status")
           , yesVotesLabel = postItem.lookup("yesVotes")
           , noVotesLabel = postItem.lookup("noVotes")
           , reasonLabel = postItem.lookup("reason")
           , yesButton = dmz.ui.button.createPushButton("Approve")
           , noButton = dmz.ui.button.createPushButton("Deny")
           , timeBox = dmz.ui.spinBox.createSpinBox("timeBox")
           , decisionReason = dmz.ui.textEdit.create("decisionReason")
           , previouslyVoted = false
           , tempHandles
           , userLinks
           , userHandles
           , decisionHandle
           , userPicture
           , voteState = dmz.object.scalar(voteHandle, dmz.stance.VoteState)
           ;

         decisionReason.text("Decision Reason: ");
         yesButton.setStyleSheet("* { background-color: rgb(90, 230, 90); border-width: 5px; }");
         noButton.setStyleSheet("* { background-color: rgb(230, 90, 90); border-width: 5px; }");
         buttonLayout.insertWidget(0, yesButton);
         buttonLayout.insertWidget(1, noButton);

         tempHandles = dmz.object.subLinks(voteHandle, dmz.stance.CreatedByHandle) || [];
         tempHandles.forEach(function (handle) {
            postedByLabel.text("Posted By: " + dmz.object.text(handle, dmz.stance.DisplayNameHandle));
            userPicture = dmz.object.text(handle, dmz.stance.PictureHandle);
            avatarLabel.pixmap(dmz.ui.graph.createPixmap(dmz.resources.findFile(userPicture)));
         });
         questionLabel.text("Poll Question: " + dmz.object.text(voteHandle, dmz.stance.TextHandle));
         statusLabel.text("Current Status: " + dmz.stance.STATE_STR[voteState]);

         if (voteState === dmz.stance.VOTE_APPROVAL_PENDING) {

            postItem.setStyleSheet("* { background-color: rgb(230, 230, 230); border-width: 5px; }");
            startTimeLabel.text("Posted At: " + dmz.object.timeStamp(voteHandle, dmz.stance.CreatedAtServerTimeHandle));
            timeBox.maximum(48);
            timeBox.minimum(1);
            buttonLayout.insertWidget(2, timeBox);
            textLayout.insertWidget(0, decisionReason);
            startTimeLabel.text("");
            endTimeLabel.text("");
            reasonLabel.text("");
            yesVotesLabel.text("");
            noVotesLabel.text("");
            yesButton.observe(self, "clicked", function () {

               var duration = timeBox.value()
                 , reason = decisionReason.text()
                 ;

               createDecisionObject(true, voteHandle, duration, reason);
               initVoteForm();
            });
            noButton.observe(self, "clicked", function () {

               var reason = decisionReason.text();
               createDecisionObject(false, voteHandle, 0, reason);
               initVoteForm();
            });
            ApprovalVotes.push( { postItem: postItem });
         }
         else if (voteState === dmz.stance.VOTE_ACTIVE) {

            tempHandles = dmz.object.superLinks(voteHandle, dmz.stance.VoteLinkHandle) || [];
            tempHandles.forEach(function (handle) {

               /* see if user has voted befre or is a admin */
               userHandles = dmz.object.superLinks(handle, dmz.stance.NoHandle) || [];
               noVotesLabel.text("No Votes: " + userHandles.length);
               userHandles.forEach(function (userHandle) {

                  if (userHandle === hil) { previouslyVoted = true; }
               });

               userHandles = dmz.object.superLinks(handle, dmz.stance.YesHandle) || [];
               yesVotesLabel.text("Yes Votes: " + userHandles.length);
               userHandles.forEach(function (userHandle) {

                  if (userHandle === hil) { previouslyVoted = true; }
               });

               if (previouslyVoted || dmz.object.flag(hil, dmz.stance.AdminHandle)) {

                  yesButton.hide();
                  noButton.hide();
               }

               /* Set various text values */
               decisionHandle = handle;
               postItem.setStyleSheet("* { background-color: rgb(210, 210, 30); border-width: 5px; }");
               startTimeLabel.text("Posted At: " + dmz.object.timeStamp(handle, dmz.stance.CreatedAtServerTimeHandle));
               endTimeLabel.text("Ending At: " + dmz.object.timeStamp(handle, dmz.stance.EndedAtServerTimeHandle));
               reasonLabel.text("Advisor Reply: " + dmz.object.text(handle, dmz.stance.TextHandle));
            });
            yesButton.observe(self, "clicked", function () {

               userVoted(hil, decisionHandle, true);
               initVoteForm();
            });
            noButton.observe(self, "clicked", function () {

               userVoted(hil, decisionHandle, false);
               initVoteForm();
            });
            ActiveVotes.push( {postItem: postItem } );
         }
      });
   });
};

getPreviousVotes = function (hil) {

   var groupHandle = dmz.stance.getUserGroupHandle(hil)
     , groupAdvisorHandles = dmz.object.superLinks(groupHandle, dmz.stance.AdvisorGroupHandle) || []
     , advisorVoteHandles
     , groupVoteHandles = []
     , voteState
     ;

   PastVotes = [];
   groupAdvisorHandles.forEach(function (advisorHandle) {

      advisorVoteHandles = dmz.object.superLinks(advisorHandle, dmz.stance.VoteLinkHandle) || [];
      advisorVoteHandles.forEach(function (voteHandle) {

         groupVoteHandles.push(voteHandle);
      });
   });

   groupVoteHandles.forEach(function (voteHandle) {

      voteState = dmz.object.scalar(voteHandle, dmz.stance.VoteState);
      if (voteState !== dmz.stance.VOTE_APPROVAL_PENDING &&
          voteState !== dmz.stance.VOTE_ACTIVE) {

         var postItem = dmz.ui.loader.load("VoteViewPost.ui")
           , postedByLabel = postItem.lookup("postedBy")
           , startTimeLabel = postItem.lookup("startTime")
           , endTimeLabel = postItem.lookup("endTime")
           , questionLabel = postItem.lookup("question")
           , statusLabel = postItem.lookup("status")
           , yesVotesLabel = postItem.lookup("yesVotes")
           , noVotesLabel = postItem.lookup("noVotes")
           , reasonLabel = postItem.lookup("reason")
           , avatarLabel = postItem.lookup("avatarLabel")
           , userPicture
           , tempHandles
           , tempVotes
           ;

         // Get the vote creators name
         tempHandles = dmz.object.subLinks(voteHandle, dmz.stance.CreatedByHandle) || [];
         tempHandles.forEach(function (handle) {

            postedByLabel.text("Posted By: " + dmz.object.text(handle, dmz.stance.DisplayNameHandle));
            userPicture = dmz.object.text(handle, dmz.stance.PictureHandle);
            avatarLabel.pixmap(dmz.ui.graph.createPixmap(dmz.resources.findFile(userPicture)));
         });
         // Get the question and status of the vote
         questionLabel.text("Poll Question: " + dmz.object.text(voteHandle, dmz.stance.TextHandle));
         statusLabel.text("Current Status: " + dmz.stance.STATE_STR[voteState]);
         // Get the advisor reason from the decision object
         tempHandles = dmz.object.superLinks(voteHandle, dmz.stance.VoteLinkHandle) || [];
         tempHandles.forEach(function (decisionHandle) {

            // Get the start time, end time, reason and duration of the vote
            startTimeLabel.text("Posted At: " + dmz.object.timeStamp(decisionHandle, dmz.stance.CreatedAtServerTimeHandle));
            endTimeLabel.text("Ended At: " + dmz.object.timeStamp(decisionHandle, dmz.stance.EndedAtServerTimeHandle));
            reasonLabel.text("Advisor Reply: " + dmz.object.text(decisionHandle, dmz.stance.TextHandle));
            tempVotes = dmz.object.superLinks(decisionHandle, dmz.stance.YesHandle) || [];
            yesVotesLabel.text("Yes Votes: " + tempVotes.length);
            tempVotes = dmz.object.superLinks(decisionHandle, dmz.stance.NoHandle) || [];
            noVotesLabel.text("No Votes: " + tempVotes.length);
         });
         // Set the post item CSS
         if (voteState === dmz.stance.VOTE_YES) {

            postItem.setStyleSheet("* { background-color: rgb(90, 230, 90); border-width: 5px; }");
         }
         else if (voteState === dmz.stance.VOTE_NO) {

            postItem.setStyleSheet("* { background-color: rgb(230, 90, 90); border-width: 5px; }");
         }
         else if (voteState === dmz.stance.VOTE_DENIED) {

            postItem.setStyleSheet("* { background-color: rgb(180, 40, 40); border-width: 5px; }");
         }

         PastVotes.push( {postItem: postItem} );
      }
   });
}

displayPastVotes = function (hil) {

   var itor = 0;

   resetLayout();

   if (dmz.object.flag(hil, dmz.stance.AdminHandle)) {

      ApprovalVotes.forEach(function (item) {

         myLayout.insertWidget(itor, item.postItem);
         MainModule.highlight("Vote");
         itor += 1;
      });
   }

   ActiveVotes.forEach(function (item) {

      myLayout.insertWidget(itor, item.postItem);
      MainModule.highlight("Vote");
      itor += 1;
   });

   PastVotes.forEach(function (pastItem) {

      myLayout.insertWidget(itor, pastItem.postItem);
      itor += 1;
   });

};

initVoteForm = function () {

   var hil = dmz.object.hil();

   getPreviousVotes(hil);
   getTopVote(hil);
   displayPastVotes(hil);
};

dmz.module.subscribe(self, "main", function (Mode, module) {

   var list
     ;

   if (Mode === dmz.module.Activate) {

      list = MainModule.list;
      MainModule = module;
      module.addPage
         ( "Vote"
         , voteForm
         , function () {

              initVoteForm();
           }
         );
   }
});

init = function () {

   myLayout = dmz.ui.layout.createVBoxLayout();
   content.layout(myLayout);
   myLayout.addStretch(1);
};

init();
