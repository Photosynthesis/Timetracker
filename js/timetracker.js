var current_client, current_project, current_task, current_session;

var ttData;

var  client_select = document.getElementById('client-select'); 
var  project_select = document.getElementById('project-select');
var  task_select = document.getElementById('task-select');

var feedbackElement; 

var startDate;    
var nowDate;
var counterId;
var currentDuration;

var view = "track";

var defaultSettings = {
  top_level_title : "Client",
  show_billability : true,
  auto_synch : true,
  reminder_interval : false,
  reminder_title : "Pomodoro Complete!",
  reminder_message : "Please take a five minute break. <b>Breathe, stretch, look around!</b>",
  reminder_delay : 1
};

var views = {
  "analyze" : {}, 
  "taskList" : {},
  "settingsView" : {}
}

var analyze = {};
var taskList = {};
var settingsView = {};

var flatData = [];

var reminderDelay = 0;

var endPicker = '';
var startPicker = '';

var lastTaskSaveTime;


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
      options : {"true":"Yes", "false":"No"}    
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

Notification.requestPermission();


/* ############################# INITIALIZE ################################# */

function ttInit(){

    currentView = taskList;

    feedbackElement = document.getElementById('feedback');
    
    if(!localStorage.ttData){
      
      ttData = {
        "userKey" : newId(),
        "clients" : {},
        "settings" : defaultSettings        
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
      
      
      updateSelectOptionsFromData('client');
      
      if(getMemberCount(ttData.clients) < 1){
         addClientForm();
      }
      
      if(localStorage.ttClientId && typeof ttData.clients[localStorage.ttClientId] == "object"){
                 
        current_client = ttData.clients[localStorage.ttClientId];
                  
        setClient(localStorage.ttClientId);
       
        if(localStorage.ttProjectId && typeof current_client.projects[localStorage.ttProjectId] == "object"){ 
             
          current_project = current_client.projects[localStorage.ttProjectId];                    
          setProject(current_project.id);
      
          if(localStorage.ttTaskId && typeof current_project.tasks[localStorage.ttTaskId] == "object"){
                
            current_task = current_project.tasks[localStorage.ttTaskId];
            
            setTask(current_task.id);
            
            if(localStorage.ttSessionId){
              current_session = current_task.sessions[localStorage.ttSessionId];             
              continueSession();
            }            
          }
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
   

   
}



/* ########################### TRACK CLIENT CONTROL ######################### */

function addClientForm(){
   document.getElementById('add-client-form').style.display = "block";
   document.getElementById('select-client-form').style.display = "none"; 

}

function cancelAddClient(){
  document.getElementById('add-client-input').value = '';
  document.getElementById('add-client-form').style.display = "none";
  document.getElementById('select-client-form').style.display = "block";
}

function saveClient(){
  
  new_client = {
      'id' : newId(),
      'name' : document.getElementById('add-client-input').value,
      'projects' : {}
  };
   
  ttData.clients[new_client.id] = new_client; 
  ttSave();
  updateSelectOptionsFromData('client');  
  setClient(new_client.id); 
  cancelAddClient();  
  setFeedback('Client saved','success'); 
  
}


function setClient(clientId){

  client_select = document.getElementById('client-select');
  
  if(clientId){     
    client_select.value = clientId;  
  }else{
    clientId = client_select.value;
  }
  
  dbg("Client ID in setClient()",clientId);
          
  delete taskList.projectFilter;
  
  if(clientId == "all"){
                                         
    delete taskList.clientFilter;
    current_client = null;
    
    gebi('project-controls').style.display = "none"; 
    
  }else{
  
    
    gebi('project-controls').style.display = "block"; 
  
    current_client = ttData.clients[client_select.value];
    
    current_project = '';  
    
    $("#edit-project-button").hide();
    
    // Count how many projects this client has
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
  

    //project_select.options = makeSelectOptions(ttData.clients[newVal].projects,true,{text:"- All projects -",value:"all"});             
    taskList.clientFilter = {
      type : "client",
      field : "id",
      condition : "equals",
      value : current_client.id
    };
      
  }
  //project_select.value = 'all';     
  
  taskList.filter();
  taskList.update();
  
  $('#task-list').show();
    
  if(currentView.setClient){
    currentView.setClient(clientId);
  }
  
  emitEvent("client","set");
                                             
  //document.getElementById('task-controls').style.display = "none";
  
  ttSaveCurrent();
  
}




/* ######################### TRACK PROJECT CONTROLS ######################### */


function addProjectForm(){
   document.getElementById('add-project-form').style.display = "block";
   document.getElementById('select-project-form').style.display = "none"; 
}

function cancelAddProject(){
  document.getElementById('add-project-input').value = '';
  document.getElementById('add-project-form').style.display = "none";
  document.getElementById('select-project-form').style.display = "block";
}

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
  updateSelectOptionsFromData('project'); 
  cancelAddProject();            
  setProject(new_project.id);   
  setFeedback('Project saved','success');   
}


                     
function setProject(id){

  client_select = document.getElementById('client-select'); 
  project_select = document.getElementById('project-select'); 
  task_select = document.getElementById('task-select');
  
  if(id){
    project_select.value = id;
  }
  
  current_task = '';
  
  $("#session-start-button").hide();  
  $("#task-edit-button").hide(); 
  
  if(project_select.value != 'all' && project_select.value != ''){  
   
    $("#edit-project-button").show();
  
    //if(project_select[0].value == ''){
    //  project_select.remove(0);
    //}
    
    current_project = ttData.clients[client_select.value].projects[project_select.value];       
    //document.getElementById('task-controls').style.display = "block";    
    //updateSelectOptionsFromData('task');
      
  }
  
  if(project_select.value == "all" || project_select.value == ""){        
      //project_select.options = [{text:"- All projects -",value:"all"}];
      delete taskList.projectFilter;   
  }else{
      //project_select.options = makeSelectOptions(ttData.clients[newVal].projects,true,{text:"- All projects -",value:"all"});               
      taskList.projectFilter = {
        type : "project",
        field : "id",
        condition : "equals",
        value : current_project.id
      };
      
  }
       
  taskList.filter();
  taskList.update();
  
  if(typeof currentView.setProject == "function"){
     currentView.setProject();
  }
  
  //updateSectionFromData('task');   
  ttSaveCurrent();  
}




/* ########################### TRACK TASK CONTROLS ########################## */ 



function setTask(id){
  if(id){
    task_id = id;
    //task_select.value = id;
  }else{
    //task_id = task_select.value;  
  }
  
  if(task_id){
    
    //current_task = current_project.tasks[task_id];
    //document.getElementById('session-start-button').style.display = 'inline';
    //$("#task-edit-button").show();
      
    ttSaveCurrent();
    
  }
}


function saveNewTask(projectId,task_name){

    var taskSaveTimeObj = new Date();
    var taskSaveTime = (taskSaveTimeObj.getSeconds()*1000)+taskSaveTimeObj.getMilliseconds();
    
    if((taskSaveTime - lastTaskSaveTime) < 500){
      dbg("ltst:",lastTaskSaveTime);
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
      new_task.billable = true;  
    }else{  
      new_task.billable = false;   
    }
  }else{  
      new_task.billable = true;   
  }
  
  dbg("SaveNewTask",new_task);
  
  //quit();
  /* Everything below here should probably be moved into a global "save" function 
  that abstracts the data model and forces data object integrity 
  
  save("task",new_task);
  
  setCurrent("task",new_task.id);
  
  
  */   

 
  current_task = new_task;
  
  if(typeof current_project.tasks != "object"){ 
    current_project.tasks = {};
  }  
  
  current_project.tasks[new_task.id] = new_task;
  
  ttData.clients[current_client.id].projects[current_project.id].tasks = current_project.tasks;
   
  ttSave();   
  //updateSelectOptionsFromData('task');  
  //updateSectionFromData('task');
     
  setTask(new_task.id); 
  
  lastTaskSaveTime = taskSaveTime; 
  lastTaskSaveId = new_task.id; 
  
  emitEvent("task","added");
  
  return new_task.id;
   
}

function setTaskComplete(task_id,element){

  task = getItemById("task",task_id);
  
  if(task.status == "completed"){
    task.status = "inProcess";
  }else{
    task.status = "completed"; 
  }   
  
  updateItemById("task",task_id,task);

  emitEvent("task","updated");

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

function startGeneralSession(taskId) {

  dbg("Starting session with task ID",taskId);
         
   var branch = getBranchById("task",taskId); 
   current_client = branch.client;                                                  
   current_project = branch.project;    
   current_task = branch.task;
   
   dbg("Branch",branch);
   
   startSession();
   
}

function continueSession(){   
  startDate = moment(current_session.start_time);     
  counterId = setInterval(incrementCurrentDuration, 1000);   
  showInSession();
}


function showInSession(){

  document.getElementById('active-session').innerHTML =  '<div class="centered-box"><div id="current-info"><b>'+current_client.name+'</b> > <b>'+current_project.name+'</b> > <b>'+current_task.name+'</b></div><div id="current_duration"><span style="color:#dddddd">00:00:00</span></div><input type="text" id="session-notes-input" placeholder="Add notes" /><div><input type="checkbox"  id="task-complete-input"/><label for="task-complete-input">Task complete</label></div><a class="button" onClick="endSession()">End Session</a></div>';
      
  document.getElementById('active-session').style.display = 'block';

}


function endSession(){  

  clearInterval(counterId);                                      
    
  current_session.end_time = moment().format("YYYY-MM-DD HH:mm:ss"); 
  
  current_session.notes = $("#session-notes-input").val();
  
  if(document.getElementById("task-complete-input").checked == true){
    current_task.status = "completed";   
    task_complete_feedback = " <b>Task complete!<b>";
    feedback_class = "success";    
    // updateSelectOptionsFromData('task');    
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
  edit_button = '<form style="display:inline"><input type="hidden" id="session_id-input" value="'+pastSessionId+'"/><a class="button" onClick="showEditForm(\'session\')">Edit session</a></form>';  
  setFeedback("Session Ended. Duration was "+currentDuration+task_complete_feedback+edit_button,feedback_class);
  
  taskList.filter();
  taskList.update();
 
  
  if(getSetting("auto_synch") == "true"){
    synchToServer();
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
  feedbackElement.class = type;   
  feedbackElement.style.display = 'block';
  
  if(!stayVisible){
    setTimeout(hideFeedback,8000);
  }
}

function desktopNotify(message,title,icon) {
  title || (title = "Timtracker notification");
  
  options = {
      body: message,
      icon: icon
  };
  new Notification(title,options);
}




/* ####################### TIME & DATE FUNCTIONS ########################## */


function timeFromSeconds(s){

    var hours = parseInt(s/3600);
    var minutes = parseInt(s/60) % 60;
    var seconds = parseInt(s) % 60;

    return (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds : seconds);

}

function timeDiffSecsFromString(dateStr1,dateStr2){

    date1 = new Date(dateStr1.replace(' ','T'));  
    date2 = new Date(dateStr2.replace(' ','T'));
    
    diffMs = date2.getTime() - date1.getTime();
    
    return (diffMs/1000);
 
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




/* ######################### UTILITY FUNCTIONS ########################## */


function gebi(id){
  return document.getElementById(id);
}


function pad(n){return n<10 ? '0'+n : n;}



function newId(name,type){
  
  id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
});
  
  return id;
}



function dbg(text,test_data){

  if(text){
    console.log(text,test_data);
  }else{
    console.log(test_data);  
  }
  

  
}

function getSetting(name){
  return ttData.settings[name];
}






/* ################### GENERAL VIEW UPDATING FUNCTIONS ##################### */ 



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
      options.unshift(['all','Select '+type+'...']);
    } 
          
          
    select_element = document.getElementById(type+'-select'+idSuffix);
          
    updateSelectOptions(select_element,options);
    
    if(setToCurrent){
       select_element.value = setToCurrent;
    }

}




// I think the following seven functions should be removed. They attempt to be too abstract, and fail



function parentObjectOfCurrent(type){
  if(type == 'client'){
    if(typeof current_client == "object"){
      return ttData;
    }else{
      return false;
    }
  }else if(type == 'project'){
    if(typeof current_project == "object"){
      return current_client;
    }else{
      return false;
    }
  }else if(type == 'task'){
    if(typeof current_task == "object"){
      return current_project;
    }else{
      return false;
    }
  }
}

function getCurrent(type){

  if(type == 'client'){
    if(typeof current_client == "object"){
      return current_client;
    }else{
      return false;
    }
  }else if(type == 'project'){
    if(typeof current_project == "object"){
      return current_project;
    }else{
      return false;
    }
  }else if(type == 'task'){
    if(typeof current_task == "object"){
      return current_task;
    }else{
      return false;
    }
  }

}

function getParentType(type){
  for (var i = 0; i < types.length; i++) {
     if(types[(i+1)] == type){
        return types[i];
     }
  }
}

function getChildType(type){
  for (type_id in types){
     if(types[(type_id-1)] == type){
        return types[type_id];
     }
  }
}

function getMemberCount(object){
  member_count = 0;
  
  if(typeof object == "object"){
    for (item in object){
       member_count += 1;
    }
  }               
  
  return member_count;  
}

function getChildCount(type,object){

  if(typeof object != "object"){
    return false;
  }
       
  child_type = getChildType(type);
  children_obj = object[child_type+'s'];
  
  child_count = 0;
  
  if(typeof children_obj == "object"){
    for (id in children_obj){
       child_count += 1;
    }
  }               
  
  return child_count;  
}

function updateSectionFromData(type){

  if(!getCurrent(type)){
    $("#edit-"+type+"-button").hide();
  }else {
    $("#edit-"+type+"-button").show();
  }

   
  parent_type = getParentType(type);
  
  parent_current = getCurrent(parent_type);
  
  if(!parent_current && type != 'client'){
    $("#"+type+"-controls").hide();
  }else{
    $("#"+type+"-controls").show();
  }
  
  if (getChildCount(parent_type,parent_current) < 1){
     $("#"+type+"-select").hide();
     $("#add-"+type+"-form").show();
  }else{
     $("#"+type+"-select").show();
     $("#add-"+type+"-form").hide();  
  }
}





/* ########################### DATA MODEL FUNCTIONS ######################### */


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


function ttSave(){

  localStorage.ttData = JSON.stringify(ttData);
  
}

function ttSaveCurrent(){
  
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
        dbg('Client but no project found');
      }
    
  }else{
    dbg('No current client found');
  }  
   
}


function saveUserKey(){

  key_val = $("#add-userkey-input").val();
  ttData.userKey = key_val;
  
  ttSave();
  
  $("#modal-bg").hide(); 
  $("#edit-popup").hide();  
  $("#edit-popup").html('');
  
  addClientForm();
  
  //ttInit();
  
}

function deleteLocalStorage(){

  delete localStorage.ttData;
  delete localStorage.ttClientId;   
  delete localStorage.ttProjectId;  
  delete localStorage.ttTaskId;    
  delete localStorage.ttSessionId;
  setFeedback('LocalStorage deleted. Refresh to see changes.');

}


/* ############################# EDIT FUNCTIONS ############################# */


function editJson(){

  document.getElementById('json-output').innerHTML = '<form><textarea id="edit-json-textarea">'+JSON.stringify(ttData,null,'   ')+'</textarea></form><a href="#void" class="button" onClick="saveJson()">Save</a>';
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


function saveEditForm(type){

  if(type == 'client'){    
    properties = current_client;
  }else if(type == 'project'){
    properties = current_project;
  }else if(type == 'task'){
    properties = current_task;
  }else if(type == 'session'){
    session_id = $("#session_id-input").val();
    properties = current_task.sessions[session_id];
  }else if(type == 'settings'){
    properties = ttData.settings;
  }
    
  for (key in properties){                                                                 
    if(typeof properties[key] != "object"){
      properties[key] = document.getElementById(type+"-"+key+"-edit-input").value;      
    }
  }
  
 
  updateDataObject(type,properties);
  
  if(type != "session" && type != "settings"){
    updateSelectOptionsFromData(type);  
  }                

     
  ttSave();  
  setFeedback('Item updated');  
  cancelEditForm();
  
}

function saveGeneralEditForm(type,id){

  if(type == 'settings'){
    var item = ttData.settings;
  }else{
    var item = getItemById(type,id)
  }
  
  /* 
  for (key in properties){                                                                 
    if(typeof properties[key] != "object"){
      dbg("getting props for",key);
      
      if(document.getElementById(type+"-"+key+"-edit-input")){
        item[key] = document.getElementById(type+"-"+key+"-edit-input").value;         
      }   
    }
  }
  */ 
   
  
  // var item =  JSON.parse(JSON.stringify(item));
                                        
  dbg("Type in edit",type);                   
  dbg("ID in edit",id); 
  
  dbg("Item in save before edit",item);  
  dbg("editFields",editFields[type]);
  
  for (key in editFields[type]){
    if(document.getElementById(type+"-"+key+"-edit-input")){
      item[key] = document.getElementById(type+"-"+key+"-edit-input").value;
    }else{
      dbg("Field not found in edit form:",key);
    }
  }        
      
    
                    
  dbg("Item in save after edit",item);
  
  /* This is excessively lame, and is only here because of issues with Vue.js... */
  if(type == "task"){
    item.displayStatus = editFields.task.status.options[item.status];
  }
  
  updateItemById(type,id,item);
  
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

function deleteGeneralFromEditForm(type,id){

  dbg('deleteGeneralFromEditForm() with:',[type,id]); 

  deleteItemById(type,id);
   
  if(type != "session" && type != "task"){
    updateSelectOptionsFromData(type);   
  }
   
  ttSave(); 
  cancelEditForm(); 
  
  setFeedback(type+' deleted.');
  
  // Temporary test mockup of event-based strategy...
  
  emitEvent("task","deleted"); 
  
} 


function deleteFromEditForm(type){

  dbg(type,'Deleting type:');

  if(type == 'client'){
    delete ttData.clients[current_client.id];
    
    current_client = '';
    current_project = ''; 
    current_task = '';
    $("#task-controls").hide(); 
    $("#project-controls").hide();
           
  }else if(type == 'project'){
  
    delete current_client.projects[current_project.id];
    current_project = '';          
    update_type = 'client'; 
    update_data = current_client;
    
  }else if(type == 'task'){
  
    delete current_project.tasks[current_task.id]; 
    current_task = '';    
    update_type = 'project';    
    update_data = current_project;
    
  }else if(type == 'session'){
    session_id = $("#session_id-input").value;
    delete current_task.sessions[session_id];      
    update_type = 'task';
    update_data = current_task;
  }
  
  if(type != 'client'){
    updateDataObject(update_type,update_data);   
  }
   
  if(type != "session" && type != "task"){
    updateSelectOptionsFromData(type);   
  }

  if(typeof currentView.update == "function"){
    currentView.update();
  }
   
  ttSave(); 
  cancelEditForm(); 
  setFeedback(type+' deleted.');
  
} 

/* Edit form that doesn't require current values to be set */

function showGeneralEditForm(type,id){
   dbg('showGeneralEditForm called with type',type); 
   dbg('id',id);
   
   edit_element = document.getElementById("edit-popup");
                      
  $("#edit-popup").html("<form>");
  
  dbg($("#edit-popup"));

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
         $("#edit-popup").append('<div>'+field.label+' <input type="text" value="'+val+'" id="'+type+'-'+key+'-edit-input"/></div>');
    }else if(field.type == "select"){
    
         var fieldDiv = document.createElement('div'); 
         
         fieldDiv.innerHTML = field.label
         
         var select = document.createElement('select');
         select.id = type+'-'+key+'-edit-input';
         /*
         for (var optkey in field.options){
            if(typeof field.options[optkey] == "object"){
              var optionVal = field.options[optkey].value; 
              var optionTxt = field.options[optkey].text;
            }else{                           
              var optionVal = optionTxt = field.options[optkey];          
            }
            var option = new Option(optionTxt,optionVal);
            select.options.add(option);               
         }
         */
         
         for (var optkey in field.options){
            var option = new Option(field.options[optkey],optkey);
            select.options.add(option);               
         }         
         
         select.value = val;
         
         fieldDiv.appendChild(select);         
         $("#edit-popup").append(fieldDiv);
          
    }else if(field.type == "textarea"){
         $("#edit-popup").append('<div>'+field.label+' <textarea id="'+type+'-'+key+'-edit-input">'+val+'</textarea></div>');
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

function showEditForm(type,id){
   dbg('showEditForm called with type',type);
   
   edit_element = document.getElementById("edit-popup");
                      
  $("#edit-popup").html("<form>");
  
  dbg($("#edit-popup"));

  if(type == 'client'){    
    properties = current_client;
  }else if(type == 'project'){
    properties = current_project;
    
  }else if(type == 'task'){
    properties = current_task;
  }else if(type == 'session'){
    session_id = document.getElementById("session_id-input").value;
    properties = current_task.sessions[session_id];
  }else if(type == "settings"){  
    properties = ttData.settings;
  } 
  
  for (key in properties){                                                                 
    if(typeof properties[key] != "object"){
      $("#edit-popup").append('<div>'+key+' <input type="text" value="'+properties[key]+'" id="'+type+'-'+key+'-edit-input"/></div>');
    }
  }
  
  $("#edit-popup").append('<div>');
  $("#edit-popup").append('<a class="button" onClick="saveEditForm(\''+type+'\')">Save</a>');
  $("#edit-popup").append('<a class="button" onClick="cancelEditForm()">Cancel</a>');
  
  if(type != "settings"){
    $("#edit-popup").append('<a class="button red" onClick="deleteFromEditForm(\''+type+'\')">Delete Item</a></div></form>');
  }  
  
  $("#modal-bg").show(); 
  $("#edit-popup").show();                  


}





/* ############################ SERVER SYNCHING ############################  */





function synchToServer(){ 
      
  
   setFeedback('&nbsp;<i class="fa fa-info-circle fa-spin fa-lg"></i>&nbsp; &nbsp;Synching to server. This may take a minute....','notice',true);

   // Do normal Ajax synch if we're in the web version
   if(window.location.hostname.search("photosynth.ca") > -1){
   
     
     $.ajax({
         url: 'http://photosynth.ca/timetracker/synch.php?action=synchToServer&key='+ttData.userKey,
         type: 'POST',
         contentType:'application/json',
         data: JSON.stringify(ttData),
         //dataType:'json',
         success : function(result){
            setFeedback('Data successfully sent to server');
            document.getElementById('json-output').innerHTML = result;
         },
         error: function(xhr, ajaxOptions, thrownError){
            setFeedback('Error synching to server: '+thrownError);
         },
         
         
    });
   
   }else if(typeof http === "object"){   
   
      nodeRequest('to');      
   
   }else{
      setFeedback('Current environment doesn\'t allow server synching!');
   }
}


function synchFromServer(){    
   
   setFeedback('<i class="fa fa-lightbulb-o fa-spinner fa-lg"></i> Synching from server. This may take a minute....');

  if(window.location.hostname.search("photosynth.ca") > -1){
  
     $.ajax({
         url: 'http://photosynth.ca/timetracker/synch.php?action=synchFromServer&key='+ttData.userKey,
         type: 'POST',
         contentType:'application/json',
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

         },
         error: function(xhr, ajaxOptions, thrownError){
            setFeedback('Error synching from server: '+thrownError);
         },
                 
      });
      
   }else if(typeof http === "object"){
      
      nodeRequest('from');      
   
   }else{
      setFeedback('Current environment doesn\'t allow server synching!');
   }
}

function ajaxRequest(){


}

function nodeRequest(direction){

  if(direction == 'to'){
    var postData = JSON.stringify(ttData); 
    reqAction = 'synchToServer';
    
    dbg(postData,"Node synching to server with:");
    
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
  
    console.log('STATUS:'+result.statusCode);
    console.log('HEADERS:'+JSON.stringify(result.headers));
    
    result.setEncoding('utf8');
    
    var resultData = '';
    
    result.on('data', function(chunk){
      console.log('BODY:'+chunk);
      resultData += chunk;
    });
    
    result.on('end', function(){
      console.log('No more data in response.');
      console.log(result);     
      console.log(resultData);
      
      if(result.statusCode == 200){
         
         try{            
           server_data = JSON.parse(resultData);   
         }catch(err){
           setFeedback('Error parsing data from server. Error:'+err,'error');
           throw 'JSON parsing exception';           
         }                  
                                    
         if(direction == 'from'){                            
             server_data.userKey = ttData.userKey; 
             ttData = server_data;  
             ttSave();      
                             
             setFeedback('Data successfully received from server.');
          
        }else if(direction == 'to'){            
             setFeedback('Server synch complete. '+server_data.updateCount+" records updated, "+server_data.insertCount+" new records added");
        }        
                   
      }else{
        setFeedback('Server synch failed! Status:'+result.statusCode,'error',true);
      }
      
      
    });
    
  });

  request.on('error', function(e){
    console.log('problem with request:'+e.message);
    setFeedback('Error synching to server: '+e.message);
  });

  
  request.write(postData);
  request.end();                                          
}


/* ######################### Analyze View Functions ######################### */

function setFilterStartTime(){
  showSessions();
}

function setFilterEndTime(){
  showSessions();
}


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


function showProjectTime(projectId){
   
  var prj = current_project;   
  
  gebi("analytics-view-title").innerHTML = "Project Time: "+current_project.name;

  $("#datatable").html(''); 
  
  addTableHeaders("datatable",["Task","Time"]);
      
  prj.totalTime = 0;  
  prj.totalBillableTime = 0;
  
  for (task_id in prj.tasks){
    taskTotalTime = 0;        
    taskSessionCount = 0;   
  
    task = prj.tasks[task_id]; 
    
    if(typeof task.sessions == "object"){
        
        if(getMemberCount(task.sessions) > 0){
        
          for (session_id in task.sessions){
            ses = task.sessions[session_id];
            if(ses.start_time && ses.end_time){
               duration = timeDiffSecsFromString(ses.start_time,ses.end_time);
               
               dbg('Getting time diff. Start:'+ses.start_time+" End: "+ses.end_time+" Diff: "+duration);
               
            }else{
              duration = 0;
            }            
            taskTotalTime += duration; 
            taskSessionCount += 1;      
          }
          
        
       
          if(task.billable == true){
             prj.totalBillableTime += taskTotalTime;
          }
          
          prj.totalTime = prj.totalTime+taskTotalTime;          
          
          addTableRow("datatable",[task.name+" ("+taskSessionCount+")",timeFromSeconds(taskTotalTime)]);
        }
     }
  }
                                                                                           
  addTableRow("datatable",["<b>Project billable time</b>","<b>"+timeFromSeconds(prj.totalBillableTime)+"</b>"]);
  addTableRow("datatable",["<b>Project total time</b>","<b>"+timeFromSeconds(prj.totalTime)+"</b>"]);
  
  $("#track-view").hide();
  $("#analytics-view").show();

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



function setView(view){

    if(typeof currentView.hide == "function"){
      currentView.hide();
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



function filterFlatData(fs){

   tempTableData = [];
   
   totalTime = 0;
   totalBillableTime = 0;
   
   for (var row in flatData){          
   
     if (fs.clientId != "all" && flatData[row].client_id != fs.clientId){ continue; } 
     if (fs.projectId != "all" && flatData[row].project_id != fs.projectId){ continue; }
     //if (fs.taskId != "all"  && flatData[row].task_id != fs.taskId){ continue; }     
     if (fs.startTime != "all" && flatData[row].start_time < fs.startTime){ continue; }      
     if (fs.endTime && flatData[row].end_time > fs.endTime){ continue; } 
                                                                                    

     tempTableData.push(flatData[row]);
     
     totalTime += flatData[row].duration;
     
     if(flatData[row].billable){
        totalBillableTime += flatData[row].duration;
     }
           
   }
              
   return [tempTableData,totalTime,totalBillableTime];
} 

    
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
              }     
            }          
          
           
            if(typeof tasks[task_id].sessions == "object" && getMemberCount(tasks[task_id].sessions) > 0){           
              for (var session_id in tasks[task_id].sessions){              
                session = tasks[task_id].sessions[session_id];
                             
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
// Get a particular item out of the data array, regardless of what's current
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
      ttData.cleints[id] = data;
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
      delete ttData.cleints[id];
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

function prettyTime(s){
    var hours = parseInt(s/3600) % 24;
    var minutes = parseInt(s/60) % 60;
    var seconds = parseInt(s) % 60;
    
    hrsTxt = " hour";  
    minsTxt = " minute";
    
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
      out = seconds.toString()+" seconds";
    }
    
    return out;
} 


/*  TASK LIST FUNCTIONS */

function filterTaskList(){
            
    taskList.tasks = [];
              
    var fs = [];
    
    if(taskList.clientFilter){
      fs.push(taskList.clientFilter);
    }
    if(taskList.projectFilter){
      fs.push(taskList.projectFilter);
    }
    
    dbg("Filtering task list",fs);
    
     
    loopData(fs,function(){ 
      if(this.task){ 
        
        if(!this.task.time){
          this.task.time = 0;
          for (var sesId in this.task.sessions){
          
            this.task.time += timeDiffSecsFromString(this.task.sessions[sesId].start_time,this.task.sessions[sesId].end_time);
          }
        }
        
        if(this.task.time > 0){
          this.task.prettyTime = prettyTime(this.task.time);
        }else{
          this.task.prettyTime = '';
        }
        
        this.task.displayStatus = editFields.task.status.options[this.task.status];
                            
        taskList.tasks.push(this.task);                  
      }                         
    });
    
                
   if(taskList.tasks.length < 1){
     document.getElementById("no-data-found-table").style.display = "table-row";
   }else{
     document.getElementById("no-data-found-table").style.display = "none";           
   }
   
   taskList.sort();
                                  
}

taskList.sort = function(field){
  sortTaskList(field);
};

taskList.filter = function(field){
  filterTaskList(field);
};


taskList.hideNewTaskForm = function(){
  gebi("task-form").style.display = "none";
}
       
function sortTaskList(field){

    dbg("Sorting task list by",field);

    if(field){
      taskList.sortBy = field;
    }

    taskList.tasks.sort(function(a, b) {
   
      if(!a[taskList.sortBy]){
        a[taskList.sortBy] = '';
      }                   
      if(!b[taskList.sortBy]){
        b[taskList.sortBy] = '';
      }
      
      //dbg("Sorting: "+JSON.stringify(a)+" against:"+JSON.stringify(b));
      
      return a[taskList.sortBy].toString().localeCompare(b[taskList.sortBy].toString());          
   });
   
   taskList.update();                     
}

taskList.update = function(){ 

   dbg("Updating DOM with "+taskList.tasks.length.toString()+" tasks");
                                                     
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
       
       var completedInput = "<input type=\"checkbox\" name=\"task-completed\" "+completedFlag+" onClick=\"setTaskComplete('"+task.id+"')\"/>";
       
       templateData.push({placeholder:"{{checkCompleted}}",value: completedInput});  
       
       
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

function clearTemplate(templateElId){
   var template = gebi(templateElId);
   var parent = template.parentNode;
   
   var oldItems = parent.getElementsByClassName(templateElId+"-clone");
   
   while(oldItems.length > 0){
       oldItems[0].parentNode.removeChild(oldItems[0]);
   }
}


var template = function selfTemplate (data,templateElId){

   if(data instanceof Array){
    
      clearTemplate(templateElId);
      
      for(i= 0; i < data.length; i++){
        selfTemplate(data[i],templateElId);
      }
   }else{

     dbg("template()",data);
    
     var template = gebi(templateElId);
     var parent = template.parentNode;
     var code = template.innerHTML;
  
     templateData = [];
     
     for(var name in data){
        templateData.push({placeholder: "{{"+name+"}}", value: data[name]})
     }
     
        
     var outputEl = template.cloneNode();
     
     outputEl.innerHTML = fillTemplate(templateData,code);
     
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

function fillTemplate(data,code){

  for(var pairKey in data){
    var re = new RegExp (data[pairKey].placeholder, 'g');
    code = code.replace(re,data[pairKey].value);
  }
  return code;
}

taskList.hideCompleted = function(){
   taskList.hideCompletedTasks = gebi("hide-completed").checked ? true : false;   
   taskList.update();
} 


/* ANALYZE VIEW */

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
          format: 'YYYY-MM-DD',
          onSelect: function() {
             analyze.filters.startTime = document.getElementById('filter-start-time').value;
             analyze.filter();
          }
      });
    }
    
    if(!analyze.endPicker){
      analyze.endPicker = new Pikaday({
          field: document.getElementById('filter-end-time'),
          format: 'YYYY-MM-DD',
          onSelect: function() {
             analyze.filters.endTime = document.getElementById('filter-end-time').value+" 23:23:59";
             analyze.filter();
          }
      });
    }
     
    analyze.filter();           
}

analyze.setClient = function(clientId){
    analyze.filters.clientId = current_client.id || "all";
    analyze.filter(); 
}

analyze.setProject = function(projectId){
    analyze.filters.projectId = current_project.id || "all";
    analyze.filter(); 
}     
      
analyze.filter = function (){
    
   fs = analyze.filters;

   tempTableData = [];
   
   totalTime = 0;
   totalBillableTime = 0;  
   
   var projectTotal = 0; 
   var lastProjectId = 0;
   var clientTotal = 0; 
   var lastClientId = 0;
   
   for (row in flatData){          
   
     if (fs.clientId != "all" && flatData[row].client_id != fs.clientId){ continue; } 
     if (fs.projectId != "all" && flatData[row].project_id != fs.projectId){ continue; }
     //if (fs.taskId != "all"  && flatData[row].task_id != fs.taskId){ continue; }     
     if (fs.startTime != "all" && flatData[row].start_time < fs.startTime){ continue; }      
     if (fs.endTime && flatData[row].end_time > fs.endTime){ continue; }
     
     clientTotal += flatData[row].duration;
      
     if(flatData[row].client_id != lastClientId){ 
       dbg("New client detected");
       clientTotalRow = {client: flatData[row].client,project:"",task:"",start_time:"",durationHMS:timeFromSeconds(clientTotal)};
       clientTotal = 0;
       lastClientId = flatData[row].client_id;                                              
       tempTableData.push(clientTotalRow);
     }
          
     projectTotal += flatData[row].duration;
      
     if(flatData[row].project_id != lastProjectId){
       dbg("New project detected");
       projectTotalRow = {client: flatData[row].client,project:flatData[row].project,task:"",start_time:"",durationHMS:timeFromSeconds(projectTotal)};
       projectTotal = 0;
       lastProjectId = flatData[row].project_id;                                               
       tempTableData.push(projectTotalRow);
     }
                                                                                    
     tempTableData.push(flatData[row]);
     
     totalTime += flatData[row].duration;
     
     if(flatData[row].billable){
        totalBillableTime += flatData[row].duration;
     }
           
   }
   
   dbg("Temp data in analyze.filter",tempTableData);
   
                                         
   analyze.totals.totalTimeHMS = timeFromSeconds(totalTime);                                            
   analyze.totals.totalBillableTimeHMS = timeFromSeconds(totalBillableTime);            
   analyze.tableData = tempTableData;
   
   clearTemplate("analyze-data-row-template");
   
   for(var i = 0; i < analyze.tableData.length; i++){          
      template(analyze.tableData[i],"analyze-data-row-template");       
   }
   
   clearTemplate("analyze-totals-template");
   template(analyze.totals,"analyze-totals-template");
   
   if(!tempTableData[0]){
     document.getElementById("no-data-found-table").style.display = "table-row";
   }else{
     document.getElementById("no-data-found-table").style.display = "none";           
   }        
          
}  

settingsView.show = function(){
  
 
  if(ttData.settings.length != defaultSettings.length){
      for (key in defaultSettings){
        if(!ttData.settings[key]){
           ttData.settings[key] = defaultSettings[key]
        }      
      }    
  }
  
  var templateData = [];
  
  for(field in editFields.settings){
     var templateRow = {
       label: editFields.settings[field].label,
       input: makeFormInput(editFields.settings[field].type,{
         value:ttData.settings[field],
         id: "settings-"+field+"input"
       }).outerHTML         
     };
     
     templateData.push(templateRow);
  
  }
  
  
  template(templateData,"settings-item-template");
  
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



makeFormInput = function selfMakeFormInput (type,attribs){

   var input;
   
  if(type == "boolean"){
    attribs.options = {"true":"Yes","false":"No"};
    type = "select";
  }  
    
  if(type == "text"){
    input = document.createElement("input");
    input.type = "text";
  }else if(type == "select"){
    input = document.createElement('select');
    for (var optkey in attribs.options){
      var option = new Option(attribs.options[optkey],optkey);
      input.options.add(option);               
    } 
  }else if(type == "textarea"){
    input = document.createElement("textarea");
    input.innerHTML = attribs.value || "";    
  }
  
  dbg("incoming attributes",attribs); 
  dbg("input element before setting attribs",input);
  
  inputAttributes = ["id","value","name","className","style"];
  
  for (i = 0; i < inputAttributes.length; i++){
  
     var item = inputAttributes[i];
    
     if(attribs[item]){
       input.setAttribute(item,attribs[item]);
     }
  }
       
  dbg("Input after setting attributes",input);
  return input;
}


function emitEvent(type,action){
  if(type == "task"){
    if(action == "deleted" || action == "edited" || action == "added" || action == "updated" ){
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
      if(typeof currentView.filter == "function"){
         currentView.filter();
      }
      if(typeof currentView.update == "function"){
         currentView.update();
      } 
    
    }
  }
}



 
                   