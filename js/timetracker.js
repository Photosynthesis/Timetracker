var current_client, current_project, current_task, current_session;

var ttData;

var feedbackElement;

var eventWatchers = [];

var startDate;
var nowDate;
var counterId;
var currentDuration;

var defaultSettings = {
  top_level_title : "Client",
  show_billability : true,
  auto_synch : true,
  reminder_interval : false,
  reminder_title : "Pomodoro Complete!",
  reminder_message : "Please take a five minute break. <b>Breathe, stretch, look around!</b>",
  reminder_delay : 1
};

analyze = {};
taskList = {};
settingsView = {};
clientControls = {};
projectControls = {};

var currentView = taskList;

var flatData = [];

var reminderDelay = 0;

var endPicker = '';
var startPicker = '';

var lastTaskSaveTime;

var current_client = {};
var current_project = {};
var current_task = {};


var types = ['user','client','project','task','session'];

var editFields = {
  settings : {
    top_level_title : {
      label : "Top level title",
      type : "text",
    },
    show_billability : {
      label : "Show billability",
      type : "boolean"
    },
    auto_synch : {
      label : "Synch automatically",
      type : "boolean"
    },
    reminder_interval : {
      label : "Reminder interval",
      type : "text"
    },
    reminder_title : {
      label : "Reminder title",
      type : "text"
    },
    reminder_message : {
      label : "Reminder message",
      type : "textarea"
    },
    reminder_delay : {
      label : "Reminder delay",
      type : "text"
    },
    default_task_sort : {
      label : "Default task sort",
      type : "select",
      options :{"name":"Name", "priority":"Priority", "status":"Status", "time":"Time","Session count":"sessionCount","lastSessionTime":"Most recent session"}
    },
    default_task_sort_direction : {
      label : "Default task sort direction",
      type : "select",
      options :{"asc":"Ascending", "desc":"Descending"}
    }
  },
  client : {
    name : {
      label : "Name",
      type : "text"
    },
    id : {
      label : "ID",
      type : "text"
    }
  },
  project : {
    name : {
      label : "Name",
      type : "text"
    },
    id : {
      label : "ID",
      type : "text"
    }
  },
  task : {
    name : {
      label : "Name",
      type : "text"
    },
    id : {
      label : "ID",
      type : "text"
    },
    status : {
      label : "Status",
      type : "select",
      //options : [{text:"On hold", value:"onHold"},{text:"New", value:"new"},{text:"In process", value:"inProcess"},{text:"Completed", value:"completed"}]
      options :{"onHold":"On hold", "new":"New", inProcess:"In process", completed:"Completed"}
    },
    due : {
      label : "Due by",
      type : "date",
    },
    priority : {
      label : "Priority",
      type : "select",
      options :{"1":"1", "2":"2", "3":"3", "4":"4", "5":"5"},
      callback : function(){

      }
    },
    billable : {
      label : "Billable",
      type : "select",
      options : {"1":"Yes", "0":"No"}
    },
    notes : {
      label : "Notes",
      type : "textarea",
    }
  },
  session : {
    start_time : {
      label : "Start time",
      type: "text"
    },
    end_time : {
      label : "End time",
      type: "text"
    },
    notes : {
      label : "Notes",
      type : "textarea",
    }

  }
};

// Load Node HTTP module, if available
if(typeof require === "function"){
  var http = require('http');
}

if(typeof Notification == "object"){
  Notification.requestPermission();
}



/* ############################### INITIALIZE ################################# */

function ttInit(){


    feedbackElement = document.getElementById('feedback');

    if(!localStorage.ttData){

      ttData = {
        "userKey" : newId(),
        "userName" : '',
        "password" : '',
        "clients" : {},
        "settings" : defaultSettings,
        "synchQueue" : {}
      };

      $("#edit-popup").html('<h3>Bienvenue</h3>It looks like you haven\'t used the timetracker on this device before, or you\'ve cleared your local storage data. If you\'d like to synch this device with existing online data, enter your user key below.<form><input id="add-userkey-input" placeholder="Enter key"/><a class="button" onClick="saveUserKey()">Save</a></form>');

      $("#modal-bg").show();
      $("#edit-popup").show();

      return;


    }else{
      ttData = JSON.parse(localStorage.ttData);

      if(!ttData.settings){
         ttData.settings = defaultSettings;
         ttSave();
      }

      /*
      updateSelectOptionsFromData('client');

      clientControls.show();

      if(getMemberCount(ttData.clients) < 1){
         addClientForm();
      }
      */

      if(localStorage.ttClientId && typeof ttData.clients[localStorage.ttClientId] == "object"){
        dbg("Loading current client",ttData.clients[localStorage.ttClientId]);

        current_client = ttData.clients[localStorage.ttClientId];

        //setClient(localStorage.ttClientId);

        if(localStorage.ttProjectId && typeof current_client.projects[localStorage.ttProjectId] == "object"){
          dbg("Loading current project",current_client.projects[localStorage.ttProjectId]);

          current_project = current_client.projects[localStorage.ttProjectId];

          //setProject(current_project.id);

          if(localStorage.ttTaskId && typeof current_project.tasks[localStorage.ttTaskId] == "object"){

            current_task = current_project.tasks[localStorage.ttTaskId];

            //setTask(current_task.id);

            if(localStorage.ttSessionId){
              current_session = current_task.sessions[localStorage.ttSessionId];
              //continueSession();
            }
          }
        }else{
          dbg("No data found for localStorage.ttProjectId",localStorage.ttProjectId);
        }
      }
    }

   $("form").bind("keypress", function(e) {

     if (e.keyCode == 13) {

        dbg(document.activeElement,'Active element');

        if(document.activeElement.id == 'new-task-input'){
           saveNewTask();
        }else if(document.activeElement.id == 'add-project-input'){
           saveProject();
        }else if(document.activeElement.id == 'add-client-input'){
           saveClient();
        }

        return false;
     }

   });



   clientControls.show();

   if(typeof current_client == "object"){
     projectControls.show();
   }

   if(getMemberCount(ttData.clients) > 0){
      setView('taskList');
   }


   if(current_session){
      continueSession();
   }

   /* Load plugins! */
   for (pluginId in plugins){
     var scriptEl = document.createElement('script');
     scriptEl.src = "plugins/"+plugins[pluginId].name+"/"+plugins[pluginId].name+".conf.js";
     document.getElementsByTagName("head")[0].appendChild(scriptEl);
   }


   synchToServer();

}

/* ################################## INPUT HANDLING FUNCTIONS ################################## */
/** These functions should only be used for handling input from the DOM, calling data update functions
 *  as needed, and then emitting a (pseudo) event to notify the view updaters that something's happened.
 *  For now they are called from the DOM directly, which is considered so not cool, although it works fine.
 *  In some cases they still do other things, which should get migrated to appropriate view functions


/* ########################### CLIENT CONTROL ######################### */

function saveClient(){

  new_client = {
      'id' : newId(),
      'name' : gebi('add-client-input').value,
      'projects' : {}
  };

  ttData.clients[new_client.id] = new_client;
  ttSave();

  synchQueue.add("client",new_client.id);

  emitEvent('client','add');

  current_client = ttData.clients[new_client.id];

  emitEvent('client','set',new_client.id);

  // All this stuff goes to view functions or dispatcher...
  //updateSelectOptionsFromData('client');
  //cancelAddClient();

  //setClient(new_client.id);

  setFeedback('Client saved','success');

}


function setClient(clientId){

  client_select = gebi('client-select');

  if(clientId){
    client_select.value = clientId;
  }else{
    clientId = client_select.value;
  }

  if(clientId == "all"){

    current_client = "all";

    //gebi('project-controls').style.display = "none"; // Move

  }else{


    //gebi('project-controls').style.display = "block";  // Move

    current_client = ttData.clients[client_select.value];


    //$("#edit-project-button").hide();  // Move

    // Count how many projects this client has
    /*
    project_count = 0;

    if(typeof current_client.projects == "object"){
      for(project_id in current_client.projects){
         project_count += 1;
      }
    }

    if(project_count > 0){
      updateSelectOptionsFromData('project');
      cancelAddProject();
    }else{
      addProjectForm();
      updateSelectOptionsFromData('project');
    }

    $('#project-controls').show();
    */
  }

  /*

  if(currentView.setClient){
    currentView.setClient(clientId);
  }
  */

  current_project = 'all';

  dbg("Sending client to emitEvent",clientId);

  emitEvent("client","set",clientId);
  emitEvent("project","set","all");

  ttSaveCurrent();

}




/* ######################### TRACK PROJECT CONTROLS ######################### */

/*
function addProjectForm(){
   document.getElementById('add-project-form').style.display = "block";
   document.getElementById('select-project-form').style.display = "none";
}

function cancelAddProject(){
  document.getElementById('add-project-input').value = '';
  document.getElementById('add-project-form').style.display = "none";
  document.getElementById('select-project-form').style.display = "block";
}

*/

function saveProject(){

  new_project = {
      'id' : newId(),
      'name' : document.getElementById('add-project-input').value,
      'tasks' : {}
  };

  if(typeof ttData.clients[current_client.id].projects != "object"){
    ttData.clients[current_client.id].projects = {};
  }

  ttData.clients[current_client.id].projects[new_project.id] = new_project;
  ttSave();

  synchQueue.add("project",new_project.id);

  emitEvent("project","add",new_project.id);
  /*
  updateSelectOptionsFromData('project');
  cancelAddProject();
  */
  setProject(new_project.id);
  setFeedback('Project saved','success');
}



function setProject(id){

  project_select = document.getElementById('project-select');

  if(id){
    project_select.value = id;
  }else{
    id = project_select.value;
  }

  current_task = '';


  dbg("P ID in setP()",id);
  dbg("P ID in setP()",id);


  if(id != 'all' && id != ''){

    $("#edit-project-button").show();

    // This could be replaced with a call to getItemById(), but that would be slower, so we'll leave it like this for now..

    current_project = ttData.clients[current_client.id].projects[id];

  }else{
    current_project = '';
  }

  dbg("Current P in setP()",current_project);


  emitEvent('project','set',id);

  ttSaveCurrent();
}




/* ########################### TRACK TASK CONTROLS ########################## */



function setTask(task_id){
  if(task_id){
    if(typeof current_project == "object" && current_project.tasks[task_id]){
      current_task = current_project.tasks[task_id];
      ttSaveCurrent();
    }
  }
}


function saveNewTask(projectId,task_name){

    var taskSaveTimeObj = new Date();
    var taskSaveTime = (taskSaveTimeObj.getTime());

    if((taskSaveTime - lastTaskSaveTime) < 500){

      dbg("Task was saved within 500 ms. Starting task:",lastTaskSaveId);
      dbg("lastTaskSaveTime",lastTaskSaveTime);
      dbg("taskSaveTime",taskSaveTime);

      startGeneralSession(lastTaskSaveId);
      return;
    }



  if(projectId){
    var branch = getBranchById("project",projectId);
    current_client = branch.client;
    current_project = branch.project;
  }

  if(!task_name){
    task_name = document.getElementById('new-task-input').value;
    document.getElementById('new-task-input').value = '';
  }

  var new_task = {
    'id' : newId(task_name,'task'),
    'name' : task_name,
    'status' : 'new',
    'sessions' : {}
  };

  if(gebi("billable-input")){
    if(gebi("billable-input").checked == true){
      new_task.billable = "1";
    }else{
      new_task.billable = "0";
    }
  }else{
      new_task.billable = "1";
  }

  current_task = new_task;

  if(typeof current_project.tasks != "object"){
    current_project.tasks = {};
  }

  current_project.tasks[new_task.id] = new_task;

  ttData.clients[current_client.id].projects[current_project.id].tasks = current_project.tasks;

  ttSave();

  setTask(new_task.id);

  lastTaskSaveTime = taskSaveTime;
  lastTaskSaveId = new_task.id;


  synchQueue.add("task",new_task.id);

  emitEvent("task","added");

  return new_task.id;

}

/* Update task from "completed" checkbox */
function setTaskComplete(task_id,element){

  task = getItemById("task",task_id);

  if(task.status == "completed"){
    task.status = "inProcess";
  }else{
    task.status = "completed";
  }

  updateItemById("task",task_id,task);

  emitEvent("task","updated");

  ttSave();

}


/* ######################### TRACK SESSION CONTROL ########################## */


function startSession(){

  startDate = moment();

  current_session = {
    'id' : newId(),
    'start_time' : startDate.format("YYYY-MM-DD HH:mm:ss"),
  };

  updateDataObject('session',current_session);
  counterId = setInterval(incrementCurrentDuration, 1000);
  showInSession();
  ttSave();
  ttSaveCurrent();
}

/* Wrapper to start session by task ID, without current client or project set */

function startGeneralSession(taskId) {

   var branch = getBranchById("task",taskId);
   current_client = branch.client;
   current_project = branch.project;
   current_task = branch.task;

   startSession();

}

function continueSession(){
  startDate = moment(current_session.start_time);
  counterId = setInterval(incrementCurrentDuration, 1000);
  showInSession();
}





function endSession(){

  clearInterval(counterId);

  current_session.end_time = moment().format("YYYY-MM-DD HH:mm:ss");

  current_session.notes = $("#session-notes-input").val();

  if(document.getElementById("task-complete-input").checked == true){
    current_task.status = "completed";
    task_complete_feedback = " <b>Task complete!<b>";
    feedback_class = "success";
  }else{
    current_task.status = "inProcess";
    task_complete_feedback = "";
    feedback_class = "notice";
  }

  current_task.time += timeDiffSecsFromString(current_session.start_time,current_session.end_time);

  updateDataObject('task',current_task);
  updateDataObject('session',current_session);
  pastSessionId = current_session.id;
  current_session = '';
  delete localStorage.ttSessionId;
  ttSave();
  ttSaveCurrent();
  document.getElementById('active-session').style.display = 'none';
  document.title = "Timetracker";
  edit_button = '<form style="display:inline"><a class="button" onClick="showGeneralEditForm(\'session\',\''+pastSessionId+'\')">Edit session</a></form>';
  setFeedback("Session Ended. Duration was "+currentDuration+task_complete_feedback+edit_button,feedback_class);

  taskList.filter(); // Move
  taskList.update(); // Move


  synchQueue.add("session",pastSessionId);

  emitEvent('session','ended');

  dbg("Auto synch setting",getSetting("auto_synch"));

  if(getSetting("auto_synch") == "yes"){
    synchToServer();
  }

}

function showInSession(){

  gebi('active-session').innerHTML =  '<div class="centered-box"><div id="current-info"><b>'+current_client.name+'</b> > <b>'+current_project.name+'</b> > <b>'+current_task.name+'</b></div><div id="current_duration"><span style="color:#dddddd">00:00:00</span></div><input type="text" id="session-notes-input" placeholder="Add notes" /><div><input type="checkbox"  id="task-complete-input"/><label for="task-complete-input">Task complete</label></div><a class="button" onClick="endSession()">End Session</a></div>';
  gebi('active-session').style.display = 'block';

}


function incrementCurrentDuration() {

    currentDurationSeconds = moment().diff(startDate)/1000;
    currentDuration = timeFromSeconds(currentDurationSeconds);
    document.getElementById('current_duration').innerHTML = currentDuration;
    document.title = currentDuration + ' - Timetracker';

    if(getSetting('reminder_interval') && (currentDurationSeconds/60) > (parseFloat(getSetting('reminder_interval'))+reminderDelay)){

      desktopNotify(getSetting('reminder_message'),getSetting('reminder_title'));

      reminderDelay += parseFloat(getSetting('reminder_delay'));

    }
}


/* ####################### FEEDBACK & NOTIFICATIONS ######################### */


function hideFeedback(){
  $('#feedback').hide();
}

function setFeedback(message,type,stayVisible){

  type || (type = "notice");

  stayVisible || (stayVisible = false);

  feedbackElement.innerHTML = message;
  feedbackElement.className = type;
  feedbackElement.style.display = 'block';

  if(!stayVisible){
    setTimeout(hideFeedback,8000);
  }
}

function desktopNotify(message,title,icon) {
  title || (title = "Timetracker notification");

  options = {
      body: message,
      icon: icon
  };
  new Notification(title,options);
}


function saveUserKey(){

  key_val = $("#add-userkey-input").val();
  ttData.userKey = key_val;

  ttSave();

  $("#modal-bg").hide();
  $("#edit-popup").hide();
  $("#edit-popup").html('');

  ttInit();

}


function deleteLocalStorage(){
  if(confirm("Are you sure you would like to delete all your local time and task data?")){
    delete localStorage.ttData;
    delete localStorage.ttClientId;
    delete localStorage.ttProjectId;
    delete localStorage.ttTaskId;
    delete localStorage.ttSessionId;
    setFeedback('LocalStorage deleted. Refresh to see changes.');
  }
}


/* ############################# EDIT FUNCTIONS ############################# */


function editJson(){
  /*
  var dldLink = document.createElement('a');
  dldLink.href = "data:application/json;charset=utf-8,"+JSON.stringify(ttData);
  dldLink.download = "Timetracker-Data-"+moment().format("YYYY-MM-DD_HH-mm-ss")+".JSON";
  dldLink.className = "button";
  dldLink.innerHTML = "Download JSON data";
  gebi('json-output').appendChild(dldLink);
  */
  gebi('json-output').innerHTML = '';
  var jsonForm = document.createElement('form');
  jsonForm.innerHTML = '<textarea id="edit-json-textarea">'+JSON.stringify(ttData,null,'   ')+'</textarea>';
  gebi('json-output').appendChild(jsonForm);

  gebi('json-output').innerHTML += '<a href="#void" class="button" onClick="saveJson()">Save</a>';
  gebi('json-output').style.display = "block";
}

function downloadJson(){
  dbg("Download JSON called");

  var json = JSON.stringify(ttData,null,'  ');
  var blob = new Blob([json], {type: "application/json"});
  var url  = URL.createObjectURL(blob);


  var link = document.createElement('a');
  link.href = url;
  //link.href = "data:application/json;charset=utf-8,'"+JSON.stringify(ttData,null,'  ')+"'";
  link.download = "Timetracker-Data-"+moment().format("YYYY-MM-DD_HH-mm-ss")+".json";
  gebi('json-output').appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
}

function saveJson(){
   input_json = $("#edit-json-textarea").val();

   try{
      input_data = JSON.parse(input_json);
   }catch(err){
      setFeedback('Oops! JSON input is invalid. Error: '+err,'error');
      return;
   }

   ttData = input_data;
   ttSave();
   setFeedback('JSON data saved.');
   $("#json-output").hide();
}


function cancelEditForm(){
  $('#edit-popup').html('');
  $('#modal-bg').hide();
  $('#edit-popup').hide();
}


function saveGeneralEditForm(type,id){

  if(type == 'settings'){
    var item = ttData.settings;
  }else{
    var item = getItemById(type,id)
  }

  for (key in editFields[type]){
    if(document.getElementById(type+"-"+key+"-edit-input")){
      item[key] = document.getElementById(type+"-"+key+"-edit-input").value;
    }else{
      dbg("Field not found in edit form:",key);
    }
  }




  /* This is excessively lame, and is only here because of issues with Vue.js... */
  if(type == "task"){
    item.displayStatus = editFields.task.status.options[item.status];
  }

  updateItemById(type,id,item);

  /* Unset task time value if edited session */
  if(type == "session"){
    var branch = getBranchById(type,id);
    var parentTask = branch.task;

    delete parentTask.time;

    updateItemById("task",parentTask.id,parentTask);

  }


  if(type != "session" && type != "settings" && type != "task"){
    updateSelectOptionsFromData(type);
  }

  ttSave();
  setFeedback('Item updated');
  cancelEditForm();

  if(typeof currentView.update == "function"){
    currentView.update();
  }
}

function deleteConfirm(msg,yesCallback,noCallback){
  gebi("delete-confirm-message").innerHTML = msg;
  gebi("delete-confirm-yes").onclick = yesCallback;
  gebi("delete-confirm-no").onclick = noCallback;
  $("#modal-bg").show();
  $("#delete-confirm").show();

}

function deleteGeneralFromEditForm(type,id){

/*
  deleteConfirm("Are you sure you would like to delete this "+type+" (and all sub items?",function(){


  }
*/

  if(confirm("Are you sure you would like to delete this "+type+" (and all sub items)?")){

    dbg('deleteGeneralFromEditForm() with:',[type,id]);

    deleteItemById(type,id);

    if(type != "session" && type != "task"){
      updateSelectOptionsFromData(type);                 // Move
    }

    ttSave();
    setFeedback(type+' deleted.');

    emitEvent(type,"delete",id);
    cancelEditForm();
  }
}

/* Edit form that doesn't require current values to be set */

function showGeneralEditForm(type,id){

  if(!id){
    if(type == "client" && typeof current_client == "object"){
      id = current_client.id;
    }else if(type == "project" && typeof current_project == "object")
      id = current_project.id;
  }

  if(!id){
    setFeedback("No item ID or current item in edit!","error");
  }

  edit_element = document.getElementById("edit-popup");

  $("#edit-popup").html("<h3>Edit "+type+"</h3><form>");

  properties = getItemById(type,id);

  for (key in editFields[type]){

    var field = editFields[type][key];

    if(typeof properties[key] != "object" && properties[key]){
      var val = properties[key];
    }else if(field.defaultVal){
      var val = field.defaultVal;
    }else{
      var val = "";
    }

    if(field.type == "text"){
         $("#edit-popup").append('<div class="edit-field">'+field.label+' <input type="text" value="'+val+'" id="'+type+'-'+key+'-edit-input"/></div>');
    }else if(field.type == "select"){

      var fieldDiv = document.createElement('div');
      fieldDiv.className = "edit-field";
      fieldDiv.innerHTML = field.label

      var select = document.createElement('select');
      select.id = type+'-'+key+'-edit-input';

      for (var optkey in field.options){
        var option = new Option(field.options[optkey],optkey);
        select.options.add(option);
      }

      select.value = val;

      fieldDiv.appendChild(select);
      $("#edit-popup").append(fieldDiv);

    }else if(field.type == "textarea"){
      $("#edit-popup").append('<div class="edit-field">'+field.label+' <textarea id="'+type+'-'+key+'-edit-input">'+val+'</textarea></div>');
    }

  }

  $("#edit-popup").append('<div>');
  $("#edit-popup").append('<a class="button" onClick="saveGeneralEditForm(\''+type+'\',\''+id+'\')">Save</a>');
  $("#edit-popup").append('<a class="button" onClick="cancelEditForm()">Cancel</a>');

  if(type != "settings"){
    $("#edit-popup").append('<a class="button red" onClick="deleteGeneralFromEditForm(\''+type+'\',\''+id+'\')">Delete Item</a></div></form>');
  }

  $("#modal-bg").show();
  $("#edit-popup").show();

}





function setView(view){

    if(currentView){
       if(typeof currentView.hide == "function"){
          currentView.hide();
       }
    }

    if(view == "analyze"){
      currentView = analyze;
    }else if(view == "taskList"){
      currentView = taskList;
    }else if(view == "settingsView"){
      currentView = settingsView;
    }

    viewElements = document.getElementsByClassName("view-container");

    for (var i = 0; i < viewElements.length; ++i){
       if(viewElements[i].id == view+"-view"){
          viewElements[i].style.display = "block";
       }else{
          viewElements[i].style.display = "none";
       }
    }

    if(typeof currentView.show == "function"){
      currentView.show();
    }
}




/** ############################ The Big Ugly Traffic Controller ############################### **/
/** Which takes pseudo-events from the input functions and updates views (or calls other input
 * functions) accordingly. This is sort of a placeholder, and should probably be replaced with proper
 * event listening at some future date.
 **/


function emitEvent(type,action,value){

  dbg("Event emitted",type+" "+action+" "+value);
  //Testing a different approach...
  // This could also be done as a structured object (so directly "addressable" items), but we'll do
  // it this way for now for simplicity
  for(var i = 0; i < eventWatchers.length; i++){
    var eW = eventWatchers[i];
    if(eW.type == type && eW.action == action){
      if(typeof eW.callback === "function"){
        eW.callback.call(eW,value);
      }
    }
  }

  /* This function should end here. Following conditional statements will be removed */
  if(type == "task"){
    if(action == "delete" || action == "edited" || action == "added" || action == "updated" ){
      if(typeof currentView.filter == "function"){
         currentView.filter();
      }
      if(typeof currentView.update == "function"){
         currentView.update();
      }

    }
  }else if(type == "client"){
    if(action == "set"){
      setProject("all");

      if(typeof currentView.setClient == "function"){
         currentView.setClient(value);
      }else{

        if(typeof currentView.filter == "function"){
           currentView.filter();
        }
        if(typeof currentView.update == "function"){
           currentView.update();
        }

      }
    }
  }else if(type == "project"){
    if(action == "set"){
      if(typeof currentView.setProject == "function"){
         currentView.setProject();
      }
    }
  }
}


function addEventWatcher(type,action,callback,owner){
  if(typeof type == "object"){
    eventWatchers.push(type);
  }else{
     eventWatchers.push({type:type, action:action,callback:callback,owner:owner});
  }
}

function addEventWatchers(watchers){
  for(var i = 0; i < watchers.length; i++){
    eventWatchers.push(watchers[i]);
  }
}

function removeEventWatchers(owner){
  for(var i = 0; i < eventWatchers.length; i++){
    var eW = eventWatchers[i];
    if(eW.owner == owner){
      eventWatchers.splice(i,1);
    }
  }
}

function getEventWatchers(owner){
  var ownerWatchers = [];
  for(var i = 0; i < eventWatchers.length; i++){
    var eW = eventWatchers[i];
    if(eW.owner == owner){
      ownerWatchers.push(eW);
    }
  }
  return ownerWatchers;
}


/* ########################### Client Controls ########################## */

clientControls.show = function(){

  addEventWatcher('client','add',function(id){
    clientControls.update();
    dbg("Calling cancelAddClientFOrm in client add event watcher");
    clientControls.cancelAddClientForm();
  },'clientControls');

  addEventWatcher('server','synch',function(){
    clientControls.update();
  },'clientControls');

  addEventWatcher('client','set',function(id){
    dbg("clientControls client set watcher fired with id",id);
    if(id == "all" || id == ""){
      gebi("edit-client-button").style.display = "none";
    }else{
      gebi("edit-client-button").style.display = "block";
    }

    gebi("client-select").value = id;

  },'clientControls');

  clientControls.update();

  gebi("client-controls").style.display = "block";

}

clientControls.hide = function(){
  removeEventWatchers('clientControls');
  gebi("#client-controls").style.display = "none";
}

clientControls.update = function(){

    var options = [];

    for (client_id in ttData.clients){
      options.push([client_id,ttData.clients[client_id].name]);
    }

    options.sort(function(a, b) {
      a = a[1];
      b = b[1];
      return a.localeCompare(b);
    });

    options.unshift(['all','All Clients...']);

    updateSelectOptions(gebi("client-select"),options);

    var currentValue = 'all';

    if(typeof current_client == "object"){
       currentValue = current_client.id || "all";
    }
    gebi("client-select").value = currentValue;

}

clientControls.showAddClientForm = function(){
   gebi('add-client-form').style.display = "block";
   gebi('select-client-form').style.display = "none";
}

clientControls.cancelAddClientForm = function(){
  gebi('add-client-input').value = '';
  gebi('add-client-form').style.display = "none";
  gebi('select-client-form').style.display = "block";
}



/* ########################### Project Controls ########################## */

projectControls = {}

projectControls.show = function(){

  if(getEventWatchers('projectControls').length < 1){

      addEventWatcher('server','synch',function(){
        projectControls.update();
      },'projectControls');

      addEventWatcher('project','set',function(id){

        dbg("Project set watcher fired");

        if(id == "all" || id == ""){
          gebi("edit-project-button").style.display = "none";
        }else{
          gebi("edit-project-button").style.display = "block";
        }

        projectControls.update();
      },'projectControls');

      addEventWatcher('client','set',function(id){
        if(id == "all"){
          projectControls.hide();
        }else{
          projectControls.show();
        }

      },'projectControls');

      addEventWatcher('project','delete',function(id){

        dbg("Project delete watcher fired");

        setProject("all");

        if(current_client.projects.length < 1){
          projectControls.showAddProjectForm();
        }

        projectControls.update();
      },'projectControls');
  }

  projectControls.update();
  gebi("project-controls").style.display = "block";

}

projectControls.hide = function(){
  // removeEventWatchers('projectControls');
  gebi("project-controls").style.display = "none";
}

projectControls.update = function(){

    dbg("Updating project controls");

    var options = [];

    if(typeof current_client == "object" && current_client != "all"){

      if(getMemberCount(current_client.projects) > 0){
        projectControls.cancelAddProjectForm();

        for (project_id in current_client.projects){
           options.push([project_id,current_client.projects[project_id].name]);
        }

        options.sort(function(a, b) {
            a = a[1];
            b = b[1];
            return a.localeCompare(b);
        });

        options.unshift(['all','All Projects...']);

        updateSelectOptions(gebi("project-select"),options);

        var currentValue = 'all';

        if(typeof current_project == "object"){
           currentValue = current_project.id || "all";
        }

        dbg("Setting project select value to",currentValue);
        dbg("Current_project",current_project);

        gebi("project-select").value = currentValue;
      }else{
        projectControls.showAddProjectForm();
      }
    }

}

projectControls.showAddProjectForm = function(){
   gebi('add-project-form').style.display = "block";
   gebi('select-project-form').style.display = "none";
}

projectControls.cancelAddProjectForm = function(){
  gebi('add-project-input').value = '';
  gebi('add-project-form').style.display = "none";
  gebi('select-project-form').style.display = "block";
}


/* These will be removed ... */

function addClientForm(){
   gebi('add-client-form').style.display = "block";
   gebi('select-client-form').style.display = "none";
}

// And this too
function cancelAddClient(){
  gebi('add-client-input').value = '';
  gebi('add-client-form').style.display = "none";
  gebi('select-client-form').style.display = "block";
}




/* ########################### TASK LIST VIEW ######################### */

taskList.show = function(){

  addEventWatcher('client','set',function(clientId){

    delete taskList.projectFilter;

    if(clientId == "all" || clientId == ""){
      delete taskList.clientFilter;
    }else{
      taskList.clientFilter = {
        type : "client",
        field : "id",
        condition : "equals",
        value : current_client.id
      };

    }

    taskList.update();

  },'taskList');

  addEventWatcher('server','synch',function(){
    taskList.update();
    dbg("taskList server synch watcher fired");
  },'taskList');

  addEventWatcher('project','set',function(projectId){

      if(projectId == "all" || projectId == ""){
          delete taskList.projectFilter;
      }else{
          taskList.projectFilter = {
            type : "project",
            field : "id",
            condition : "equals",
            value : projectId
          };

      }

      taskList.update();

  },'taskList');



  if(getCurrent("client") && getCurrent("client") != "all" && !taskList.clientFilter){
      taskList.clientFilter = {
        type : "client",
        field : "id",
        condition : "equals",
        value : current_client.id
      };
  }


  if(getCurrent("project") && getCurrent("project") != "all" && !taskList.projectFilter){
      taskList.projectFilter = {
        type : "project",
        field : "id",
        condition : "equals",
        value : current_project.id
      };
  }

  if(!taskList.sortBy){
    taskList.sortBy = getSetting('default_task_sort');
    taskList.sortDirection = getSetting('default_task_sort_direction');
  }
  dbg("Tasklist.sortBy",taskList.sortBy);

  taskList.update();

}

taskList.hide = function(){
  removeEventWatchers('taskList');
}

taskList.filter = function(){

    taskList.tasks = [];

    var fs = [];

    if(taskList.clientFilter){
      fs.push(taskList.clientFilter);
    }
    if(taskList.projectFilter){
      fs.push(taskList.projectFilter);
    }

    dbg("Tasklist filters",fs);

    loopData(fs,function(){
      if(this.task){

        if(!this.task.time){
          this.task.time = 0;
          for (var sesId in this.task.sessions){
            if(this.task.sessions[sesId].start_time && this.task.sessions[sesId].end_time){
                this.task.time += timeDiffSecsFromString(this.task.sessions[sesId].start_time,this.task.sessions[sesId].end_time);
            }

          }
        }

        this.task.sessionCount = getMemberCount(this.task.sessions);

        if(this.task.sessionCount > 0){
          var sesKeys = Object.keys(this.task.sessions);
          var lastSession = this.task.sessions[sesKeys[sesKeys.length-1]];

          this.task.lastSessionTime = this.task.sessions[sesKeys[sesKeys.length-1]].end_time;
        }else{
          this.task.lastSessionTime = "";
        }





        this.task.meta = {};

        if(typeof current_client != "object" || current_client == ""){
          this.task.client = this.client.name;
        }else{
          this.task.client = '';
        }

        if(typeof current_project !== "object"){
          this.task.project = truncate(this.project.name,25)+" ";
        }else{
          this.task.project = '';
        }

        if(this.task.project && this.task.client){
          this.task.metaParentage =  "<span>"+this.task.client+" > "+this.task.project+"</span>";
        }else if(this.task.project){
          this.task.metaParentage =  "<span>"+this.task.project+"</span>"
        }else{
          this.task.metaParentage =  "";
        }

        this.task.truncateName = truncate(this.task.name,55);


        if(this.task.time > 0){
          this.task.metaPrettyTime = "<span>"+prettyTime(this.task.time)+"</span>";
        }else{
          this.task.metaPrettyTime = '';
        }

        this.task.metaDisplayStatus = "<span>"+editFields.task.status.options[this.task.status]+"</span>";

        taskList.tasks.push(this.task);
      }
      return "continue";
    });


   if(taskList.tasks.length < 1){
     document.getElementById("no-data-found-table").style.display = "table-row";
   }else{
     document.getElementById("no-data-found-table").style.display = "none";
   }
}

taskList.hideNewTaskForm = function(){
  gebi("task-form").style.display = "none";
}

taskList.sort = function(field){
    taskList.sortData(field);
    taskList.refresh();
}

taskList.sortData = function(field){

    //taskList.sortDirection = "asc";
    if(field){
      if(taskList.sortBy == field){
        if(taskList.sortDirection == "asc"){
          taskList.sortDirection = "desc";
        }else{
          taskList.sortDirection = "asc";
        }
      }else{
        taskList.sortBy = field;
      }
    }

    taskList.tasks.sort(function(a, b) {

      if(!a[taskList.sortBy]){
        a[taskList.sortBy] = '';
      }
      if(!b[taskList.sortBy]){
        b[taskList.sortBy] = '';
      }
      // Numeric sort
      if(taskList.sortBy == "time" || taskList.sortBy == "sessionCount"){
        if(taskList.sortDirection == "desc"){
          return b[taskList.sortBy]-a[taskList.sortBy];
        }else{
          return a[taskList.sortBy]-b[taskList.sortBy];
        }
      // String sort
      }else{
        if(taskList.sortDirection == "desc"){
          return b[taskList.sortBy].toString().localeCompare(a[taskList.sortBy].toString());
        }else{
          return a[taskList.sortBy].toString().localeCompare(b[taskList.sortBy].toString());
        }
      }


   });
}

taskList.update = function(){
   taskList.filter();
   taskList.sortData();
   taskList.refresh();
}

taskList.refresh = function(){

   var addTaskForm = gebi("tasklist-new-task-form");
   var templateEl = gebi('task-list-item-template');
   var template = templateEl.innerHTML;
   var listContainer = templateEl.parentNode;

   listContainer.innerHTML = '';

   if(gebi("project-select").value != "all" && gebi("project-select").value != ""){
     addTaskForm.style.display = "block";
   }else{
     addTaskForm.style.display = "none";
   }

   listContainer.appendChild(addTaskForm);
   listContainer.appendChild(templateEl);


  for (taskListKey in taskList.tasks){
     var task = taskList.tasks[taskListKey];



     if(taskList.hideCompletedTasks == false || task.status != "completed"){

       var templateData = [];

       for (taskKey in task){
          templateData.push({placeholder: "{{task."+taskKey+"}}", value: task[taskKey]});
       }

       if(task.status == "completed"){
         var completedFlag = "checked";
       }else{
         var completedFlag = "";
       }
       dbg(getSetting("show_billability"));
       if(task.billable == "1" && getSetting("show_billability") == "yes"){
          var billable_display = "inline-block";
       }else{
          var billable_display = "none";
       }


       var completedInput = "<input type=\"checkbox\" name=\"task-completed\" "+completedFlag+" onClick=\"setTaskComplete('"+task.id+"')\"/>";

       templateData.push({placeholder:"{{checkCompleted}}",value: completedInput});
       templateData.push({placeholder:"{{billable_display}}",value: billable_display});


       if(task.prettyTime){
         var metaSeparator = "|";
       }else{
         var metaSeparator = "";
       }

       templateData.push({placeholder:"{{metaSeparator}}",value: metaSeparator});

       var taskEl = templateEl.cloneNode(false);
       taskEl.id = "task-"+task.id;
       taskEl.style.display = "block";
       taskEl.innerHTML = fillTemplate(templateData,template);
       templateEl.parentNode.appendChild(taskEl);
     }
  }

  templateEl.style.display = "none";

}


taskList.hideCompleted = function(){
   taskList.hideCompletedTasks = gebi("hide-completed").checked ? true : false;
   taskList.update();
}


/* ################################ ANALYZE VIEW ################################ */

analyze.show = function(){

    makeFlatData();

    var tableFields = {
      client:"Client",
      project:"Project",
      task:"Task",
      start_time:"Start Time",
      duration:"Duration"
    };

    analyze.totals = {};
    analyze.totals.totalTimeHMS = '';
    analyze.totals.totalBillableTimeHMS = '';
    analyze.tableData = flatData;

    analyze.filters = {
            clientId : current_client.id || "all",
            projectId : current_project.id || "all",
            taskId : "all",
            startTime : "all",
            endTime : "all"
    }




    if(!analyze.startPicker){
      analyze.startPicker = new Pikaday({
          field: document.getElementById('filter-start-time'),
          format: 'YYYY-MM-DD'//,
       //   onSelect: function() {
       //      analyze.filters.startTime = document.getElementById('filter-start-time').value;
       //      analyze.filter();
       //   }
      });
    }

    if(!analyze.endPicker){
      analyze.endPicker = new Pikaday({
          field: document.getElementById('filter-end-time'),
          format: 'YYYY-MM-DD'//,
         // onSelect: function() {
         //    analyze.filters.endTime = document.getElementById('filter-end-time').value+" 23:23:59";
         //    analyze.filter();
         // }
      });
    }

    analyze.filter();
}

analyze.setStartTime = function(){
   analyze.filters.startTime = document.getElementById('filter-start-time').value;
   analyze.filter();
}

analyze.setEndTime = function(){
   var end = document.getElementById('filter-end-time').value;
   if(end != ""){
     var value = end+" 23:59:59";
   }else{
     var value = "";
   }
   analyze.filters.endTime = value;
   analyze.filter();
}

analyze.update = function(){
   makeFlatData();
   analyze.filter();
}

analyze.setClient = function(clientId){
    analyze.filters.clientId = clientId || "all";
    analyze.filter();
}

analyze.setProject = function(projectId){
    analyze.filters.projectId = current_project.id || "all";
    analyze.filter();
}

analyze.filter2 = function (){
  analyze.totals = {
    time : 0,
    billableTime : 0,
    sessionCount : 0
  };

  analyze.data = [];
  var fs = [];

  /* Convert filters. Eventually these should start in loop-compatible filter format */
  if(analyze.filters.clientId != "all"){
    fs.push({
      condition : "equals",
      field: "id",
      type : "client",
      value : analyze.filters.clientId
    });
  }
  if(analyze.filters.projectId != "all"){
    fs.push({
      condition : "equals",
      field: "id",
      type : "project",
      value : analyze.filters.projectId
    });
  }
  if(analyze.filters.startTime != "all"){
    fs.push({
      condition : ">",
      field: "start_time",
      type : "session",
      value : analyze.filters.startTime
    });
  }
  if(analyze.filters.endTime != "all"){
    fs.push({
      condition : "<",
      field: "end_time",
      type : "session",
      value : analyze.filters.endTime
    });
  }

  loopData(fs,function(){

      analyze.data[this[this.level].id] = {
        type : this.level,
        name : this[this.level].name,
        time : 0,
        billableTime : 0
      };

      if(this.level == "task"){
        var taskTotal = 0;

        for (var sesId in this.task.sessions){
          if(this.task.sessions[sesId].start_time && this.task.sessions[sesId].end_time){
             taskTotal += timeDiffSecsFromString(this.task.sessions[sesId].start_time,this.task.sessions[sesId].end_time);
          }
        }

        if(this.task.billable == "1"){
            analyze.data[this.client.id].billableTime += taskTotal;
            analyze.data[this.project.id].billableTime += taskTotal;
            analyze.data[this.task.id].billableTime += taskTotal;
        }

        analyze.data[this.client.id].time += taskTotal;
        analyze.data[this.project.id].time  += taskTotal;
        analyze.data[this.task.id].time  += taskTotal;

      }
   });

}

analyze.filter = function (){

   fs = analyze.filters;

   tempTableData = [];

   dbg("Filters in analyze.filter()",fs);

   totalTime = 0;
   totalBillableTime = 0;

   var projectTotal = 0;
   var lastRow = {};
   var clientTotal = 0;
   var lastClientId = 0;

   var stats = {
      sessions: 0,
      avgSessionLength: 0,
      avgSessionsPerTask: 0
   };

   for (row in flatData){

     if (fs.clientId != "all" && flatData[row].client_id != fs.clientId){ continue; }
     if (fs.projectId != "all" && flatData[row].project_id != fs.projectId){ continue; }
     //if (fs.taskId != "all"  && flatData[row].task_id != fs.taskId){ continue; }
     if (fs.startTime != "all" && flatData[row].start_time < fs.startTime){ continue; }
     if (fs.endTime && flatData[row].end_time > fs.endTime){ continue; }

     stats.sessions += 1;

     if(!current_client){
       if(lastRow.client_id && flatData[row].client_id != lastRow.client_id){

         clientTotalRow = {
            client: lastRow.client,
            project:"",
            task:"",
            start_time:"",
            session_edit:"",
            durationHMS:timeFromSeconds(clientTotal),
            durationDecimal: hoursFromSeconds(clientTotal,2),
            rowType:"client"
         };

         tempTableData.push(clientTotalRow);
         clientTotal = 0;
       }
     }


     if(!current_project && current_client){
       if(lastRow.project_id && flatData[row].project_id != lastRow.project_id){
         dbg("New project detected");

         projectTotalRow = {
            client: lastRow.client,
            project: lastRow.project,
            task:"",
            start_time:"",
            session_edit:"",
            durationHMS:timeFromSeconds(projectTotal),
            durationDecimal: hoursFromSeconds(projectTotal,2),
            rowType:"project"
         };

         tempTableData.push(projectTotalRow);
         projectTotal = 0;
       }
     }

     if(current_client && current_project){
        flatData[row].session_edit = '<a class="button" onClick="showGeneralEditForm(\'session\',\''+flatData[row].session_id+'\')">Edit</a>';

        flatData[row].durationDecimal = hoursFromSeconds(flatData[row].duration,2),
        tempTableData.push(flatData[row]);
     }

     clientTotal += flatData[row].duration;
     projectTotal += flatData[row].duration;
     totalTime += flatData[row].duration;

     dbg("Billableness",flatData[row].billable);

     if(flatData[row].billable == "1" || flatData[row].billable == 1){
        totalBillableTime += flatData[row].duration;
     }else{
        dbg("Not Billable",flatData[row]);
     }

     lastRow = flatData[row];

   }

   if(!current_project && current_client){
         projectTotalRow = {
            client: lastRow.client,
            project: lastRow.project,
            task:"",
            start_time:"",
            session_edit:"",
            durationHMS:timeFromSeconds(projectTotal),
            durationDecimal: hoursFromSeconds(projectTotal,2),
            rowType:"project"
         };
         tempTableData.push(projectTotalRow);
     }

   if(!current_client){
       clientTotalRow = {
          client: lastRow.client,
          project:"",
          task:"",
          start_time:"",
          session_edit:"",
          durationHMS:timeFromSeconds(clientTotal),
          durationDecimal: hoursFromSeconds(clientTotal,2),
          rowType:"client"
       };

       tempTableData.push(clientTotalRow);
       clientTotal = 0;
    }

   analyze.totals.totalTimeHMS = timeFromSeconds(totalTime);
   analyze.totals.totalTimeDecimal = hoursFromSeconds(totalTime,2);
   analyze.totals.totalBillableTimeHMS = timeFromSeconds(totalBillableTime);
   analyze.totals.totalBillableTimeDecimal = hoursFromSeconds(totalBillableTime,2);
   analyze.tableData = tempTableData;

   stats.avgSessionLength = timeFromSeconds(totalTime/stats.sessions);

   clearTemplate("analyze-data-row-template");

   for(var i = 0; i < analyze.tableData.length; i++){
      template(analyze.tableData[i],"analyze-data-row-template");
   }

   clearTemplate("analyze-totals-template");
   template(analyze.totals,"analyze-totals-template");

   clearTemplate("analyze-stats-template");
   template(stats,"analyze-stats-template");

   if(!tempTableData[0]){
     document.getElementById("no-data-found-table").style.display = "table-row";
   }else{
     document.getElementById("no-data-found-table").style.display = "none";
   }

   // analyze.chart();

}

analyze.chart = function(){

    type = "project";

    dbg("analyze chart called");
    var labels = [];
    var data = [];

    for (id in analyze.data){
      if(analyze.data[id].type == type){
         labels.push(analyze.data[id].name);
         data.push(analyze.data[id].time);
      }
    }

    var ctx = document.getElementById("bar-chart");
    var barChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Time',
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)'
                ],
                borderColor: [
                    'rgba(255,99,132,1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]

        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero:true
                    }
                }]
            }
        }
    });

    gebi("analyze-chart").style.display = "block";

}


/* ###################### SETTINGS VIEW ############################## */


settingsView.show = function(){

  dbg("settings",ttData.settings);

  if(ttData.settings.length != defaultSettings.length){
      for (key in defaultSettings){
        if(!ttData.settings[key]){
           ttData.settings[key] = defaultSettings[key]
        }
      }
  }

  var templateData = [];

  /* This is a really annoying hack, because the .outerHTML doesn't include voodoo like the current value
  of <select> elements, so we can't spit the inputs into the template as strings; template gets filled with placehoder divs,
  which then get replaced. Ew */

  var inputs = {};

  for(field in editFields.settings){



       inputs[field] = makeFormInput(editFields.settings[field].type,{
         "value":ttData.settings[field],
         "id": "settings-"+field+"input",
         "options" : editFields.settings[field].options
       });

       var templateRow = {
       label: editFields.settings[field].label,
       input: '<div id="settings-'+field+'-input-placeholder"></div>'
     };

     templateData.push(templateRow);

  }


  template(templateData,"settings-item-template");

  // Hack continues...
  for(field in editFields.settings){
    var phDiv = gebi('settings-'+field+'-input-placeholder');
    phDiv.parentNode.replaceChild(inputs[field], phDiv);
  }

  gebi("client-controls").style.display = "none";
  gebi("project-controls").style.display = "none";

}


settingsView.hide = function(){
  gebi("client-controls").style.display = "block";
  gebi("project-controls").style.display = "block";
}

settingsView.save = function(){

  for(field in editFields.settings){
     ttData.settings[field] = gebi("settings-"+field+"input").value;
  }

  dbg("Settings after save",ttData.settings);
  ttSave();
  setFeedback('Settings updated');
}






/* ########################## Templating Functions (plus misc DOM helpers) ######################### */

/* Clear clones from a template (prior to updating) */
function clearTemplate(templateElId){
   var parent = gebi(templateElId).parentNode;
   var oldItems = parent.getElementsByClassName(templateElId+"-clone");

   while(oldItems.length > 0){
       oldItems[0].parentNode.removeChild(oldItems[0]);
   }
}

/** Main template population function
 *data: array of objects (in which case this function loops itself) or object with property name => value pairs to
 *with which to populate the template */


var template = function selfTemplate (data,templateElId){


   if(data instanceof Array){

      clearTemplate(templateElId);

      for(i= 0; i < data.length; i++){
        selfTemplate(data[i],templateElId);
      }
   }else{

     var template = gebi(templateElId);
     var parent = template.parentNode;
     var code = template.innerHTML;

     templateData = [];

     for(var name in data){
        templateData.push({placeholder: "{{"+name+"}}", value: data[name]})
     }


     var outputEl = template.cloneNode();

     outputEl.innerHTML = fillTemplate(templateData,code);

     /* if data contains an ID field, set the element ID accordingly */
     if(data.id){
        outputEl.id = data.id;
     }

     outputEl.className += " "+templateElId+"-clone";
     if(template.getAttribute("data-clone-display")){
        outputEl.style.display = template.getAttribute("data-clone-display");
     }else{
        outputEl.style.display = null;
     }

     parent.appendChild(outputEl);

   }

}

/* Helper to do the placeholder replacement */

function fillTemplate(data,code){

  for(var pairKey in data){
    var re = new RegExp (data[pairKey].placeholder, 'g');
    code = code.replace(re,data[pairKey].value);
  }
  return code;
}


function makeFormInput(type,attribs){

  dbg("Make form input type",type);
  dbg("Make form input attribs",attribs);

  var inputEl;

  if(type == "boolean"){
    attribs.options = {"no":"No","yes":"Yes"};
    type = "select";
  }

  if(type == "text"){
    inputEl = document.createElement("input");
    inputEl.type = "text";
  }else if(type == "select"){
    inputEl = document.createElement('select');
    for (var optkey in attribs.options){
      var option = new Option(attribs.options[optkey],optkey);
      inputEl.options.add(option);
    }
    inputEl.value = "yes";
    inputEl.selectedIndex = 2;
    inputEl.selected = true;
    if(attribs.value){
      inputEl.value = attribs.value;
    }
  }else if(type == "textarea"){
    inputEl = document.createElement("textarea");
    inputEl.innerHTML = attribs.value || "";
  }

  inputAttributes = ["id","value","name","className","style"];

  for (i = 0; i < inputAttributes.length; i++){

     var item = inputAttributes[i];

     if(attribs[item]){
        inputEl.setAttribute(item,attribs[item]);
     }
  }
  document.body.appendChild(inputEl);
  return inputEl;
}


function addTableHeaders(id,headers){
  table = gebi(id);
  header = table.createTHead();
  row = header.insertRow(0);

  count = 0;

  for(text in headers){
     cell = row.insertCell(count);
     cell.innerHTML = headers[text];
     count += 1;
  }

  table.appendChild(document.createElement('tbody'));

}

function addTableRow(id,data,position){

  position || (position = -1);

  var tbody = gebi(id).getElementsByTagName('tbody')[0];

  row = tbody.insertRow(position);

  count = 0;
  for(item in data){
     cell = row.insertCell(count);
     cell.innerHTML = data[item];
     count += 1;
  }

}



function makeSelectOptions(itemsObj,isForVue,prepend){

  options = [];

  if(prepend){
     options.push(prepend);
  }


  if(typeof itemsObj == "object"){
     if(getMemberCount(itemsObj) > 0){
      for (id in itemsObj){
        if(isForVue){
          option = {text:itemsObj[id].name,value:id};
        }else{
          option = [id,itemsObj[id].name];
        }

        options.push(option);

      }
      return options;
    }else{
      return false;
    }
  }else{
    return false;
  }
}


function updateSelectOptions(target_element,new_options,append){

    if(!append){
       while (target_element.options.length) {
           target_element.remove(0);
       }
    }

    for (var i = 0; i < new_options.length; i++) {
        var opt = new Option(new_options[i][1],new_options[i][0]);
        target_element.options.add(opt);
    }

}


function updateSelectOptionsFromData(type,idSuffix){

    idSuffix || (idSuffix = '');

    options = [];

    setToCurrent = false;

    if(type == "client"){
       for (client_id in ttData.clients){
           options.push([client_id,ttData.clients[client_id].name]);
       }
       if(typeof current_client == "object"){
          setToCurrent = current_client.id;
       }
    }else if(type == "project"){
       for (project_id in current_client.projects){
           options.push([project_id,current_client.projects[project_id].name]);
       }
       if(typeof current_project == "object"){
          setToCurrent = current_project.id;
       }
    }else if(type == "task"){
       for (task_id in current_project.tasks){
           if(current_project.tasks[task_id].status == "completed"){
             name_prepend = "[DONE] ";
           }else{
             name_prepend = "";
           }
           options.push([task_id,name_prepend+current_project.tasks[task_id].name]);
       }
       if(typeof current_task == "object"){
          setToCurrent = current_task.id;
       }
    }


    options.sort(function(a, b) {

      a = a[1].replace('[DONE]','zzzz');
      b = b[1].replace('[DONE]','zzzz');
      return a.localeCompare(b);

    });


    if(!setToCurrent){
      options.unshift(['all','All '+type+'s...']);
    }


    select_element = document.getElementById(type+'-select'+idSuffix);

    updateSelectOptions(select_element,options);

    if(setToCurrent){
       select_element.value = setToCurrent;
    }

}




/* ############################ SERVER SYNCHING ############################  */
synchQueue = {}
synchQueue.queue = [];

synchQueue.add = function(action,type,id){
  var timestamp = new Date();
  synchQueue.queue.push({"action":action,"type":type,"id":id,"timestamp":timestamp});
  dbg("Synch queue",synchQueue);
  ttData.synchQueue = synchQueue.queue;
}


function synch(){
  var queue = ttData.synchQueue.queue;
  var synchData = {"update":[], "insert":[],"delete":[]};

  for(var key in queue){
     item = queue[key];
     if(item.action == "delete"){
       synchData[action].push(item);
     }else{
       synchData[action].push(getItemById(item.type,item.id));
     }
  }
  dbg(synchData);
  synchToServer(synchData);
}

function synchIconStatus(status){
  if(status == "synching"){

    gebi("synch-icon").className = "fa fa-refresh fa-lg fa-spin fa-flip-horizontal";
    gebi("synch-icon").style.color = "#669366";

  }else if(status == "error"){

    gebi("synch-icon").className = "fa fa-refresh fa-lg";
    gebi("synch-icon").style.color = "red";

  }else if(status == "normal"){

    gebi("synch-icon").className = "fa fa-refresh fa-lg";
    gebi("synch-icon").style.color = "";

  }else if(status == "bulge"){

    gebi("synch-icon").className = "fa fa-refresh fa-2x";

    setTimeout(function(){
      synchIconStatus("normal");
    }, 200);

  }else if(status == "done"){

    gebi("synch-icon").className = "fa fa-refresh fa-lg";
    gebi("synch-icon").style.color = "green";

    setTimeout(function(){
      synchIconStatus("normal");
    }, 3000);

  }
}



function synchToServer(){

   //setFeedback('&nbsp;<i class="fa fa-info-circle fa-spin fa-lg"></i>&nbsp; &nbsp;Synching to server. This may take a minute....','notice',true);

   synchIconStatus("synching");

   // Do normal Ajax synch if we're not in node
   if(typeof http != "object"){


     $.ajax({
         url: 'https://photosynth.ca/timetracker/synch.php?action=synchToServer&key='+ttData.userKey,
         type: 'POST',
         contentType:'application/json',
         data: JSON.stringify(ttData),
         //dataType:'json',
         success : function(result){
            setFeedback('Data successfully sent to server');
            document.getElementById('json-output').innerHTML = result;
            dbg("Success on outbound synch. Starting inbound synch.");
            synchFromServer();
         },
         error: function(xhr, ajaxOptions, thrownError){
            setFeedback('Error synching to server: '+thrownError);
            synchIconStatus("error");
         },


    });

   }else{

      nodeRequest('to');

   }
}


function synchFromServer(){

   setFeedback('<i class="fa fa-lightbulb-o fa-spinner fa-lg"></i> Synching from server. This may take a minute....');

  if(typeof http != "object"){

     $.ajax({
         url: 'https://photosynth.ca/timetracker/synch.php?action=synchFromServer&key='+ttData.userKey,
         type: 'POST',
         contentType:'application/json',
         data:{"action":"synchFromServer"},
         //dataType:'json',
         success : function(result){

            try{
              server_data = JSON.parse(result);
            }catch(err){
               setFeedback('Error parsing data from server.','error');
               throw 'JSON parsing exception';
            }

            server_data.userKey = ttData.userKey;
            ttData = server_data;
            ttSave();
            setFeedback('Data successfully received from server.');
            synchIconStatus("done");
            emitEvent('server','synch');

         },
         error: function(xhr, ajaxOptions, thrownError){
            setFeedback('Error synching from server: '+thrownError);
            synchIconStatus("error");
         },

      });

   }else{

      nodeRequest('from');

   }
}

function synchSuccessCallback(data){
  setFeedback('Data successfully sent to server');
  document.getElementById('json-output').innerHTML = result;
  dbg("Success on outbound synch. Starting inbound synch.");
  synchFromServer();
}

function synchErrorCallback(error){
    setFeedback(error,"error");
    synchIconStatus("error");
}

function ajaxRequest(data,direction,protocol,host,path){

     $.ajax({
         url: protocol+host+path,
         type: 'POST',
         contentType:'application/json',
         data: JSON.stringify(data),
         //dataType:'json',
         success : function(result){
            try{
               server_data = JSON.parse(result);
            }catch(err){
               synchErrorCallback('Error parsing data from server.');
               throw 'JSON parsing exception';
            }
            synchSuccessCallback(server_data);
         },
         error: function(xhr, ajaxOptions, thrownError){
            synchErrorCallback('Error synching to server: '+thrownError);

         },

    });

}

function nodeRequest(direction,url){

  if(direction == 'to'){
    var postData = JSON.stringify(ttData);
    reqAction = 'synchToServer';

    //dbg(postData,"Node synching to server with:");

  }else{
    reqAction = 'synchFromServer';
    var postData = '';
  }

  var options = {
    hostname: 'www.photosynth.ca',
    port: 80,
    path: '/timetracker/synch.php?action='+reqAction+'&key='+ttData.userKey,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  var request = http.request(options, function(result){

    //console.log('STATUS:'+result.statusCode);
    //console.log('HEADERS:'+JSON.stringify(result.headers));

    result.setEncoding('utf8');

    var resultData = '';

    result.on('data', function(chunk){
      //console.log('BODY:'+chunk);
      resultData += chunk;
    });

    result.on('end', function(){
      //console.log('No more data in response.');
      //console.log(result);
      //console.log(resultData);

      if(result.statusCode == 200){

         try{
           server_data = JSON.parse(resultData);
         }catch(err){
           setFeedback('Error parsing data from server. Error:'+err,'error');
           throw 'JSON parsing exception';
           synchIconStatus("error");
         }

         if(direction == 'from'){
             server_data.userKey = ttData.userKey;
             ttData = server_data;
             ttSave();

             setFeedback('Data successfully received from server.');
             synchIconStatus("done");
             emitEvent('server','synch');

        }else if(direction == 'to'){
             setFeedback('Server synch complete. '+server_data.updateCount+" records updated, "+server_data.insertCount+" new records added");
             synchFromServer();
        }

      }else{
        setFeedback('Server synch failed! Status:'+result.statusCode,'error',true);
        synchIconStatus("error");
      }


    });

  });

  request.on('error', function(e){
    //console.log('problem with request:'+e.message);
    setFeedback('Error synching to server: '+e.message);
    synchIconStatus("error");
  });


  request.write(postData);
  request.end();
}


/* ######################### Data Handling Functions ######################### */

function makeFlatData(){
  flatData = {};

  for (client_id in ttData.clients){

    if(typeof ttData.clients[client_id].projects == "object"){
       projects = ttData.clients[client_id].projects;
       for (project_id in projects){
        if(typeof projects[project_id].tasks == "object"){
          tasks = projects[project_id].tasks;
          for (task_id in tasks){
            if(typeof tasks[task_id].sessions == "object" && getMemberCount(tasks[task_id].sessions) > 0){
              for (session_id in tasks[task_id].sessions){
                session = tasks[task_id].sessions[session_id];

                flatData[session_id] = {

                  "client_id": client_id,
                  "client": ttData.clients[client_id].name,
                  "project" : projects[project_id].name,
                  "project_id" : project_id,
                  "task" : tasks[task_id].name,
                  "task_id" : task_id,
                  "billable" : tasks[task_id].billable,
                  "start_time" :  session.start_time,
                  "end_time" :  session.end_time,
                  "session_id" :  session_id,
                  "duration" : timeDiffSecsFromString(session.start_time,session.end_time),
                  "durationHMS" : timeFromSeconds(timeDiffSecsFromString(session.start_time,session.end_time))

                };
              }
            }
          }
        }
      }
    }
  }
}

/* This is kind of a silly function and should probably be removed */
function filterFlatData(fs,callback){

   var tempTableData = [];

   for (var row in flatData){

     if (fs.clientId && fs.clientId != "all" && flatData[row].client_id != fs.clientId){ continue; }
     if (fs.projectId && fs.projectId != "all" && flatData[row].project_id != fs.projectId){ continue; }
     if (fs.taskId && fs.taskId != "all"  && flatData[row].task_id != fs.taskId){ continue; }
     if (fs.startTime && fs.startTime != "all" && flatData[row].start_time < fs.startTime){ continue; }
     if (fs.endTime && fs.endTime && flatData[row].end_time > fs.endTime){ continue; }

     tempTableData.push(flatData[row]);

     if(typeof callback == "function"){
        callback.call(flatData[row]);
     }
   }
   return tempTableData;
}



/** ############################# The Big Snazzy Data Looper Function ########################### */
/**This is the big boss function that does all the things. I wouldn't recommend editing it, because it's
 * kinda gnarly. More documentation later */

function loopData(fs,func){

  if (func && typeof func != "function"){
      throw new TypeError();
  }

  clientLoop: for (var client_id in ttData.clients){

    // Filter
    for(key in fs){
      if(fs[key].type == "client"){
        if(!filterMatch(fs[key].value,ttData.clients[client_id][fs[key].field],fs[key].condition)){
          continue clientLoop;
        }
      }
    }

    // Callback
    if(func){
      res = func.call({level:"client", client: ttData.clients[client_id]});
      if (res == "break"){
        return;
      }
    }

    if(typeof ttData.clients[client_id].projects == "object"){
       projects = ttData.clients[client_id].projects;
       projectLoop: for (var project_id in projects){

        // Filter
        for(key in fs){
          if(fs[key].type == "project"){
            if(!filterMatch(fs[key].value,projects[project_id][fs[key].field],fs[key].condition)){
              continue projectLoop;
            }
          }
        }

        // Callback
        if(func){
          res = func.call({level:"project", client : ttData.clients[client_id],project : projects[project_id]});
          if (res == "break"){
            return;
          }
        }

        if(typeof projects[project_id].tasks == "object"){
          tasks = projects[project_id].tasks;
          taskLoop: for (var task_id in tasks){


            // Filter
            for(key in fs){
              if(fs[key].type == "task"){
                if(!filterMatch(fs[key].value,tasks[task_id][fs[key].field],fs[key].condition)){
                  continue taskLoop;
                }
              }
            }


            // Callback
            if(func){
              res = func.call({level:"task", client : ttData.clients[client_id],project : projects[project_id], task:  tasks[task_id]});
              if (res == "break"){
                return;
              }else if(res == "continue"){
                continue taskLoop;
              }
            }


            if(typeof tasks[task_id].sessions == "object" && getMemberCount(tasks[task_id].sessions) > 0){
              sessions = tasks[task_id].sessions;
              sessionLoop: for (var session_id in sessions){

                // Filter
                for(key in fs){
                  if(fs[key].type == "session"){
                    if(!filterMatch(fs[key].value,sessions[session_id][fs[key].field],fs[key].condition)){
                      continue sessionLoop;
                    }
                  }
                }

                // Callback
                if(func){
                  res = func.call({
                    level:"session",
                    client : ttData.clients[client_id],
                    project : projects[project_id],
                    task:  tasks[task_id],
                    session: sessions[session_id]
                  });
                  if (res == "break"){
                    return;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}


function filterMatch(filterValue,dataValue,condition){

  if(condition == "equals"){
    if(filterValue == dataValue){
      return true;
    }
  }else if(condition == ">"){
    if(filterValue < dataValue){
      return true;
    }
  }else if(condition == "<"){
    if(filterValue > dataValue){
      return true;
    }
  }else if(condition == "includes"){
    if(dataValue.indexOf(filterValue) > -1){
      return true;
    }
  }

}

// Get a particular item out of the data array, regardless of what's current
function getItemById(type,id){

  var wantedItem = {};

  loopData([{type:type,value:id,field:"id",condition:"equals"}],function(){
    if(this.level == type){
      wantedItem = this[type];
      return "break";
    }
  });

  return wantedItem;
}
// Get a particular branch out of the data array, regardless of what's current
function getBranchById(type,id){

  var branch = {};

  loopData([{type:type,value:id,field:"id",condition:"equals"}],function(){
    if(this.level == type){
      branch = this;
      return "break";
    }
  });

  return branch;
}

function updateItemById(type,id,data){

    dbg("updateItemById(type,id,data)",[type,id,data]);

    if(type == 'client'){
      ttData.clients[id] = data;
    }else{
      loopData([{type:type,value:id,field:"id",condition:"equals"}],function(){
        if(this.level == type){
          if(type == "project"){
            ttData.clients[this.client.id].projects[this.project.id] = data;
          }else if(type == "task"){
            ttData.clients[this.client.id].projects[this.project.id].tasks[this.task.id] = data;
          }else if(type == "session"){
            ttData.clients[this.client.id].projects[this.project.id].tasks[this.task.id].sessions[this.session.id] = data;
          }
          return "break";
        }
      });
    }
}

function deleteItemById(type,id){
    if(type == 'client'){
      delete ttData.clients[id];
    }else{
      loopData([{type:type,value:id,field:"id",condition:"equals"}],function(){
        if(this.level == type){
          if(type == "project"){
            delete ttData.clients[this.client.id].projects[this.project.id];
          }else if(type == "task"){
            delete ttData.clients[this.client.id].projects[this.project.id].tasks[this.task.id];
          }else if(type == "session"){
            delete ttData.clients[this.client.id].projects[this.project.id].tasks[this.task.id].sessions[this.session.id];
          }
          return "break";
        }
      });
    }
}

/* An efficient method of updating single values if the full tree is known */
function updateValueByBranch(branchSpec,field,value){

  var bs = branchSpec;

  // Don't allow dangerous updates...
  if(field == "projects" || field == "tasks" || field == "sessions"){
    console.log("Invalid field name in updateValueByBranch()",field);
    return;
  }

  if(bs.client && bs.project && bs.task && bs.session){
     ttData.clients[bs.client].projects[bs.project].tasks[bs.task].sessions[bs.session][field] = value;
  }else if(bs.client && bs.project && bs.task){
     ttData.clients[bs.client].projects[bs.project].tasks[bs.task][field] = value;
  }else if(bs.client && bs.project){
     ttData.clients[bs.client].projects[bs.project][field] = value;
  }else if(bs.client){
     ttData.clients[bs.client][field] = value;
  }

}

/* Older version, based on current values (don't use) */
function updateDataObject(level,data){
  if(level == 'client'){
    ttData.clients[current_client.id] = data;
  }
  if(level == 'project'){
    ttData.clients[current_client.id].projects[current_project.id] = data;
  }
  if(level == 'task'){
    ttData.clients[current_client.id].projects[current_project.id].tasks[current_task.id] = data;
  }
  if(level == 'session'){
    if(typeof ttData.clients[current_client.id].projects[current_project.id].tasks[current_task.id].sessions != "object"){
       ttData.clients[current_client.id].projects[current_project.id].tasks[current_task.id].sessions = {};
    }
    ttData.clients[current_client.id].projects[current_project.id].tasks[current_task.id].sessions[data.id] = data;
  }
}


function getCurrent(type){
  if(type == "client"){
    return current_client;
  }else if(type == "project"){
    return current_project;
  }else if(type == "task"){
    return current_task;
  }else if(type == "session"){
    return current_session;
  }
}

function ttSave(){

  localStorage.ttData = JSON.stringify(ttData);

}

function ttSaveCurrent(){

  dbg("Saving current values");
  dbg("Client",current_client);
  dbg("Project",current_project);
  dbg("Task",current_task);

  if(current_client){

      localStorage.ttClientId = current_client.id;

      if(current_project){

          localStorage.ttProjectId = current_project.id;

          if(current_task){
            localStorage.ttTaskId = current_task.id;

            if(current_session){
               localStorage.ttSessionId = current_session.id;
            }


          }

      }else{
        //dbg('Current client but no project found');
        delete localStorage.ttProjectId;
        delete localStorage.ttTaskId;
      }

  }else{
    //dbg('No current client found');
  }

}



/* ####################### TIME & DATE FUNCTIONS ########################## */


function prettyTime(s){
    var hours = parseInt(s/3600) % 24;
    var minutes = parseInt(s/60) % 60;
    var seconds = parseInt(s) % 60;

    hrsTxt = " hr";
    minsTxt = " min";

    if(hours > 1){
      hrsTxt += "s";
    }

    if(minutes > 1){
      minsTxt += "s";
    }
    var out = '';

    if(hours){
      out += hours.toString()+hrsTxt+" ";
    }
    if(minutes){
      out += minutes.toString()+minsTxt;
    }
    if(!minutes && !hours){
      out = seconds.toString()+" sec";
    }

    return out;
}

function timeFromSeconds(s){

    var hours = parseInt(s/3600);
    var minutes = parseInt(s/60) % 60;
    var seconds = parseInt(s) % 60;

    return (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds : seconds);

}

function hoursFromSeconds(s,round){
  if(round){
    return (s/3600).toFixed(round);
  }else{
    return (s/3600);
  }
}


function timeDiffSecsFromString(dateStr1,dateStr2){

    date1 = new Date(dateStr1.replace(' ','T'));
    date2 = new Date(dateStr2.replace(' ','T'));

    diffMs = date2.getTime() - date1.getTime();

    return (diffMs/1000);

}



/* ####################### UTILITY FUNCTIONS ########################## */


function gebi(id){
  return document.getElementById(id);
}


function pad(n){return n<10 ? '0'+n : n;}

function truncate(str, limit, pad) {
   pad = pad || "...";
   if(str.length > limit){
      return str.substring(0,limit)+pad;
   }else{
      return str;
   }
}



function newId(name,type){

  id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
});

  return id;
}


function dbg(text,test_data){
  if(test_data){
    console.log(text,test_data);
  }else{
    console.log(text);
  }
}

function getSetting(name){
  return ttData.settings[name];
}

// Safely count object members
function getMemberCount(object){
  member_count = 0;

  if(typeof object == "object"){
    for (item in object){
       member_count += 1;
    }
  }

  return member_count;
}

function addScript(src){
  var scriptEl = document.createElement('script');
  scriptEl.src = src;
  document.getElementsByTagName("head")[0].appendChild(scriptEl);
}
function addCss(src){
  var cssEl = document.createElement('link');
  cssEl.href = src;
  cssEl.rel = "stylesheet";
  cssEl.type = "text/css";
  document.getElementsByTagName("head")[0].appendChild(cssEl);
}
