var dmz =
	{ stance: require("stanceConst")
	, object: require("dmz/components/object")
	, objectType: require("dmz/runtime/objectType")
	, time: require("dmz/runtime/time")
	, message: require("dmz/runtime/messaging")
    , defs: require("dmz/runtime/definitions")
	}
	
	, LoginSuccessMessage = dmz.message.create("Login_Success_Message")
	, LoginErrorMessage = dmz.message.create("Login_Error_Message")
	, hil = false
	, haveLoggedIn = false
	, objectList = {}
	, typeList = {}
	, timeDelay = 6
	, timeAttr = dmz.defs.createNamedHandle("checker_time_attr")
	, timer
	;
	
LoginSuccessMessage.subscribe(self, function () {

	haveLoggedIn = true;
});	

dmz.object.flag.observe(self, dmz.object.HILAttribute,
function (objHandle, attrHandle, value) {

	if (haveLoggedIn && value && !timer) {
	
		hil = objHandle;
		Object.keys(objectList).forEach(function (key) {
			if (objectList[key].author && (objectList[key].author !== hil)) {
				delete objectList[key];
			}
		});
		
		timer = dmz.time.setRepeatingTimer(self, 60, function () {
			var hasErrored = false;
			Object.keys(objectList).forEach(function (key) {
				var data = objectList[key];
				data.timeCount += 1;
				if (data.timeCount >= timeDelay) {
		
					self.log.error("TIMEOUT_ERROR: " + dmz.object.type(data.handle) + " " +
						dmz.object.text(data.handle, dmz.stance.TextHandle));
					var value = dmz.object.scalar(data.handle, timeAttr) || 0;
					dmz.object.scalar(data.handle, timeAttr, value + 1);
					delete objectList[key];
					if (!hasErrored) { LoginErrorMessage.send(); }
					hasErrored = true;					
				}
			});	
		});
	}
});
	
dmz.object.create.observe(self, function (objHandle, objType) {

	if (typeList[objType]) {
	
		var author = dmz.stance.getAuthorHandle(objHandle);
		var timestamp = dmz.object.timeStamp(objHandle, dmz.stance.CreatedAtServerTimeHandle);
		objectList[objHandle] = {
			handle: objHandle,
			timeCount: 0
		};
		
		if (timestamp || (hil && author && (hil !== author))) {
			delete objectList[objHandle];
		}
	}
});

dmz.object.timeStamp.observe(self, dmz.stance.CreatedAtServerTimeHandle, function (handle, attr, value) {

	if (objectList[handle] && value) { delete objectList[handle]; }
});

dmz.object.link.observe(self, dmz.stance.CreatedByHandle,
function (linkObjectHandle, attrHandle, contentHandle, authorHandle) {

	if (objectList[contentHandle] && haveLoggedIn && hil && (hil !== authorHandle)) {
		delete objectList[contentHandle];
	}
});

(function () {

	var index;
	var array = [dmz.stance.PostType, dmz.stance.CommentType, dmz.stance.QuestionType, dmz.stance.AnswerType];
	for (index = 0; index < array.length; index += 1) {
		typeList[array[index]] = true;
	}
}());